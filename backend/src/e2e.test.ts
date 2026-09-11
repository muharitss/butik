import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "./app.js";
import { prisma } from "./infrastructure/prisma/client.js";

test("E2E Critical-Path Test — Full Tailoring Order Lifecycle", async (t) => {
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

  t.after(async () => {
    server.close();

    // Clean up created entities
    if (createdOrderIds.length > 0) {
      await prisma.revision.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.fitting.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.orderMeasurementSnapshotValue.deleteMany({
        where: { orderMeasurementSnapshot: { orderId: { in: createdOrderIds } } }
      });
      await prisma.orderMeasurementSnapshot.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    }

    if (createdCustomerIds.length > 0) {
      await prisma.measurementValue.deleteMany({
        where: { measurementVersion: { customerId: { in: createdCustomerIds } } }
      });
      await prisma.measurementVersion.deleteMany({
        where: { customerId: { in: createdCustomerIds } }
      });
      await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
    }

    if (createdGarmentTypeIds.length > 0) {
      await prisma.garmentMeasurementField.deleteMany({
        where: { garmentTypeId: { in: createdGarmentTypeIds } }
      });
      await prisma.garmentType.deleteMany({ where: { id: { in: createdGarmentTypeIds } } });
    }
  });

  await t.test(
    "Critical Path: Customer -> Measurement -> Order -> DP -> Progress -> Fitting -> Revision -> Ready -> Final Payment -> Completed",
    async () => {
      // 1. Create Customer
      const custRes = await fetch(`${baseUrl}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `E2E Customer ${Date.now()}`,
          phone: `0813${Math.floor(10000000 + Math.random() * 90000000)}`,
          email: "e2e@example.com",
          address: "Jl. Tailor Bahagia No. 42"
        })
      });
      assert.equal(custRes.status, 201);
      const custJson = (await custRes.json()) as { data: { id: string; name: string } };
      const customerId = custJson.data.id;
      createdCustomerIds.push(customerId);
      assert.ok(customerId);

      // 2. Add Measurement Version
      const measRes = await fetch(`${baseUrl}/api/customers/${customerId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          measuredAt: new Date().toISOString(),
          label: "Initial Fitting Measurement",
          values: [
            { fieldKey: "chest", value: 98, unit: "cm" },
            { fieldKey: "waist", value: 84, unit: "cm" }
          ]
        })
      });
      assert.equal(measRes.status, 201);
      const measJson = (await measRes.json()) as { data: { id: string; versionNumber: number } };
      assert.equal(measJson.data.versionNumber, 1);

      // 3. Create Garment Type
      const garmentRes = await fetch(`${baseUrl}/api/garment-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `E2E Jas Formal ${Date.now()}`,
          description: "Full set bespoke suit",
          measurementFields: [
            { fieldKey: "chest", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
            { fieldKey: "waist", label: "Lingkar Pinggang", unit: "cm", isRequired: true, sortOrder: 2 }
          ]
        })
      });
      assert.equal(garmentRes.status, 201);
      const garmentJson = (await garmentRes.json()) as { data: { id: string } };
      const garmentTypeId = garmentJson.data.id;
      createdGarmentTypeIds.push(garmentTypeId);

      // 4. Create Order
      const orderRes = await fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          deadlineAt: new Date(Date.now() + 14 * 86400000).toISOString(),
          requiresFitting: true,
          items: [{ garmentTypeId, quantity: 1, unitPrice: 1500000, notes: "Wool blend navy" }],
          notes: "Wedding suit order"
        })
      });
      assert.equal(orderRes.status, 201);
      const orderJson = (await orderRes.json()) as {
        data: {
          id: string;
          orderNumber: string;
          status: string;
          total: string;
          paymentStatusCache: string;
          paidTotalCache: string;
        };
      };
      const orderId = orderJson.data.id;
      createdOrderIds.push(orderId);

      assert.equal(orderJson.data.status, "DRAFT");
      assert.ok(orderJson.data.orderNumber.startsWith("JF-"));
      assert.equal(Number(orderJson.data.total), 1500000);
      assert.equal(Number(orderJson.data.paidTotalCache), 0);
      assert.equal(orderJson.data.paymentStatusCache, "UNPAID");

      // 5. Progress Order: DRAFT -> CONFIRMED
      const confirmRes = await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: "CONFIRMED" })
      });
      assert.equal(confirmRes.status, 200);
      const confirmJson = (await confirmRes.json()) as { data: { status: string } };
      assert.equal(confirmJson.data.status, "CONFIRMED");

      // 6. Record Down Payment (DP: 500,000 IDR)
      const dpRes = await fetch(`${baseUrl}/api/orders/${orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DP",
          amount: 500000,
          method: "TRANSFER",
          note: "DP 33%"
        })
      });
      assert.equal(dpRes.status, 201);

      // Verify order cache updated to PARTIAL
      const orderAfterDpRes = await fetch(`${baseUrl}/api/orders/${orderId}`);
      const orderAfterDp = (await orderAfterDpRes.json()) as {
        data: { paidTotalCache: string; paymentStatusCache: string };
      };
      assert.equal(Number(orderAfterDp.data.paidTotalCache), 500000);
      assert.equal(orderAfterDp.data.paymentStatusCache, "PARTIAL");

      // 7. Progress Order: CONFIRMED -> IN_PROGRESS
      const inProgRes = await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: "IN_PROGRESS" })
      });
      assert.equal(inProgRes.status, 200);

      // 8. Progress Order: IN_PROGRESS -> FITTING
      const toFittingRes = await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: "FITTING" })
      });
      assert.equal(toFittingRes.status, 200);

      // 9. Schedule Fitting 1 and record result: NEEDS_REVISION
      const scheduleFittingRes = await fetch(`${baseUrl}/api/orders/${orderId}/fittings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: new Date().toISOString(),
          notes: "First fitting session"
        })
      });
      assert.equal(scheduleFittingRes.status, 201);
      const fitting1 = (await scheduleFittingRes.json()) as { data: { id: string } };

      const completeFitting1Res = await fetch(
        `${baseUrl}/api/orders/${orderId}/fittings/${fitting1.data.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "DONE",
            result: "NEEDS_REVISION",
            occurredAt: new Date().toISOString(),
            notes: "Shoulders slightly tight"
          })
        }
      );
      assert.equal(completeFitting1Res.status, 200);

      // 10. Verify order was automatically transitioned to REVISION by fitting result
      const orderAfterFitting1 = (await (await fetch(`${baseUrl}/api/orders/${orderId}`)).json()) as {
        data: { status: string };
      };
      assert.equal(orderAfterFitting1.data.status, "REVISION");

      // 11. Create and Resolve Revision
      const createRevRes = await fetch(`${baseUrl}/api/orders/${orderId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fittingId: fitting1.data.id,
          issue: "Shoulders tight",
          requestedChange: "Add 1.5cm shoulder padding room"
        })
      });
      assert.equal(createRevRes.status, 201);
      const rev = (await createRevRes.json()) as { data: { id: string; status: string } };
      assert.equal(rev.data.status, "OPEN");

      // Resolve Revision
      const resolveRevRes = await fetch(
        `${baseUrl}/api/orders/${orderId}/revisions/${rev.data.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "RESOLVED",
            resolvedAt: new Date().toISOString(),
            notes: "Shoulder alteration completed"
          })
        }
      );
      assert.equal(resolveRevRes.status, 200);

      // 12. Progress Order: REVISION -> FITTING (Fitting 2)
      const toFitting2Res = await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: "FITTING" })
      });
      assert.equal(toFitting2Res.status, 200);

      const scheduleFitting2Res = await fetch(`${baseUrl}/api/orders/${orderId}/fittings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: new Date().toISOString(),
          notes: "Second fitting after alteration"
        })
      });
      assert.equal(scheduleFitting2Res.status, 201);
      const fitting2 = (await scheduleFitting2Res.json()) as { data: { id: string } };

      const approveFitting2Res = await fetch(
        `${baseUrl}/api/orders/${orderId}/fittings/${fitting2.data.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "DONE",
            result: "APPROVED",
            occurredAt: new Date().toISOString(),
            notes: "Customer thrilled with fit"
          })
        }
      );
      assert.equal(approveFitting2Res.status, 200);

      // 13. Verify order was automatically transitioned to READY by approved fitting
      const orderAfterFitting2 = (await (await fetch(`${baseUrl}/api/orders/${orderId}`)).json()) as {
        data: { status: string };
      };
      assert.equal(orderAfterFitting2.data.status, "READY");

      // 14. Attempt to complete order while balance is still unpaid -> REJECTED (409)
      const prematureCompleteRes = await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: "COMPLETED" })
      });
      assert.equal(prematureCompleteRes.status, 409);
      const prematureJson = (await prematureCompleteRes.json()) as {
        error: { code: string; message: string };
      };
      assert.equal(prematureJson.error.code, "BUSINESS_RULE_VIOLATION");
      assert.match(prematureJson.error.message, /outstanding balance/i);

      // 15. Record Final Payment (Remaining: 1,000,000 IDR)
      const finalPmtRes = await fetch(`${baseUrl}/api/orders/${orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FINAL",
          amount: 1000000,
          method: "CASH",
          note: "Full settlement upon pickup"
        })
      });
      assert.equal(finalPmtRes.status, 201);

      // Check cache is now PAID
      const orderAfterFinalPmtRes = await fetch(`${baseUrl}/api/orders/${orderId}`);
      const orderAfterFinal = (await orderAfterFinalPmtRes.json()) as {
        data: { paidTotalCache: string; paymentStatusCache: string };
      };
      assert.equal(Number(orderAfterFinal.data.paidTotalCache), 1500000);
      assert.equal(orderAfterFinal.data.paymentStatusCache, "PAID");

      // 16. Complete Order: READY -> COMPLETED
      const completeRes = await fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: "COMPLETED" })
      });
      assert.equal(completeRes.status, 200);
      const completeJson = (await completeRes.json()) as { data: { status: string } };
      assert.equal(completeJson.data.status, "COMPLETED");

      // 17. Verify Full Assembled Detail
      const finalDetailRes = await fetch(`${baseUrl}/api/orders/${orderId}`);
      assert.equal(finalDetailRes.status, 200);
      const finalDetail = (await finalDetailRes.json()) as {
        data: {
          id: string;
          status: string;
          items: unknown[];
          statusHistories: unknown[];
          payments: unknown[];
          fittings: unknown[];
          revisions: unknown[];
          measurementSnapshots: unknown[];
        };
      };

      assert.equal(finalDetail.data.status, "COMPLETED");
      assert.equal(finalDetail.data.items.length, 1);
      assert.ok(finalDetail.data.statusHistories.length >= 6);
      assert.equal(finalDetail.data.payments.length, 2);
      assert.equal(finalDetail.data.fittings.length, 2);
      assert.equal(finalDetail.data.revisions.length, 1);
      assert.equal(finalDetail.data.measurementSnapshots.length, 1);
    }
  );
});
