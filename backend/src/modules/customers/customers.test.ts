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
      await prisma.payment.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
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
      await prisma.measurementVersion.deleteMany({
        where: { customerId: { in: createdCustomerIds } }
      });
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } }
      });
    }
  });

  const phoneSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  const basePhone = `0812${phoneSuffix}`;
  const duplicatePhone = `+62 812 ${phoneSuffix.slice(0, 3)} ${phoneSuffix.slice(3)}`;
  const searchPhonePart = phoneSuffix.slice(2, 6);

  let testCustomerId = "";

  await t.test("POST /api/customers creates customer with required and optional fields", async () => {
    const payload = {
      name: `__test_customer_siti_${phoneSuffix}__`,
      phone: basePhone,
      email: `siti_${phoneSuffix}@example.com`,
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
    const createLog = logs.find(
      (l) => l.entityType === "customer" && l.entityId === testCustomerId && l.action === "create"
    );
    assert.ok(createLog);
    assert.equal(createLog.before, null);
    assert.equal((createLog.after as { id: string })?.id, testCustomerId);
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
    const duplicatePayload = {
      name: `__test_customer_budi_${phoneSuffix}__`,
      phone: duplicatePhone
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
    assert.equal(json.meta.possibleDuplicate.name, `__test_customer_siti_${phoneSuffix}__`);
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
    const res = await fetch(`${baseUrl}/api/customers?q=siti_${phoneSuffix}`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.data.length >= 1);
    assert.ok(json.data.some((c: { name: string }) => c.name.includes(`siti_${phoneSuffix}`)));
  });

  await t.test("GET /api/customers?q= searches by phone substring", async () => {
    const res = await fetch(`${baseUrl}/api/customers?q=${searchPhonePart}`);
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
    assert.equal(json.data?.name, `__test_customer_siti_${phoneSuffix}__`);
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
    const updateLog = logs.find(
      (l) => l.entityType === "customer" && l.entityId === testCustomerId && l.action === "update"
    );
    assert.ok(updateLog);
    assert.equal((updateLog.before as { notes: string })?.notes, "VIP customer");
    assert.equal((updateLog.after as { notes: string })?.notes, "Updated VIP notes");
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
    const deleteLog = logs.find(
      (l) => l.entityType === "customer" && l.entityId === testCustomerId && l.action === "delete"
    );
    assert.ok(deleteLog);
    assert.equal((deleteLog.before as { id: string })?.id, testCustomerId);
    assert.ok((deleteLog.after as { deletedAt: Date })?.deletedAt);

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

  await t.test("GET /api/customers/:id returns correct CRM aggregates for zero-order customer", async () => {
    const custRes = await fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "__test_cust_zero_orders__", phone: "081299990002" })
    });
    const custJson = await custRes.json();
    const custId = custJson.data.id;
    createdCustomerIds.push(custId);

    const res = await fetch(`${baseUrl}/api/customers/${custId}`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.id, custId);
    assert.equal(json.data.orderCount, 0);
    assert.equal(json.data.totalSpending, "0.00");
    assert.equal(json.data.outstandingBalance, "0.00");
    assert.equal(json.data.lastOrderAt, null);
    assert.equal(json.data.measurementVersionCount, 0);
  });

  await t.test("GET /api/customers/:id and GET /:id/payments calculate multi-order, multi-payment aggregates and history", async () => {
    // 1. Create a customer
    const custRes = await fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "__test_crm_customer__", phone: "081299990003" })
    });
    const custJson = await custRes.json();
    const custId = custJson.data.id;
    createdCustomerIds.push(custId);

    // 2. Add 2 measurement versions
    await prisma.measurementVersion.createMany({
      data: [
        { customerId: custId, versionNumber: 1, measuredAt: new Date() },
        { customerId: custId, versionNumber: 2, measuredAt: new Date() }
      ]
    });

    // 3. Create 3 orders:
    // - Order 1 (COMPLETED): total 500,000, paid 500,000, paymentStatusCache = 'PAID'
    // - Order 2 (IN_PROGRESS): total 300,000, paid 100,000, paymentStatusCache = 'PARTIAL' (balance = 200,000)
    // - Order 3 (CANCELLED): total 150,000, paid 0, paymentStatusCache = 'UNPAID'
    const order1 = await prisma.order.create({
      data: {
        orderNumber: `JF-${new Date().getFullYear()}-8001`,
        customerId: custId,
        status: "COMPLETED",
        deadlineAt: new Date(Date.now() + 86400000),
        subtotal: 500000,
        total: 500000,
        paidTotalCache: 500000,
        paymentStatusCache: "PAID",
        createdAt: new Date(Date.now() - 100000)
      }
    });
    createdOrderIds.push(order1.id);

    const order2 = await prisma.order.create({
      data: {
        orderNumber: `JF-${new Date().getFullYear()}-8002`,
        customerId: custId,
        status: "IN_PROGRESS",
        deadlineAt: new Date(Date.now() + 86400000 * 2),
        subtotal: 300000,
        total: 300000,
        paidTotalCache: 100000,
        paymentStatusCache: "PARTIAL",
        createdAt: new Date(Date.now() - 50000)
      }
    });
    createdOrderIds.push(order2.id);

    const order3 = await prisma.order.create({
      data: {
        orderNumber: `JF-${new Date().getFullYear()}-8003`,
        customerId: custId,
        status: "CANCELLED",
        cancelledAt: new Date(),
        deadlineAt: new Date(Date.now() + 86400000 * 3),
        subtotal: 150000,
        total: 150000,
        paidTotalCache: 0,
        paymentStatusCache: "UNPAID",
        createdAt: new Date(Date.now())
      }
    });
    createdOrderIds.push(order3.id);

    // 4. Create payments for order1 and order2
    const pay1 = await prisma.payment.create({
      data: {
        orderId: order1.id,
        type: "DP",
        amount: 250000,
        method: "Bank Transfer",
        note: "50% DP",
        recordedAt: new Date(Date.now() - 90000)
      }
    });
    const pay2 = await prisma.payment.create({
      data: {
        orderId: order1.id,
        type: "FINAL",
        amount: 250000,
        method: "Cash",
        note: "Settlement",
        recordedAt: new Date(Date.now() - 80000)
      }
    });
    const pay3 = await prisma.payment.create({
      data: {
        orderId: order2.id,
        type: "DP",
        amount: 100000,
        method: "QRIS",
        note: "DP order 2",
        recordedAt: new Date(Date.now() - 40000)
      }
    });

    // 5. Test GET /api/customers/:id aggregates
    const detailRes = await fetch(`${baseUrl}/api/customers/${custId}`);
    assert.equal(detailRes.status, 200);
    const detailJson = await detailRes.json();

    // orderCount includes all orders (3)
    assert.equal(detailJson.data.orderCount, 3);
    // totalSpending excludes cancelled order (500,000 + 300,000 = 800,000)
    assert.equal(detailJson.data.totalSpending, "800000.00");
    // outstandingBalance is non-cancelled unpaid balance (300,000 - 100,000 = 200,000)
    assert.equal(detailJson.data.outstandingBalance, "200000.00");
    // measurementVersionCount is 2
    assert.equal(detailJson.data.measurementVersionCount, 2);
    // lastOrderAt is createdAt of order3 (most recent)
    assert.ok(detailJson.data.lastOrderAt);
    assert.equal(new Date(detailJson.data.lastOrderAt).getTime(), order3.createdAt.getTime());

    // 6. Test GET /api/customers/:id/payments
    const paymentsRes = await fetch(`${baseUrl}/api/customers/${custId}/payments?page=1&pageSize=10`);
    assert.equal(paymentsRes.status, 200);
    const paymentsJson = await paymentsRes.json();

    assert.equal(paymentsJson.data.length, 3);
    assert.equal(paymentsJson.meta.total, 3);
    assert.equal(paymentsJson.meta.page, 1);
    assert.equal(paymentsJson.meta.pageSize, 10);

    // Payments should be ordered by recordedAt DESC: pay3 (newest), pay2, pay1
    assert.equal(paymentsJson.data[0].id, pay3.id);
    assert.equal(paymentsJson.data[0].orderId, order2.id);
    assert.equal(paymentsJson.data[0].orderNumber, order2.orderNumber);
    assert.equal(paymentsJson.data[0].type, "DP");
    assert.equal(paymentsJson.data[0].amount, "100000");
    assert.equal(paymentsJson.data[0].method, "QRIS");

    assert.equal(paymentsJson.data[1].id, pay2.id);
    assert.equal(paymentsJson.data[1].orderNumber, order1.orderNumber);

    assert.equal(paymentsJson.data[2].id, pay1.id);
    assert.equal(paymentsJson.data[2].orderNumber, order1.orderNumber);

    // Test 404 on payments endpoint for non-existent customer
    const nonExistentRes = await fetch(`${baseUrl}/api/customers/00000000-0000-0000-0000-000000000000/payments`);
    assert.equal(nonExistentRes.status, 404);
  });
});

