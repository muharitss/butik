import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { getAuditLogs, clearAuditLogs } from "../audit/index.js";
import { getOrderBalance } from "./payments.service.js";

test("Payment Schema & API integration tests", async (t) => {
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
  const createdGarmentTypeIds: string[] = [];
  const createdOrderIds: string[] = [];

  t.beforeEach(() => {
    clearAuditLogs();
  });

  t.after(async () => {
    server.close();

    // Clean up created payments, orders, and associated data
    if (createdOrderIds.length > 0) {
      await prisma.fitting.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
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
      await prisma.measurementValue.deleteMany({
        where: {
          measurementVersion: {
            customerId: { in: createdCustomerIds }
          }
        }
      });
      await prisma.measurementVersion.deleteMany({
        where: { customerId: { in: createdCustomerIds } }
      });
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } }
      });
    }

    if (createdGarmentTypeIds.length > 0) {
      await prisma.garmentMeasurementField.deleteMany({
        where: { garmentTypeId: { in: createdGarmentTypeIds } }
      });
      await prisma.garmentType.deleteMany({
        where: { id: { in: createdGarmentTypeIds } }
      });
    }
  });

  // Helper to create test setup (customer + measurement version + garment type + order)
  async function createTestOrder(totalAmount = 1000000) {
    const customer = await prisma.customer.create({
      data: {
        name: `Test Customer ${Date.now()}_${Math.random()}`,
        phone: `0812${Math.floor(10000000 + Math.random() * 90000000)}`
      }
    });
    createdCustomerIds.push(customer.id);

    const mv = await prisma.measurementVersion.create({
      data: {
        customerId: customer.id,
        versionNumber: 1,
        measuredAt: new Date()
      }
    });

    await prisma.measurementValue.create({
      data: {
        measurementVersionId: mv.id,
        fieldKey: "chest",
        value: 95.5,
        unit: "cm"
      }
    });

    const garmentType = await prisma.garmentType.create({
      data: {
        name: `Garment ${Date.now()}_${Math.random()}`
      }
    });
    createdGarmentTypeIds.push(garmentType.id);

    // Create order with specified total
    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        items: [
          {
            garmentTypeId: garmentType.id,
            quantity: 1,
            unitPrice: totalAmount
          }
        ]
      })
    });

    assert.equal(orderRes.status, 201);
    const orderData = (await orderRes.json()).data;
    createdOrderIds.push(orderData.id);

    return orderData;
  }

  await t.test("Progression: DP -> PARTIAL -> FINAL payments reaching exactly PAID", async () => {
    const order = await createTestOrder(1000000);

    assert.equal(Number(order.paidTotalCache), 0);
    assert.equal(order.paymentStatusCache, "UNPAID");

    // 1. Record DP: 300,000
    const dpRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DP",
        amount: 300000,
        method: "cash",
        note: "Down payment paid in store"
      })
    });

    assert.equal(dpRes.status, 201);
    const dpJson = await dpRes.json();
    assert.equal(dpJson.data.type, "DP");
    assert.equal(Number(dpJson.data.amount), 300000);
    assert.equal(dpJson.data.method, "cash");
    assert.equal(dpJson.data.note, "Down payment paid in store");

    // Verify order cache updated
    const orderAfterDp = await prisma.order.findUniqueOrThrow({
      where: { id: order.id }
    });
    assert.equal(Number(orderAfterDp.paidTotalCache), 300000);
    assert.equal(orderAfterDp.paymentStatusCache, "PARTIAL");

    // 2. Record PARTIAL: 200,000
    const partialRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "PARTIAL",
        amount: 200000,
        method: "transfer"
      })
    });

    assert.equal(partialRes.status, 201);
    const orderAfterPartial = await prisma.order.findUniqueOrThrow({
      where: { id: order.id }
    });
    assert.equal(Number(orderAfterPartial.paidTotalCache), 500000);
    assert.equal(orderAfterPartial.paymentStatusCache, "PARTIAL");

    // 3. Record FINAL: 500,000
    const finalRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "FINAL",
        amount: 500000,
        method: "transfer",
        note: "Settlement on pickup"
      })
    });

    assert.equal(finalRes.status, 201);
    const orderAfterFinal = await prisma.order.findUniqueOrThrow({
      where: { id: order.id }
    });
    assert.equal(Number(orderAfterFinal.paidTotalCache), 1000000);
    assert.equal(orderAfterFinal.paymentStatusCache, "PAID");
  });

  await t.test("Rejects overpayment attempt with 409 BUSINESS_RULE_VIOLATION", async () => {
    const order = await createTestOrder(500000);

    // Initial DP of 300,000 (remaining: 200,000)
    await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DP",
        amount: 300000
      })
    });

    // Attempt to pay 250,000 when remaining is 200,000
    const overpayRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "FINAL",
        amount: 250000
      })
    });

    assert.equal(overpayRes.status, 409);
    const errJson = await overpayRes.json();
    assert.equal(errJson.error.code, "BUSINESS_RULE_VIOLATION");
    assert.match(errJson.error.message, /exceeds remaining order balance/i);

    // Verify order cache was not modified by failed attempt
    const orderCheck = await prisma.order.findUniqueOrThrow({
      where: { id: order.id }
    });
    assert.equal(Number(orderCheck.paidTotalCache), 300000);
    assert.equal(orderCheck.paymentStatusCache, "PARTIAL");
  });

  await t.test("ADJUSTMENT with negative amount (refund) and note reduces paid_total_cache and updates status", async () => {
    const order = await createTestOrder(500000);

    // Pay full 500,000
    const p1Res = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "FINAL",
        amount: 500000
      })
    });
    assert.equal(p1Res.status, 201);
    const p1 = (await p1Res.json()).data;

    let check = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(Number(check.paidTotalCache), 500000);
    assert.equal(check.paymentStatusCache, "PAID");

    // Record negative ADJUSTMENT with note and reversedPaymentId
    const adjRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ADJUSTMENT",
        amount: -150000,
        note: "Partial refund due to fabric downgrade agreed with client",
        reversedPaymentId: p1.id
      })
    });

    assert.equal(adjRes.status, 201);
    const adjData = (await adjRes.json()).data;
    assert.equal(Number(adjData.amount), -150000);
    assert.equal(adjData.reversedPaymentId, p1.id);

    // Verify cache updated: 500,000 - 150,000 = 350,000; status changes from PAID to PARTIAL
    check = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(Number(check.paidTotalCache), 350000);
    assert.equal(check.paymentStatusCache, "PARTIAL");
  });

  await t.test("ADJUSTMENT validation: missing note or zero amount rejected", async () => {
    const order = await createTestOrder(500000);

    // 1. Missing note on ADJUSTMENT
    const missingNoteRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ADJUSTMENT",
        amount: -50000
      })
    });
    assert.equal(missingNoteRes.status, 400);
    const json1 = await missingNoteRes.json();
    assert.equal(json1.error.code, "VALIDATION_ERROR");

    // 2. Empty string note on ADJUSTMENT
    const emptyNoteRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ADJUSTMENT",
        amount: -50000,
        note: "   "
      })
    });
    assert.equal(emptyNoteRes.status, 400);

    // 3. Zero amount on ADJUSTMENT
    const zeroRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ADJUSTMENT",
        amount: 0,
        note: "Zero adjustment"
      })
    });
    assert.equal(zeroRes.status, 400);
  });

  await t.test("Non-ADJUSTMENT with negative or zero amount rejected with 400", async () => {
    const order = await createTestOrder(500000);

    // Negative amount on DP
    const negRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DP",
        amount: -100000
      })
    });
    assert.equal(negRes.status, 400);
    const jsonNeg = await negRes.json();
    assert.equal(jsonNeg.error.code, "VALIDATION_ERROR");

    // Zero amount on PARTIAL
    const zeroRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "PARTIAL",
        amount: 0
      })
    });
    assert.equal(zeroRes.status, 400);
  });

  await t.test("reversedPaymentId validation: non-existent or wrong order payment rejected", async () => {
    const order1 = await createTestOrder(500000);
    const order2 = await createTestOrder(500000);

    // Record payment on order2
    const pOrder2Res = await fetch(`${baseUrl}/api/orders/${order2.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DP",
        amount: 200000
      })
    });
    assert.equal(pOrder2Res.status, 201);
    const pOrder2 = (await pOrder2Res.json()).data;

    // Try to reverse payment from order2 against order1
    const crossOrderRes = await fetch(`${baseUrl}/api/orders/${order1.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ADJUSTMENT",
        amount: -50000,
        note: "Cross order attempt",
        reversedPaymentId: pOrder2.id
      })
    });
    assert.equal(crossOrderRes.status, 409);
    const crossJson = await crossOrderRes.json();
    assert.equal(crossJson.error.code, "BUSINESS_RULE_VIOLATION");
    assert.match(crossJson.error.message, /does not belong to this order/i);

    // Try to reference random non-existent UUID
    const nonExistentRes = await fetch(`${baseUrl}/api/orders/${order1.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ADJUSTMENT",
        amount: -50000,
        note: "Non-existent reversal",
        reversedPaymentId: "a0000000-0000-4000-8000-000000000000"
      })
    });
    assert.equal(nonExistentRes.status, 404);
    const nonExistentJson = await nonExistentRes.json();
    assert.equal(nonExistentJson.error.code, "NOT_FOUND");
  });

  await t.test("GET /api/orders/:orderId/payments lists payments newest first", async () => {
    const order = await createTestOrder(600000);

    await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DP", amount: 100000, note: "First payment" })
    });

    await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "PARTIAL", amount: 200000, note: "Second payment" })
    });

    await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "FINAL", amount: 300000, note: "Third payment" })
    });

    const listRes = await fetch(`${baseUrl}/api/orders/${order.id}/payments`);
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    const payments = listJson.data;

    assert.equal(payments.length, 3);
    assert.equal(payments[0].note, "Third payment");
    assert.equal(payments[1].note, "Second payment");
    assert.equal(payments[2].note, "First payment");
  });

  await t.test("Payments on non-existent order return 404 NOT_FOUND", async () => {
    const missingId = "b0000000-0000-4000-8000-000000000000";

    const getRes = await fetch(`${baseUrl}/api/orders/${missingId}/payments`);
    assert.equal(getRes.status, 404);

    const postRes = await fetch(`${baseUrl}/api/orders/${missingId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DP", amount: 100000 })
    });
    assert.equal(postRes.status, 404);
  });

  await t.test("Audit logs record payment creation", async () => {
    const order = await createTestOrder(300000);

    await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DP",
        amount: 150000,
        method: "transfer",
        note: "Audit test payment"
      })
    });

    const logs = getAuditLogs();
    const paymentLog = logs.find(
      (l) => l.entityType === "payment" && l.action === "payment.recorded"
    );
    assert.ok(paymentLog, "Audit log entry for payment.recorded should exist");
    assert.equal((paymentLog?.after as { type?: string })?.type, "DP");
  });

  await t.test("getOrderBalance helper returns accurate authoritative calculation", async () => {
    const order = await createTestOrder(500000);

    // Initial balance
    let balance = await getOrderBalance(order.id);
    assert.equal(Number(balance.orderTotal), 500000);
    assert.equal(Number(balance.paidTotal), 0);
    assert.equal(Number(balance.remainingBalance), 500000);
    assert.equal(balance.paymentStatus, "UNPAID");

    // After DP
    await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DP", amount: 200000 })
    });

    balance = await getOrderBalance(order.id);
    assert.equal(Number(balance.paidTotal), 200000);
    assert.equal(Number(balance.remainingBalance), 300000);
    assert.equal(balance.paymentStatus, "PARTIAL");

    // After full payment
    await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "FINAL", amount: 300000 })
    });

    balance = await getOrderBalance(order.id);
    assert.equal(Number(balance.paidTotal), 500000);
    assert.equal(Number(balance.remainingBalance), 0);
    assert.equal(balance.paymentStatus, "PAID");
  });

  await t.test("GET /api/orders/:id detail includes payments list and correct summary", async () => {
    const order = await createTestOrder(400000);

    await fetch(`${baseUrl}/api/orders/${order.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DP", amount: 150000, note: "Deposit" })
    });

    const detailRes = await fetch(`${baseUrl}/api/orders/${order.id}`);
    assert.equal(detailRes.status, 200);
    const detail = (await detailRes.json()).data;

    assert.equal(detail.payments.length, 1);
    assert.equal(detail.payments[0].note, "Deposit");
    assert.equal(Number(detail.paymentsSummary.paidTotal), 150000);
    assert.equal(Number(detail.paymentsSummary.remainingBalance), 250000);
    assert.equal(detail.paymentsSummary.paymentStatus, "PARTIAL");
  });
});
