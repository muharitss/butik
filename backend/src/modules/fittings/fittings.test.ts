import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { getAuditLogs, clearAuditLogs } from "../audit/index.js";

test("Fitting Schema & API integration tests", async (t) => {
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

  async function createTestOrder(totalAmount = 500000) {
    const customer = await prisma.customer.create({
      data: {
        name: `Customer Fitting ${Date.now()}_${Math.random()}`,
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
        value: 92,
        unit: "cm"
      }
    });

    const garmentType = await prisma.garmentType.create({
      data: {
        name: `Garment Fitting ${Date.now()}_${Math.random()}`
      }
    });
    createdGarmentTypeIds.push(garmentType.id);

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

  async function advanceOrderToInProgress(orderId: string) {
    // DRAFT -> CONFIRMED
    const confirmRes = await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus: "CONFIRMED" })
    });
    assert.equal(confirmRes.status, 200);

    // CONFIRMED -> IN_PROGRESS
    const inProgressRes = await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus: "IN_PROGRESS" })
    });
    assert.equal(inProgressRes.status, 200);
  }

  await t.test("First fitting on IN_PROGRESS order moves order to FITTING and computes fitting_number 1", async () => {
    const order = await createTestOrder();
    await advanceOrderToInProgress(order.id);

    const scheduledDate = new Date(Date.now() + 86400000).toISOString();
    const fitRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: scheduledDate,
        notes: "First trial fitting"
      })
    });

    assert.equal(fitRes.status, 201);
    const fitData = (await fitRes.json()).data;
    assert.equal(fitData.orderId, order.id);
    assert.equal(fitData.fittingNumber, 1);
    assert.equal(fitData.status, "SCHEDULED");
    assert.equal(fitData.notes, "First trial fitting");

    // Order status should have transitioned to FITTING
    const orderCheck = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(orderCheck?.status, "FITTING");

    // Status history check
    const history = await prisma.orderStatusHistory.findFirst({
      where: { orderId: order.id, toStatus: "FITTING" },
      orderBy: { changedAt: "desc" }
    });
    assert.ok(history);
    assert.equal(history.fromStatus, "IN_PROGRESS");
    assert.equal(history.toStatus, "FITTING");

    // Audit logs check
    const logs = getAuditLogs();
    const fitAudit = logs.find((l) => l.entityType === "fitting" && l.entityId === fitData.id);
    assert.ok(fitAudit);
    assert.equal(fitAudit.action, "fitting.created");

    const orderAudit = logs.find(
      (l) => l.entityType === "order" && l.entityId === order.id && l.action === "status_change"
    );
    assert.ok(orderAudit);
  });

  await t.test("Subsequent fitting on FITTING order increments fitting_number to 2 and keeps order status FITTING", async () => {
    const order = await createTestOrder();
    await advanceOrderToInProgress(order.id);

    // First fitting
    const fit1Res = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Fitting 1" })
    });
    assert.equal(fit1Res.status, 201);
    const fit1 = (await fit1Res.json()).data;
    assert.equal(fit1.fittingNumber, 1);

    // Second fitting
    const fit2Res = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Fitting 2" })
    });
    assert.equal(fit2Res.status, 201);
    const fit2 = (await fit2Res.json()).data;
    assert.equal(fit2.fittingNumber, 2);

    // Order remains FITTING
    const orderCheck = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(orderCheck?.status, "FITTING");
  });

  await t.test("Rejects fitting scheduling on DRAFT, CONFIRMED, or CANCELLED order with 409", async () => {
    const order = await createTestOrder();

    // DRAFT
    const draftRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Draft fitting" })
    });
    assert.equal(draftRes.status, 409);
    const draftErr = await draftRes.json();
    assert.equal(draftErr.error.code, "BUSINESS_RULE_VIOLATION");

    // CONFIRMED
    await fetch(`${baseUrl}/api/orders/${order.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus: "CONFIRMED" })
    });

    const confirmedRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Confirmed fitting" })
    });
    assert.equal(confirmedRes.status, 409);

    // CANCELLED
    await fetch(`${baseUrl}/api/orders/${order.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus: "CANCELLED", reason: "Customer cancelled" })
    });

    const cancelledRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Cancelled fitting" })
    });
    assert.equal(cancelledRes.status, 409);
  });

  await t.test("Recording result NEEDS_REVISION transitions order to REVISION", async () => {
    const order = await createTestOrder();
    await advanceOrderToInProgress(order.id);

    const fitRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Initial fitting" })
    });
    const fit = (await fitRes.json()).data;

    // PATCH fitting result
    const patchRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${fit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DONE",
        result: "NEEDS_REVISION",
        occurredAt: new Date().toISOString(),
        notes: "Waist too tight, loosen by 2cm",
        nextAction: "Adjust waist seam"
      })
    });

    assert.equal(patchRes.status, 200);
    const updatedFit = (await patchRes.json()).data;
    assert.equal(updatedFit.status, "DONE");
    assert.equal(updatedFit.result, "NEEDS_REVISION");
    assert.equal(updatedFit.nextAction, "Adjust waist seam");

    // Order status should be REVISION
    const orderCheck = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(orderCheck?.status, "REVISION");

    const history = await prisma.orderStatusHistory.findFirst({
      where: { orderId: order.id, toStatus: "REVISION" },
      orderBy: { changedAt: "desc" }
    });
    assert.ok(history);
    assert.equal(history.fromStatus, "FITTING");

    // Audit logs check
    const logs = getAuditLogs();
    const fitAudit = logs.find((l) => l.entityType === "fitting" && l.action === "fitting.result_recorded");
    assert.ok(fitAudit);
  });

  await t.test("Scheduling fitting from REVISION order loops back to FITTING", async () => {
    const order = await createTestOrder();
    await advanceOrderToInProgress(order.id);

    const fit1Res = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Fitting 1" })
    });
    const fit1 = (await fit1Res.json()).data;

    // Move to REVISION
    await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${fit1.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DONE",
        result: "NEEDS_REVISION",
        occurredAt: new Date().toISOString()
      })
    });

    const orderCheck1 = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(orderCheck1?.status, "REVISION");

    // Schedule Fitting 2 after alteration complete
    const fit2Res = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Re-fitting after alteration" })
    });
    assert.equal(fit2Res.status, 201);
    const fit2 = (await fit2Res.json()).data;
    assert.equal(fit2.fittingNumber, 2);

    // Order status should loop back to FITTING
    const orderCheck2 = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(orderCheck2?.status, "FITTING");
  });

  await t.test("Recording result APPROVED transitions order to READY", async () => {
    const order = await createTestOrder();
    await advanceOrderToInProgress(order.id);

    const fitRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Fitting for approval" })
    });
    const fit = (await fitRes.json()).data;

    // Mark APPROVED
    const patchRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${fit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DONE",
        result: "APPROVED",
        occurredAt: new Date().toISOString(),
        notes: "Fits perfectly",
        nextAction: "Ready for pickup"
      })
    });

    assert.equal(patchRes.status, 200);
    const updatedFit = (await patchRes.json()).data;
    assert.equal(updatedFit.status, "DONE");
    assert.equal(updatedFit.result, "APPROVED");

    // Order status should be READY
    const orderCheck = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(orderCheck?.status, "READY");

    const history = await prisma.orderStatusHistory.findFirst({
      where: { orderId: order.id, toStatus: "READY" },
      orderBy: { changedAt: "desc" }
    });
    assert.ok(history);
    assert.equal(history.fromStatus, "FITTING");
  });

  await t.test("Validates required fields on DONE status (result & occurredAt)", async () => {
    const order = await createTestOrder();
    await advanceOrderToInProgress(order.id);

    const fitRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Test validation" })
    });
    const fit = (await fitRes.json()).data;

    // Missing result
    const noResultRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${fit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DONE",
        occurredAt: new Date().toISOString()
      })
    });
    assert.equal(noResultRes.status, 400);

    // Missing occurredAt
    const noOccurredRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${fit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DONE",
        result: "APPROVED"
      })
    });
    assert.equal(noOccurredRes.status, 400);

    // Invalid result value
    const invalidResultRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${fit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DONE",
        result: "INVALID_RESULT",
        occurredAt: new Date().toISOString()
      })
    });
    assert.equal(invalidResultRes.status, 400);
  });

  await t.test("Terminal state enforcement: cannot modify DONE or CANCELLED fitting", async () => {
    const order = await createTestOrder();
    await advanceOrderToInProgress(order.id);

    const fitRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Fitting to complete" })
    });
    const fit = (await fitRes.json()).data;

    // Mark DONE
    await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${fit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DONE",
        result: "APPROVED",
        occurredAt: new Date().toISOString()
      })
    });

    // Attempting to modify DONE fitting fails with 409
    const modifyDoneRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${fit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: "Trying to edit after done"
      })
    });
    assert.equal(modifyDoneRes.status, 409);

    // Create another fitting to test CANCELLED
    const fit2Res = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Fitting to cancel" })
    });
    // Note: order is currently in READY, so posting a fitting would be rejected unless order is in FITTING or REVISION.
    // Let's verify that creating fitting on READY order is indeed rejected:
    assert.equal(fit2Res.status, 409);
  });

  await t.test("Cancelling a fitting marks it CANCELLED and does not change order status", async () => {
    const order = await createTestOrder();
    await advanceOrderToInProgress(order.id);

    const fitRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Fitting to cancel" })
    });
    const fit = (await fitRes.json()).data;

    const cancelRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${fit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "CANCELLED",
        notes: "Customer was a no-show"
      })
    });

    assert.equal(cancelRes.status, 200);
    const cancelledFit = (await cancelRes.json()).data;
    assert.equal(cancelledFit.status, "CANCELLED");
    assert.equal(cancelledFit.notes, "Customer was a no-show");

    // Order status is still FITTING
    const orderCheck = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(orderCheck?.status, "FITTING");

    // Attempting to modify CANCELLED fitting fails with 409
    const modifyCancelledRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${fit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Edit cancelled" })
    });
    assert.equal(modifyCancelledRes.status, 409);

    // Audit log check
    const logs = getAuditLogs();
    const cancelAudit = logs.find((l) => l.entityType === "fitting" && l.action === "fitting.cancelled");
    assert.ok(cancelAudit);
  });

  await t.test("GET /api/orders/:orderId/fittings and single GET /:id return correct data", async () => {
    const order = await createTestOrder();
    await advanceOrderToInProgress(order.id);

    await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "First session" })
    });
    await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Second session" })
    });

    // List fittings
    const listRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings`);
    assert.equal(listRes.status, 200);
    const listData = (await listRes.json()).data;
    assert.equal(listData.length, 2);
    assert.equal(listData[0].fittingNumber, 1);
    assert.equal(listData[1].fittingNumber, 2);

    // Get single fitting
    const singleRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings/${listData[0].id}`);
    assert.equal(singleRes.status, 200);
    const singleData = (await singleRes.json()).data;
    assert.equal(singleData.id, listData[0].id);
    assert.equal(singleData.notes, "First session");

    // 404 for non-existent order
    const fakeOrderRes = await fetch(`${baseUrl}/api/orders/00000000-0000-0000-0000-000000000000/fittings`);
    assert.equal(fakeOrderRes.status, 404);

    // 404 for non-existent fitting
    const fakeFitRes = await fetch(`${baseUrl}/api/orders/${order.id}/fittings/00000000-0000-0000-0000-000000000000`);
    assert.equal(fakeFitRes.status, 404);
  });

  await t.test("Order detail GET /api/orders/:id returns populated fittings array", async () => {
    const order = await createTestOrder();
    await advanceOrderToInProgress(order.id);

    await fetch(`${baseUrl}/api/orders/${order.id}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Detail check fitting" })
    });

    const orderDetailRes = await fetch(`${baseUrl}/api/orders/${order.id}`);
    assert.equal(orderDetailRes.status, 200);
    const orderDetail = (await orderDetailRes.json()).data;

    assert.ok(Array.isArray(orderDetail.fittings));
    assert.equal(orderDetail.fittings.length, 1);
    assert.equal(orderDetail.fittings[0].fittingNumber, 1);
    assert.equal(orderDetail.fittings[0].notes, "Detail check fitting");
  });
});
