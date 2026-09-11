import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { recordAudit, getAuditLogs, clearAuditLogs } from "./index.js";

test("Audit Log Infrastructure & Retrofit integration tests", async (t) => {
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
  const recordedAuditLogIds: string[] = [];

  // Seed or retrieve existing test operator user
  let operatorUser = await prisma.user.findFirst();
  if (!operatorUser) {
    operatorUser = await prisma.user.create({
      data: {
        name: "Test Operator",
        role: "owner",
        isActive: true
      }
    });
  }

  t.beforeEach(() => {
    clearAuditLogs();
  });

  t.after(async () => {
    server.close();

    // Clean up created audit logs
    if (recordedAuditLogIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { id: { in: recordedAuditLogIds } }
      });
    }

    // Clean up order hierarchy
    if (createdOrderIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { entityType: "order", entityId: { in: createdOrderIds } },
            { entityType: "fitting" },
            { entityType: "revision" },
            { entityType: "payment" },
            { entityType: "order_attachment" }
          ]
        }
      });
      await prisma.orderAttachment.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
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

    // Clean up garment types
    if (createdGarmentTypeIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { entityType: "garment_type", entityId: { in: createdGarmentTypeIds } }
      });
      await prisma.garmentMeasurementField.deleteMany({
        where: { garmentTypeId: { in: createdGarmentTypeIds } }
      });
      await prisma.garmentType.deleteMany({
        where: { id: { in: createdGarmentTypeIds } }
      });
    }

    // Clean up customers
    if (createdCustomerIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { entityType: "customer", entityId: { in: createdCustomerIds } },
            { entityType: "measurement_version" }
          ]
        }
      });
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
  });

  await t.test("recordAudit persists directly to database audit_logs table", async () => {
    const dummyId = crypto.randomUUID();
    await recordAudit({
      actorId: operatorUser.id,
      entityType: "order",
      entityId: dummyId,
      action: "test_action",
      before: { status: "DRAFT" },
      after: { status: "CONFIRMED" }
    });

    // In-memory check
    const inMem = getAuditLogs().find((l) => l.entityId === dummyId);
    assert.ok(inMem, "In-memory entry should be present");
    assert.equal(inMem.action, "test_action");

    // Database check
    const dbRow = await prisma.auditLog.findFirst({
      where: { entityId: dummyId, action: "test_action" }
    });
    assert.ok(dbRow, "Database row must exist in audit_logs");
    assert.equal(dbRow.actorId, operatorUser.id);
    assert.equal(dbRow.entityType, "order");
    assert.deepEqual(dbRow.before, { status: "DRAFT" });
    assert.deepEqual(dbRow.after, { status: "CONFIRMED" });
    recordedAuditLogIds.push(dbRow.id);
  });

  await t.test("Transaction rollback rolls back audit log write atomically", async () => {
    const dummyId = crypto.randomUUID();

    await assert.rejects(
      async () => {
        await prisma.$transaction(async (tx) => {
          await recordAudit(
            {
              actorId: operatorUser.id,
              entityType: "order",
              entityId: dummyId,
              action: "should_be_rolled_back",
              before: null,
              after: { test: true }
            },
            tx
          );
          throw new Error("Simulated transactional failure");
        });
      },
      /Simulated transactional failure/
    );

    const dbRow = await prisma.auditLog.findFirst({
      where: { entityId: dummyId, action: "should_be_rolled_back" }
    });
    assert.equal(dbRow, null, "Audit row must be rolled back on transaction failure");
  });

  await t.test("GET /api/audit-logs returns paginated list with meta and actor details", async () => {
    const dummyId1 = crypto.randomUUID();
    const dummyId2 = crypto.randomUUID();

    await recordAudit({
      actorId: operatorUser.id,
      entityType: "test_entity",
      entityId: dummyId1,
      action: "test_1",
      after: { key: 1 }
    });
    await recordAudit({
      actorId: null,
      entityType: "test_entity",
      entityId: dummyId2,
      action: "test_2",
      after: { key: 2 }
    });

    const res = await fetch(`${baseUrl}/api/audit-logs?entityType=test_entity`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as {
      data: Array<{
        id: string;
        entityType: string;
        entityId: string;
        action: string;
        actor: { id: string; name: string; role: string } | null;
      }>;
      meta: { page: number; pageSize: number; total: number };
    };

    assert.ok(Array.isArray(json.data));
    assert.equal(json.meta.page, 1);
    assert.equal(json.meta.pageSize, 20);
    assert.ok(json.meta.total >= 2);

    const found1 = json.data.find((l) => l.entityId === dummyId1);
    const found2 = json.data.find((l) => l.entityId === dummyId2);
    assert.ok(found1, "Entry 1 found");
    assert.ok(found2, "Entry 2 found");
    assert.equal(found1.actor?.id, operatorUser.id);
    assert.equal(found1.actor?.name, operatorUser.name);
    assert.equal(found2.actor, null);

    // Track for cleanup
    recordedAuditLogIds.push(found1.id, found2.id);
  });

  await t.test("GET /api/audit-logs filters by entityId", async () => {
    const dummyId = crypto.randomUUID();
    await recordAudit({
      actorId: null,
      entityType: "filter_target",
      entityId: dummyId,
      action: "targeted_action"
    });

    const res = await fetch(`${baseUrl}/api/audit-logs?entityId=${dummyId}`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as {
      data: Array<{ entityId: string; action: string }>;
      meta: { total: number };
    };

    assert.equal(json.meta.total, 1);
    assert.equal(json.data[0].entityId, dummyId);
    assert.equal(json.data[0].action, "targeted_action");
  });

  await t.test("GET /api/audit-logs filters by date range (from / to)", async () => {
    const dummyId = crypto.randomUUID();
    await recordAudit({
      actorId: null,
      entityType: "date_target",
      entityId: dummyId,
      action: "dated_action"
    });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const resInRange = await fetch(
      `${baseUrl}/api/audit-logs?entityId=${dummyId}&from=${yesterday}&to=${tomorrow}`
    );
    assert.equal(resInRange.status, 200);
    const jsonInRange = (await resInRange.json()) as { meta: { total: number } };
    assert.equal(jsonInRange.meta.total, 1);

    const pastDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const olderDate = new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString();
    const resOutOfRange = await fetch(
      `${baseUrl}/api/audit-logs?entityId=${dummyId}&from=${olderDate}&to=${pastDate}`
    );
    assert.equal(resOutOfRange.status, 200);
    const jsonOutOfRange = (await resOutOfRange.json()) as { meta: { total: number } };
    assert.equal(jsonOutOfRange.meta.total, 0);
  });

  await t.test("GET /api/audit-logs rejects invalid UUID format with 400 VALIDATION_ERROR", async () => {
    const res = await fetch(`${baseUrl}/api/audit-logs?entityId=not-a-uuid`);
    assert.equal(res.status, 400);
    const json = (await res.json()) as { error: { code: string; message: string } };
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("Retrofit verification: all business actions produce DB audit entries", async () => {
    // 1. Customer create, update, delete
    const custRes = await fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        name: "Retrofit Customer",
        phone: "081199887766"
      })
    });
    assert.equal(custRes.status, 201);
    const custData = (await custRes.json()).data;
    createdCustomerIds.push(custData.id);

    // Verify customer.create in DB
    const custCreateLog = await prisma.auditLog.findFirst({
      where: { entityType: "customer", entityId: custData.id, action: "create" }
    });
    assert.ok(custCreateLog, "Customer create DB audit row must exist");
    assert.equal(custCreateLog.actorId, operatorUser.id);

    // Customer update
    const custUpRes = await fetch(`${baseUrl}/api/customers/${custData.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({ notes: "Updated note" })
    });
    assert.equal(custUpRes.status, 200);

    const custUpLog = await prisma.auditLog.findFirst({
      where: { entityType: "customer", entityId: custData.id, action: "update" }
    });
    assert.ok(custUpLog, "Customer update DB audit row must exist");

    // 2. Measurement version create
    const measRes = await fetch(`${baseUrl}/api/customers/${custData.id}/measurements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        measuredAt: new Date().toISOString(),
        label: "Initial Fit",
        values: [{ fieldKey: "chest", value: 95.5, unit: "cm" }]
      })
    });
    assert.equal(measRes.status, 201);
    const measData = (await measRes.json()).data;

    const measLog = await prisma.auditLog.findFirst({
      where: { entityType: "measurement_version", entityId: measData.id, action: "create" }
    });
    assert.ok(measLog, "Measurement version DB audit row must exist");

    // 3. Garment type create, update, deactivate
    const garmentRes = await fetch(`${baseUrl}/api/garment-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        name: `Retrofit Garment ${Date.now()}`,
        measurementFields: [
          { fieldKey: "chest", label: "Chest", unit: "cm", isRequired: true, sortOrder: 0 }
        ]
      })
    });
    assert.equal(garmentRes.status, 201);
    const garmentData = (await garmentRes.json()).data;
    createdGarmentTypeIds.push(garmentData.id);

    const garmentCreateLog = await prisma.auditLog.findFirst({
      where: { entityType: "garment_type", entityId: garmentData.id, action: "create" }
    });
    assert.ok(garmentCreateLog, "Garment type create DB audit row must exist");

    // Garment type update
    const garmentUpRes = await fetch(`${baseUrl}/api/garment-types/${garmentData.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({ description: "Updated description" })
    });
    assert.equal(garmentUpRes.status, 200);
    const garmentUpLog = await prisma.auditLog.findFirst({
      where: { entityType: "garment_type", entityId: garmentData.id, action: "update" }
    });
    assert.ok(garmentUpLog, "Garment type update DB audit row must exist");

    // Separate garment type to test deactivate
    const deactGarmentRes = await fetch(`${baseUrl}/api/garment-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        name: `Deact Garment ${Date.now()}`
      })
    });
    assert.equal(deactGarmentRes.status, 201);
    const deactGarmentData = (await deactGarmentRes.json()).data;
    createdGarmentTypeIds.push(deactGarmentData.id);

    const garmentDeactRes = await fetch(
      `${baseUrl}/api/garment-types/${deactGarmentData.id}/deactivate`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-actor-id": operatorUser.id
        }
      }
    );
    assert.equal(garmentDeactRes.status, 200);
    const garmentDeactLog = await prisma.auditLog.findFirst({
      where: { entityType: "garment_type", entityId: deactGarmentData.id, action: "deactivate" }
    });
    assert.ok(garmentDeactLog, "Garment type deactivate DB audit row must exist");

    // 4. Order create, update items, status transition, resnapshot
    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        customerId: custData.id,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        requiresFitting: true,
        items: [
          {
            garmentTypeId: garmentData.id,
            quantity: 1,
            unitPrice: 250000
          }
        ]
      })
    });
    assert.equal(orderRes.status, 201);
    const orderData = (await orderRes.json()).data;
    createdOrderIds.push(orderData.id);

    const orderCreateLog = await prisma.auditLog.findFirst({
      where: { entityType: "order", entityId: orderData.id, action: "create" }
    });
    assert.ok(orderCreateLog, "Order create DB audit row must exist");

    // Order status transition: DRAFT -> CONFIRMED
    const orderTransRes = await fetch(`${baseUrl}/api/orders/${orderData.id}/transition`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({ toStatus: "CONFIRMED" })
    });
    assert.equal(orderTransRes.status, 200);

    const orderTransLog = await prisma.auditLog.findFirst({
      where: {
        entityType: "order",
        entityId: orderData.id,
        action: "status_change"
      }
    });
    assert.ok(orderTransLog, "Order status change DB audit row must exist");
    assert.equal((orderTransLog.after as { status?: string })?.status, "CONFIRMED");

    // Order resnapshot
    const resnapRes = await fetch(`${baseUrl}/api/orders/${orderData.id}/resnapshot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      }
    });
    assert.equal(resnapRes.status, 200);

    const resnapLog = await prisma.auditLog.findFirst({
      where: { entityType: "order", entityId: orderData.id, action: "resnapshot" }
    });
    assert.ok(resnapLog, "Order resnapshot DB audit row must exist");

    // 5. Payment record
    const payRes = await fetch(`${baseUrl}/api/orders/${orderData.id}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        type: "DP",
        amount: 100000,
        method: "CASH",
        note: "Deposit payment"
      })
    });
    assert.equal(payRes.status, 201);
    const payData = (await payRes.json()).data;

    const payLog = await prisma.auditLog.findFirst({
      where: { entityType: "payment", entityId: payData.id, action: "payment.recorded" }
    });
    assert.ok(payLog, "Payment record DB audit row must exist");

    // Advance order to IN_PROGRESS for fittings
    await fetch(`${baseUrl}/api/orders/${orderData.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus: "IN_PROGRESS" })
    });

    // 6. Fitting create & result
    const fitRes = await fetch(`${baseUrl}/api/orders/${orderData.id}/fittings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "First fitting session"
      })
    });
    assert.equal(fitRes.status, 201);
    const fitData = (await fitRes.json()).data;

    const fitCreateLog = await prisma.auditLog.findFirst({
      where: { entityType: "fitting", entityId: fitData.id, action: "fitting.created" }
    });
    assert.ok(fitCreateLog, "Fitting create DB audit row must exist");

    // Fitting result
    const fitResultRes = await fetch(`${baseUrl}/api/orders/${orderData.id}/fittings/${fitData.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        status: "DONE",
        result: "NEEDS_REVISION",
        occurredAt: new Date().toISOString(),
        notes: "Slight adjustment needed on collar"
      })
    });
    assert.equal(fitResultRes.status, 200);

    const fitResultLog = await prisma.auditLog.findFirst({
      where: { entityType: "fitting", entityId: fitData.id, action: "fitting.result_recorded" }
    });
    assert.ok(fitResultLog, "Fitting result DB audit row must exist");

    // 7. Revision create & resolve
    const revRes = await fetch(`${baseUrl}/api/orders/${orderData.id}/revisions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        fittingId: fitData.id,
        issue: "Collar is slightly loose",
        requestedChange: "Take in collar by 1cm"
      })
    });
    assert.equal(revRes.status, 201);
    const revData = (await revRes.json()).data;

    const revCreateLog = await prisma.auditLog.findFirst({
      where: { entityType: "revision", entityId: revData.id, action: "revision.created" }
    });
    assert.ok(revCreateLog, "Revision create DB audit row must exist");

    // Revision resolve
    const revResolveRes = await fetch(`${baseUrl}/api/orders/${orderData.id}/revisions/${revData.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        status: "RESOLVED",
        notes: "Collar adjusted and pressed"
      })
    });
    assert.equal(revResolveRes.status, 200);

    const revResolveLog = await prisma.auditLog.findFirst({
      where: { entityType: "revision", entityId: revData.id, action: "revision.resolved" }
    });
    assert.ok(revResolveLog, "Revision resolve DB audit row must exist");

    // 8. Order attachment create & delete
    const attachRes = await fetch(`${baseUrl}/api/orders/${orderData.id}/attachments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        type: "CUSTOMER_REFERENCE",
        cloudinaryPublicId: `jahitflow/orders/${orderData.id}/test_retro`,
        secureUrl: "https://res.cloudinary.com/test/image/upload/v12345/test_retro.jpg",
        format: "jpg",
        width: 800,
        height: 600
      })
    });
    assert.equal(attachRes.status, 201);
    const attachData = (await attachRes.json()).data;

    const attachCreateLog = await prisma.auditLog.findFirst({
      where: {
        entityType: "order_attachment",
        entityId: attachData.id,
        action: "attachment.uploaded"
      }
    });
    assert.ok(attachCreateLog, "Attachment upload DB audit row must exist");

    // Delete attachment
    const attachDelRes = await fetch(
      `${baseUrl}/api/orders/${orderData.id}/attachments/${attachData.id}`,
      {
        method: "DELETE",
        headers: { "x-actor-id": operatorUser.id }
      }
    );
    assert.equal(attachDelRes.status, 200);

    const attachDelLog = await prisma.auditLog.findFirst({
      where: {
        entityType: "order_attachment",
        entityId: attachData.id,
        action: "attachment.deleted"
      }
    });
    assert.ok(attachDelLog, "Attachment delete DB audit row must exist");

    // 9. Customer soft delete (using a customer without active orders)
    const delCustRes = await fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": operatorUser.id
      },
      body: JSON.stringify({
        name: "Delete Me Customer",
        phone: "081122334455"
      })
    });
    assert.equal(delCustRes.status, 201);
    const delCustData = (await delCustRes.json()).data;
    createdCustomerIds.push(delCustData.id);

    const custDelRes = await fetch(`${baseUrl}/api/customers/${delCustData.id}`, {
      method: "DELETE",
      headers: { "x-actor-id": operatorUser.id }
    });
    assert.equal(custDelRes.status, 200);

    const custDelLog = await prisma.auditLog.findFirst({
      where: {
        entityType: "customer",
        entityId: delCustData.id,
        action: "delete"
      }
    });
    assert.ok(custDelLog, "Customer delete DB audit row must exist");
  });
});

