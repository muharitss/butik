import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { getAuditLogs, clearAuditLogs } from "../audit/index.js";

test("Garment Type API integration tests", async (t) => {
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

  const createdGarmentTypeIds: string[] = [];

  t.beforeEach(() => {
    clearAuditLogs();
  });

  t.after(async () => {
    server.close();
    if (createdGarmentTypeIds.length > 0) {
      await prisma.garmentType.deleteMany({
        where: { id: { in: createdGarmentTypeIds } }
      });
    }
  });

  let testGarmentTypeId = "";

  await t.test("POST /api/garment-types creates garment type with nested measurement fields", async () => {
    const payload = {
      name: "__test_kebaya_modern__",
      description: "Model kebaya modern dengan payet",
      measurementFields: [
        {
          fieldKey: "chest",
          label: "Lingkar Dada",
          unit: "cm",
          isRequired: true,
          sortOrder: 1
        },
        {
          fieldKey: "waist",
          label: "Lingkar Pinggang",
          unit: "cm",
          isRequired: true,
          sortOrder: 2
        },
        {
          fieldKey: "sleeve_length",
          label: "Panjang Lengan",
          unit: "cm",
          isRequired: false,
          sortOrder: 3
        }
      ]
    };

    const res = await fetch(`${baseUrl}/api/garment-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.ok(json.data?.id);
    assert.equal(json.data.name, payload.name);
    assert.equal(json.data.description, payload.description);
    assert.equal(json.data.isActive, true);
    assert.equal(json.data.measurementFields.length, 3);
    assert.equal(json.data.measurementFields[0].fieldKey, "chest");
    assert.equal(json.data.measurementFields[0].label, "Lingkar Dada");
    assert.equal(json.data.measurementFields[0].isRequired, true);
    assert.equal(json.data.measurementFields[2].fieldKey, "sleeve_length");
    assert.equal(json.data.measurementFields[2].isRequired, false);

    testGarmentTypeId = json.data.id;
    createdGarmentTypeIds.push(testGarmentTypeId);

    const logs = getAuditLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].entityType, "garment_type");
    assert.equal(logs[0].entityId, testGarmentTypeId);
    assert.equal(logs[0].action, "create");
    assert.equal(logs[0].before, null);
    assert.equal((logs[0].after as { id: string })?.id, testGarmentTypeId);
  });

  await t.test("POST /api/garment-types fails validation on empty name", async () => {
    const res = await fetch(`${baseUrl}/api/garment-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error?.code, "VALIDATION_ERROR");
    assert.ok(Array.isArray(json.error?.details));
    assert.equal(json.error?.details?.[0]?.field, "name");
  });

  await t.test("POST /api/garment-types fails validation on duplicate fieldKey", async () => {
    const res = await fetch(`${baseUrl}/api/garment-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "__test_duplicate_keys__",
        measurementFields: [
          { fieldKey: "chest", label: "Lingkar Dada", unit: "cm" },
          { fieldKey: "chest", label: "Dada Cadangan", unit: "cm" }
        ]
      })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error?.code, "VALIDATION_ERROR");
  });

  await t.test("POST /api/garment-types duplicate name returns 409 CONFLICT", async () => {
    const res = await fetch(`${baseUrl}/api/garment-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "__test_kebaya_modern__"
      })
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error?.code, "CONFLICT");
  });

  await t.test("GET /api/garment-types returns active items including measurement fields", async () => {
    const res = await fetch(`${baseUrl}/api/garment-types`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data));
    const found = json.data.find((item: { id: string }) => item.id === testGarmentTypeId);
    assert.ok(found);
    assert.equal(found.name, "__test_kebaya_modern__");
    assert.equal(found.measurementFields.length, 3);
  });

  await t.test("GET /api/garment-types/:id returns single garment type", async () => {
    const res = await fetch(`${baseUrl}/api/garment-types/${testGarmentTypeId}`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data?.id, testGarmentTypeId);
    assert.equal(json.data?.name, "__test_kebaya_modern__");
  });

  await t.test("GET /api/garment-types/:id returns 404 for nonexistent id", async () => {
    const res = await fetch(`${baseUrl}/api/garment-types/00000000-0000-0000-0000-000000000000`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error?.code, "NOT_FOUND");
  });

  await t.test("PATCH /api/garment-types/:id replaces measurement fields array", async () => {
    const payload = {
      name: "__test_kebaya_modern_updated__",
      measurementFields: [
        {
          fieldKey: "bust",
          label: "Lingkar Dada Atas",
          unit: "cm",
          isRequired: true,
          sortOrder: 1
        },
        {
          fieldKey: "hip",
          label: "Lingkar Pinggul",
          unit: "cm",
          isRequired: true,
          sortOrder: 2
        }
      ]
    };

    const res = await fetch(`${baseUrl}/api/garment-types/${testGarmentTypeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.name, payload.name);
    assert.equal(json.data.measurementFields.length, 2);
    assert.equal(json.data.measurementFields[0].fieldKey, "bust");
    assert.equal(json.data.measurementFields[1].fieldKey, "hip");

    const logs = getAuditLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].entityType, "garment_type");
    assert.equal(logs[0].entityId, testGarmentTypeId);
    assert.equal(logs[0].action, "update");
  });

  await t.test("PATCH /api/garment-types/:id/deactivate sets isActive=false and logs audit", async () => {
    const res = await fetch(`${baseUrl}/api/garment-types/${testGarmentTypeId}/deactivate`, {
      method: "PATCH"
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.isActive, false);

    const logs = getAuditLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].entityType, "garment_type");
    assert.equal(logs[0].entityId, testGarmentTypeId);
    assert.equal(logs[0].action, "deactivate");

    // Check excluded from default GET /api/garment-types
    const activeRes = await fetch(`${baseUrl}/api/garment-types`);
    const activeJson = await activeRes.json();
    const stillActive = activeJson.data.some((item: { id: string }) => item.id === testGarmentTypeId);
    assert.equal(stillActive, false);

    // Check included in GET /api/garment-types?includeInactive=true
    const allRes = await fetch(`${baseUrl}/api/garment-types?includeInactive=true`);
    const allJson = await allRes.json();
    const foundInactive = allJson.data.find((item: { id: string }) => item.id === testGarmentTypeId);
    assert.ok(foundInactive);
    assert.equal(foundInactive.isActive, false);
  });
});
