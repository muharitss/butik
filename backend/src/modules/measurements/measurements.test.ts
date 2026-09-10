import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { getAuditLogs, clearAuditLogs } from "../audit/index.js";
import { getCurrentMeasurementVersion } from "./index.js";

test("Measurement API integration tests", async (t) => {
  let server: Server;
  let baseUrl = "";

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === "object") {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });

  const createdCustomerIds: string[] = [];

  t.beforeEach(() => {
    clearAuditLogs();
  });

  t.after(async () => {
    server.close();
    if (createdCustomerIds.length > 0) {
      // MeasurementValue rows are cascaded automatically on MeasurementVersion deletion
      await prisma.measurementVersion.deleteMany({
        where: { customerId: { in: createdCustomerIds } }
      });
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } }
      });
    }
  });

  // Helper to create a test customer
  async function createTestCustomer(name = "__test_customer_measurements__") {
    const customer = await prisma.customer.create({
      data: {
        name,
        phone: "081299990001"
      }
    });
    createdCustomerIds.push(customer.id);
    return customer;
  }

  await t.test("Validates customerId param format (UUID)", async () => {
    const res = await fetch(`${baseUrl}/api/customers/not-a-uuid/measurements`);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("Returns 404 for non-existent customer on list, current, and create", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";

    const listRes = await fetch(`${baseUrl}/api/customers/${fakeId}/measurements`);
    assert.equal(listRes.status, 404);

    const currentRes = await fetch(`${baseUrl}/api/customers/${fakeId}/measurements/current`);
    assert.equal(currentRes.status, 404);

    const createRes = await fetch(`${baseUrl}/api/customers/${fakeId}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measuredAt: new Date().toISOString(),
        values: [{ fieldKey: "chest", value: 95, unit: "cm" }]
      })
    });
    assert.equal(createRes.status, 404);
  });

  await t.test("GET /current returns 404 when customer has zero measurement versions", async () => {
    const customer = await createTestCustomer("__test_zero_measurements__");

    const res = await fetch(`${baseUrl}/api/customers/${customer.id}/measurements/current`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error.code, "NOT_FOUND");
  });

  await t.test("GET / returns empty array when customer has zero measurement versions", async () => {
    const customer = await createTestCustomer("__test_empty_measurements__");

    const res = await fetch(`${baseUrl}/api/customers/${customer.id}/measurements`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json.data, []);
  });

  await t.test("Rejects unknown fieldKey outside shared vocabulary", async () => {
    const customer = await createTestCustomer();

    const res = await fetch(`${baseUrl}/api/customers/${customer.id}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measuredAt: new Date().toISOString(),
        values: [{ fieldKey: "unknown_random_dimension", value: 50, unit: "cm" }]
      })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("Rejects duplicate fieldKeys in values payload", async () => {
    const customer = await createTestCustomer();

    const res = await fetch(`${baseUrl}/api/customers/${customer.id}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measuredAt: new Date().toISOString(),
        values: [
          { fieldKey: "chest", value: 95, unit: "cm" },
          { fieldKey: "chest", value: 96, unit: "cm" }
        ]
      })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("Rejects non-positive measurement values", async () => {
    const customer = await createTestCustomer();

    const res = await fetch(`${baseUrl}/api/customers/${customer.id}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measuredAt: new Date().toISOString(),
        values: [{ fieldKey: "waist", value: -10, unit: "cm" }]
      })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("Creates sequential measurement versions and retrieves current & history", async () => {
    const customer1 = await createTestCustomer("__test_sequential_customer_1__");
    const customer2 = await createTestCustomer("__test_sequential_customer_2__");

    // 1. Create version 1 for Customer 1 (with Indonesian and English vocabulary keys)
    const v1Res = await fetch(`${baseUrl}/api/customers/${customer1.id}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measuredAt: "2026-09-01T09:00:00.000Z",
        label: "Initial fitting",
        notes: "First measurement before Eid",
        values: [
          { fieldKey: "lingkar_dada", value: 92.5, unit: "cm" },
          { fieldKey: "waist", value: 78, unit: "cm" },
          { fieldKey: "panjang_baju", value: 72, unit: "cm" }
        ]
      })
    });

    assert.equal(v1Res.status, 201);
    const v1Json = await v1Res.json();
    assert.equal(v1Json.data.versionNumber, 1);
    assert.equal(v1Json.data.label, "Initial fitting");
    assert.equal(v1Json.data.values.length, 3);

    // Verify audit log for version 1
    const logs = getAuditLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].entityType, "measurement_version");
    assert.equal(logs[0].action, "create");
    assert.equal(logs[0].entityId, v1Json.data.id);

    // 2. Create version 2 for Customer 1
    const v2Res = await fetch(`${baseUrl}/api/customers/${customer1.id}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measuredAt: "2026-09-10T14:30:00.000Z",
        label: "Updated fitting",
        notes: "Correction after weight loss",
        values: [
          { fieldKey: "lingkar_dada", value: 90, unit: "cm" },
          { fieldKey: "waist", value: 75.5, unit: "cm" }
        ]
      })
    });

    assert.equal(v2Res.status, 201);
    const v2Json = await v2Res.json();
    assert.equal(v2Json.data.versionNumber, 2);
    assert.equal(v2Json.data.label, "Updated fitting");

    // 3. Create version 1 for Customer 2 (isolated per-customer versioning)
    const c2Res = await fetch(`${baseUrl}/api/customers/${customer2.id}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        measuredAt: "2026-09-10T15:00:00.000Z",
        values: [{ fieldKey: "chest", value: 102, unit: "cm" }]
      })
    });

    assert.equal(c2Res.status, 201);
    const c2Json = await c2Res.json();
    assert.equal(c2Json.data.versionNumber, 1, "Customer 2 should start at version 1");

    // 4. GET /current for Customer 1 should return version 2
    const currentRes = await fetch(`${baseUrl}/api/customers/${customer1.id}/measurements/current`);
    assert.equal(currentRes.status, 200);
    const currentJson = await currentRes.json();
    assert.equal(currentJson.data.versionNumber, 2);
    assert.equal(currentJson.data.values.length, 2);
    assert.equal(currentJson.data.id, v2Json.data.id);

    // 5. GET / for Customer 1 should return all versions newest first ([v2, v1])
    const listRes = await fetch(`${baseUrl}/api/customers/${customer1.id}/measurements`);
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.equal(listJson.data.length, 2);
    assert.equal(listJson.data[0].versionNumber, 2);
    assert.equal(listJson.data[1].versionNumber, 1);

    // 6. Direct invocation of exported getCurrentMeasurementVersion
    const directCurrent = await getCurrentMeasurementVersion(customer1.id);
    assert.ok(directCurrent);
    assert.equal(directCurrent.versionNumber, 2);
    assert.equal(directCurrent.values.length, 2);

    const directCurrentNone = await getCurrentMeasurementVersion(
      "11111111-1111-1111-1111-111111111111"
    );
    assert.equal(directCurrentNone, null);
  });

  await t.test("Ensures no edit or delete endpoints exist (strict immutability)", async () => {
    const customer = await createTestCustomer();

    // Try PUT /
    const putRes = await fetch(`${baseUrl}/api/customers/${customer.id}/measurements`, {
      method: "PUT"
    });
    assert.ok(putRes.status === 404 || putRes.status === 405);

    // Try PATCH /
    const patchRes = await fetch(`${baseUrl}/api/customers/${customer.id}/measurements`, {
      method: "PATCH"
    });
    assert.ok(patchRes.status === 404 || patchRes.status === 405);

    // Try DELETE /
    const deleteRes = await fetch(`${baseUrl}/api/customers/${customer.id}/measurements`, {
      method: "DELETE"
    });
    assert.ok(deleteRes.status === 404 || deleteRes.status === 405);
  });
});
