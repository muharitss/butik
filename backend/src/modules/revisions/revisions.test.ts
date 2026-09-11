import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { getAuditLogs, clearAuditLogs } from "../audit/index.js";

test("Revision Schema & API integration tests", async (t) => {
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
      await prisma.revision.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
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
        name: `Customer Revision ${Date.now()}_${Math.random()}`,
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
        name: `Garment Revision ${Date.now()}_${Math.random()}`
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

    const orderJson = (await orderRes.json()) as { data: { id: string } };
    const orderId = orderJson.data.id;
    createdOrderIds.push(orderId);

    // Transition to CONFIRMED -> IN_PROGRESS
    await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus: "CONFIRMED" })
    });

    await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus: "IN_PROGRESS" })
    });

    return { customer, garmentType, orderId };
  }

  await t.test("POST /api/orders/:orderId/revisions creates revision with OPEN status", async () => {
    const { orderId } = await createTestOrder();

    const res = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issue: "Waist is too tight",
        requestedChange: "Let out waist by 2cm",
        notes: "Customer feels discomfort sitting down"
      })
    });

    assert.equal(res.status, 201);
    const json = (await res.json()) as {
      data: {
        id: string;
        orderId: string;
        fittingId: string | null;
        issue: string;
        requestedChange: string | null;
        status: string;
        notes: string | null;
        resolvedAt: string | null;
      };
    };

    assert.equal(json.data.orderId, orderId);
    assert.equal(json.data.issue, "Waist is too tight");
    assert.equal(json.data.requestedChange, "Let out waist by 2cm");
    assert.equal(json.data.status, "OPEN");
    assert.equal(json.data.notes, "Customer feels discomfort sitting down");
    assert.equal(json.data.fittingId, null);
    assert.equal(json.data.resolvedAt, null);

    // Verify audit log
    const logs = getAuditLogs();
    const createLog = logs.find(
      (l) => l.entityType === "revision" && l.action === "revision.created" && l.entityId === json.data.id
    );
    assert.ok(createLog, "Audit log for revision.created should be recorded");
  });

  await t.test("POST /api/orders/:orderId/revisions with valid fittingId succeeds", async () => {
    const { orderId } = await createTestOrder();

    // Schedule fitting (which transitions order to FITTING)
    const fittingRes = await fetch(`${baseUrl}/api/orders/${orderId}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: new Date().toISOString(),
        notes: "First fitting"
      })
    });
    const fittingJson = (await fittingRes.json()) as { data: { id: string } };
    const fittingId = fittingJson.data.id;

    // Create revision linking this fitting
    const revRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fittingId,
        issue: "Sleeve length too long",
        requestedChange: "Shorten sleeve by 1.5cm"
      })
    });

    assert.equal(revRes.status, 201);
    const revJson = (await revRes.json()) as {
      data: { id: string; fittingId: string; status: string };
    };
    assert.equal(revJson.data.fittingId, fittingId);
    assert.equal(revJson.data.status, "OPEN");
  });

  await t.test("POST /api/orders/:orderId/revisions rejects fittingId from another order (409)", async () => {
    const order1 = await createTestOrder();
    const order2 = await createTestOrder();

    // Schedule fitting on order2
    const fittingRes = await fetch(`${baseUrl}/api/orders/${order2.orderId}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: new Date().toISOString()
      })
    });
    const fittingJson = (await fittingRes.json()) as { data: { id: string } };

    // Attempt to use order2's fitting on order1
    const revRes = await fetch(`${baseUrl}/api/orders/${order1.orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fittingId: fittingJson.data.id,
        issue: "Mismatched fitting test"
      })
    });

    assert.equal(revRes.status, 409);
    const errJson = (await revRes.json()) as { error: { code: string; message: string } };
    assert.equal(errJson.error.code, "BUSINESS_RULE_VIOLATION");
    assert.match(errJson.error.message, /Fitting does not belong to this order/);
  });

  await t.test("POST rejects invalid parameters and terminal orders", async () => {
    const { orderId } = await createTestOrder();

    // Non-existent order
    const fakeOrderId = "00000000-0000-0000-0000-000000000000";
    const res404 = await fetch(`${baseUrl}/api/orders/${fakeOrderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "Should fail" })
    });
    assert.equal(res404.status, 404);

    // Empty issue description (validation error)
    const resEmpty = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "   " })
    });
    assert.equal(resEmpty.status, 400);

    // Cancelled order cannot receive revisions
    await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus: "CANCELLED", reason: "Customer withdrew" })
    });

    const resCancelled = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "Attempt after cancellation" })
    });
    assert.equal(resCancelled.status, 409);
  });

  await t.test("GET /api/orders/:orderId/revisions and GET /:id return correct data", async () => {
    const { orderId } = await createTestOrder();

    await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "Issue 1" })
    });

    const rev2Res = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "Issue 2" })
    });
    const rev2Json = (await rev2Res.json()) as { data: { id: string } };

    // List revisions
    const listRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`);
    assert.equal(listRes.status, 200);
    const listJson = (await listRes.json()) as { data: Array<{ issue: string }> };
    assert.equal(listJson.data.length, 2);
    assert.equal(listJson.data[0].issue, "Issue 1");
    assert.equal(listJson.data[1].issue, "Issue 2");

    // Single get
    const singleRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions/${rev2Json.data.id}`);
    assert.equal(singleRes.status, 200);
    const singleJson = (await singleRes.json()) as { data: { id: string; issue: string } };
    assert.equal(singleJson.data.id, rev2Json.data.id);
    assert.equal(singleJson.data.issue, "Issue 2");
  });

  await t.test("PATCH transitions: OPEN -> IN_PROGRESS -> RESOLVED", async () => {
    const { orderId } = await createTestOrder();

    const createRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "Collar readjustment" })
    });
    const createJson = (await createRes.json()) as { data: { id: string } };
    const revId = createJson.data.id;

    // Transition to IN_PROGRESS
    const inProgressRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions/${revId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" })
    });
    assert.equal(inProgressRes.status, 200);
    const inProgressJson = (await inProgressRes.json()) as {
      data: { status: string };
      meta: { remainingOpenRevisions: number; allRevisionsResolved: boolean };
    };
    assert.equal(inProgressJson.data.status, "IN_PROGRESS");
    assert.equal(inProgressJson.meta.remainingOpenRevisions, 1);
    assert.equal(inProgressJson.meta.allRevisionsResolved, false);

    // Transition to RESOLVED
    const resolvedRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions/${revId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED", notes: "Collar altered and pressed" })
    });
    assert.equal(resolvedRes.status, 200);
    const resolvedJson = (await resolvedRes.json()) as {
      data: { status: string; resolvedAt: string | null; notes: string | null };
      meta: { remainingOpenRevisions: number; allRevisionsResolved: boolean };
    };
    assert.equal(resolvedJson.data.status, "RESOLVED");
    assert.ok(resolvedJson.data.resolvedAt, "resolvedAt must be set on RESOLVED");
    assert.equal(resolvedJson.data.notes, "Collar altered and pressed");
    assert.equal(resolvedJson.meta.remainingOpenRevisions, 0);
    assert.equal(resolvedJson.meta.allRevisionsResolved, true);

    // Check audit log
    const logs = getAuditLogs();
    const resolveLog = logs.find(
      (l) => l.entityType === "revision" && l.action === "revision.resolved" && l.entityId === revId
    );
    assert.ok(resolveLog, "Audit log for revision.resolved should be recorded");
  });

  await t.test("PATCH transitions: direct OPEN -> RESOLVED and OPEN -> CANCELLED", async () => {
    const { orderId } = await createTestOrder();

    // 1. Direct OPEN -> RESOLVED
    const rev1Res = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "Quick fix on hem" })
    });
    const rev1Id = ((await rev1Res.json()) as { data: { id: string } }).data.id;

    const resolveDirectRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions/${rev1Id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" })
    });
    assert.equal(resolveDirectRes.status, 200);
    const resolveDirectJson = (await resolveDirectRes.json()) as {
      data: { status: string; resolvedAt: string | null };
    };
    assert.equal(resolveDirectJson.data.status, "RESOLVED");
    assert.ok(resolveDirectJson.data.resolvedAt);

    // 2. OPEN -> CANCELLED
    const rev2Res = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "Unnecessary alteration requested" })
    });
    const rev2Id = ((await rev2Res.json()) as { data: { id: string } }).data.id;

    const cancelRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions/${rev2Id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED", notes: "Customer decided against it" })
    });
    assert.equal(cancelRes.status, 200);
    const cancelJson = (await cancelRes.json()) as {
      data: { status: string; resolvedAt: string | null; notes: string | null };
    };
    assert.equal(cancelJson.data.status, "CANCELLED");
    assert.equal(cancelJson.data.notes, "Customer decided against it");
    assert.equal(cancelJson.data.resolvedAt, null);
  });

  await t.test("PATCH rejects illegal transitions and modifications on terminal states (409)", async () => {
    const { orderId } = await createTestOrder();

    const createRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "Terminal state test" })
    });
    const revId = ((await createRes.json()) as { data: { id: string } }).data.id;

    // Resolve revision
    await fetch(`${baseUrl}/api/orders/${orderId}/revisions/${revId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" })
    });

    // Attempt RESOLVED -> OPEN
    const reopenRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions/${revId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN" })
    });
    assert.equal(reopenRes.status, 409);

    // Attempt modifying notes on terminal revision
    const modifyRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions/${revId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "New note" })
    });
    assert.equal(modifyRes.status, 409);
  });

  await t.test("Fitting guard: Scheduling fitting from REVISION order is blocked until all revisions resolved", async () => {
    const { orderId } = await createTestOrder();

    // Schedule initial fitting (order goes to FITTING)
    const fitRes = await fetch(`${baseUrl}/api/orders/${orderId}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date().toISOString() })
    });
    const fitJson = (await fitRes.json()) as { data: { id: string } };

    // Record fitting result NEEDS_REVISION (order goes to REVISION)
    await fetch(`${baseUrl}/api/orders/${orderId}/fittings/${fitJson.data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DONE",
        result: "NEEDS_REVISION",
        occurredAt: new Date().toISOString(),
        notes: "Waist needs widening"
      })
    });

    // Create an OPEN revision for this order
    const revRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fittingId: fitJson.data.id,
        issue: "Waist widening"
      })
    });
    const revJson = (await revRes.json()) as { data: { id: string } };

    // Attempt to schedule a new fitting while revision is still OPEN -> MUST BE REJECTED (409)
    const scheduleBlockedRes = await fetch(`${baseUrl}/api/orders/${orderId}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date().toISOString() })
    });
    assert.equal(scheduleBlockedRes.status, 409);
    const blockedErr = (await scheduleBlockedRes.json()) as { error: { message: string } };
    assert.match(blockedErr.error.message, /unresolved revisions/);

    // Resolve the revision
    await fetch(`${baseUrl}/api/orders/${orderId}/revisions/${revJson.data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" })
    });

    // Now scheduling a new fitting MUST SUCCEED and transition order to FITTING!
    const scheduleAllowedRes = await fetch(`${baseUrl}/api/orders/${orderId}/fittings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date().toISOString(), notes: "Second fitting after revision" })
    });
    assert.equal(scheduleAllowedRes.status, 201);

    // Check that order transitioned back to FITTING
    const orderDetailRes = await fetch(`${baseUrl}/api/orders/${orderId}`);
    const orderDetailJson = (await orderDetailRes.json()) as { data: { status: string; fittings: unknown[] } };
    assert.equal(orderDetailJson.data.status, "FITTING");
    assert.equal(orderDetailJson.data.fittings.length, 2);
  });

  await t.test("Order detail GET /api/orders/:id returns populated revisions array", async () => {
    const { orderId } = await createTestOrder();

    await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "Revision A" })
    });

    await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: "Revision B" })
    });

    const res = await fetch(`${baseUrl}/api/orders/${orderId}`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as {
      data: {
        id: string;
        revisions: Array<{ id: string; issue: string; status: string }>;
      };
    };

    assert.ok(Array.isArray(json.data.revisions));
    assert.equal(json.data.revisions.length, 2);
    assert.equal(json.data.revisions[0].issue, "Revision A");
    assert.equal(json.data.revisions[1].issue, "Revision B");
  });
});
