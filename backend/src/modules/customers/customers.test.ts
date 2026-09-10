import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { getAuditLogs, clearAuditLogs } from "../audit/index.js";

test("Customer API integration tests", async (t) => {
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
  const createdOrderIds: string[] = [];

  t.beforeEach(() => {
    clearAuditLogs();
  });

  t.after(async () => {
    server.close();
    if (createdOrderIds.length > 0) {
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.orderMeasurementSnapshotValue.deleteMany({
        where: {
          orderMeasurementSnapshot: {
            orderId: { in: createdOrderIds }
          }
        }
      });
      await prisma.orderMeasurementSnapshot.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } }
      });
    }
    if (createdCustomerIds.length > 0) {
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } }
      });
    }
  });

  let testCustomerId = "";

  await t.test("POST /api/customers creates customer with required and optional fields", async () => {
    const payload = {
      name: "__test_customer_siti__",
      phone: "0812-3456-7890",
      email: "siti@example.com",
      address: "Jl. Sudirman No. 10",
      notes: "VIP customer"
    };

    const res = await fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.ok(json.data?.id);
    assert.equal(json.data.name, payload.name);
    assert.equal(json.data.phone, payload.phone);
    assert.equal(json.data.email, payload.email);
    assert.equal(json.data.address, payload.address);
    assert.equal(json.data.notes, payload.notes);
    assert.equal(json.meta, undefined);

    testCustomerId = json.data.id;
    createdCustomerIds.push(testCustomerId);

    const logs = getAuditLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].entityType, "customer");
    assert.equal(logs[0].entityId, testCustomerId);
    assert.equal(logs[0].action, "create");
    assert.equal(logs[0].before, null);
    assert.equal((logs[0].after as { id: string })?.id, testCustomerId);
  });

  await t.test("POST /api/customers validation error on missing name returns 400", async () => {
    const res = await fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "081234567890" })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error?.code, "VALIDATION_ERROR");
    assert.ok(Array.isArray(json.error?.details));
    assert.equal(json.error?.details?.[0]?.field, "name");
  });

  await t.test("POST /api/customers warns on soft duplicate normalized phone without blocking", async () => {
    // Siti was created with "0812-3456-7890" which normalizes to "6281234567890".
    // Creating another customer with "+62 812 3456 7890" should warn with meta.possibleDuplicate.
    const duplicatePayload = {
      name: "__test_customer_budi__",
      phone: "+62 812 3456 7890"
    };

    const res = await fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicatePayload)
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.ok(json.data?.id);
    createdCustomerIds.push(json.data.id);

    assert.ok(json.meta?.possibleDuplicate);
    assert.equal(json.meta.possibleDuplicate.id, testCustomerId);
    assert.equal(json.meta.possibleDuplicate.name, "__test_customer_siti__");
  });

  await t.test("GET /api/customers returns paginated customer list", async () => {
    const res = await fetch(`${baseUrl}/api/customers?page=1&pageSize=10`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(Array.isArray(json.data));
    assert.ok(json.meta);
    assert.equal(json.meta.page, 1);
    assert.equal(json.meta.pageSize, 10);
    assert.ok(typeof json.meta.total === "number");
    assert.ok(json.meta.total >= 2);
  });

  await t.test("GET /api/customers?q= searches by name substring", async () => {
    const res = await fetch(`${baseUrl}/api/customers?q=siti`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.data.length >= 1);
    assert.ok(json.data.some((c: { name: string }) => c.name.includes("siti")));
  });

  await t.test("GET /api/customers?q= searches by phone substring", async () => {
    const res = await fetch(`${baseUrl}/api/customers?q=3456`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.data.length >= 1);
    assert.ok(json.data.some((c: { id: string }) => c.id === testCustomerId));
  });

  await t.test("GET /api/customers/:id returns customer details with orders placeholder", async () => {
    const res = await fetch(`${baseUrl}/api/customers/${testCustomerId}`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.data?.id, testCustomerId);
    assert.equal(json.data?.name, "__test_customer_siti__");
    assert.deepEqual(json.data?.orders, []);
  });

  await t.test("GET /api/customers/:id returns 404 for non-existent customer", async () => {
    const randomUuid = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/customers/${randomUuid}`);
    assert.equal(res.status, 404);

    const json = await res.json();
    assert.equal(json.error?.code, "NOT_FOUND");
  });

  await t.test("PATCH /api/customers/:id updates fields and creates audit record", async () => {
    const updatePayload = {
      notes: "Updated VIP notes",
      address: "Jl. Baru No. 99"
    };

    const res = await fetch(`${baseUrl}/api/customers/${testCustomerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload)
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data?.notes, updatePayload.notes);
    assert.equal(json.data?.address, updatePayload.address);

    const logs = getAuditLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].entityType, "customer");
    assert.equal(logs[0].entityId, testCustomerId);
    assert.equal(logs[0].action, "update");
    assert.equal((logs[0].before as { notes: string })?.notes, "VIP customer");
    assert.equal((logs[0].after as { notes: string })?.notes, "Updated VIP notes");
  });

  await t.test("DELETE /api/customers/:id soft deletes customer and creates audit record", async () => {
    const res = await fetch(`${baseUrl}/api/customers/${testCustomerId}`, {
      method: "DELETE"
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data?.id, testCustomerId);
    assert.equal(json.data?.deleted, true);

    const logs = getAuditLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].entityType, "customer");
    assert.equal(logs[0].entityId, testCustomerId);
    assert.equal(logs[0].action, "delete");
    assert.equal((logs[0].before as { id: string })?.id, testCustomerId);
    assert.ok((logs[0].after as { deletedAt: Date })?.deletedAt);

    // Confirm soft-deleted customer is excluded from GET /:id
    const detailRes = await fetch(`${baseUrl}/api/customers/${testCustomerId}`);
    assert.equal(detailRes.status, 404);

    // Confirm soft-deleted customer is excluded from list
    const listRes = await fetch(`${baseUrl}/api/customers?q=siti`);
    const listJson = await listRes.json();
    assert.ok(!listJson.data.some((c: { id: string }) => c.id === testCustomerId));
  });

  await t.test("DELETE /api/customers/:id blocked (409 CONFLICT) when customer has active order, allowed once cancelled", async () => {
    // 1. Create a customer
    const custRes = await fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "__test_cust_with_order__", phone: "081299990001" })
    });
    const custJson = await custRes.json();
    const custId = custJson.data.id;
    createdCustomerIds.push(custId);

    // 2. Create an active (DRAFT) order for this customer
    const orderNumber = `JF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: custId,
        status: "DRAFT",
        deadlineAt: new Date(Date.now() + 86400000),
        subtotal: 100000,
        total: 100000
      }
    });
    createdOrderIds.push(order.id);

    // 3. Confirm GET /api/customers/:id populates the active order
    const detailRes = await fetch(`${baseUrl}/api/customers/${custId}`);
    assert.equal(detailRes.status, 200);
    const detailJson = await detailRes.json();
    assert.equal(detailJson.data.orders.length, 1);
    assert.equal(detailJson.data.orders[0].id, order.id);

    // 4. Attempt to delete customer with active order -> 409 CONFLICT
    const deleteRes = await fetch(`${baseUrl}/api/customers/${custId}`, {
      method: "DELETE"
    });
    assert.equal(deleteRes.status, 409);
    const deleteJson = await deleteRes.json();
    assert.equal(deleteJson.error?.code, "CONFLICT");

    // 5. Cancel the order
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelledAt: new Date() }
    });

    // 6. Delete should now succeed
    const deleteSuccessRes = await fetch(`${baseUrl}/api/customers/${custId}`, {
      method: "DELETE"
    });
    assert.equal(deleteSuccessRes.status, 200);
    const deleteSuccessJson = await deleteSuccessRes.json();
    assert.equal(deleteSuccessJson.data?.deleted, true);
  });
});

