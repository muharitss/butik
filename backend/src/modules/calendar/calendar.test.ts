import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import type { CalendarEvent } from "./calendar.schemas.js";

test("Calendar API integration tests", async (t) => {
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

  t.after(async () => {
    server.close();

    if (createdOrderIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { entityType: "order", entityId: { in: createdOrderIds } },
            { entityType: "fitting" }
          ]
        }
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
          orderMeasurementSnapshot: { orderId: { in: createdOrderIds } }
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

  async function createTestCustomer(name: string) {
    const customer = await prisma.customer.create({
      data: {
        name,
        phone: "081299887766",
        email: `${name.toLowerCase().replace(/\s+/g, "")}@example.com`
      }
    });
    createdCustomerIds.push(customer.id);
    return customer;
  }

  async function createTestOrder(
    customerId: string,
    orderNumber: string,
    status: string,
    deadlineAt: Date,
    total = 750000
  ) {
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        status,
        deadlineAt,
        subtotal: total,
        total,
        paidTotalCache: 0,
        paymentStatusCache: "UNPAID"
      }
    });
    createdOrderIds.push(order.id);
    return order;
  }

  await t.test("GET /api/calendar/events returns 200 with default range envelope", async () => {
    const res = await fetch(`${baseUrl}/api/calendar/events`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.data);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.meta);
    assert.ok(json.meta.from);
    assert.ok(json.meta.to);
    assert.equal(typeof json.meta.count, "number");
    assert.equal(typeof json.meta.deadlinesCount, "number");
    assert.equal(typeof json.meta.fittingsCount, "number");
  });

  await t.test("GET /api/calendar/events plots deadlines and scheduled fittings accurately", async () => {
    const customer = await createTestCustomer("Calendar Tester One");

    const targetDate1 = new Date("2026-06-10T10:00:00.000Z");
    const targetDate2 = new Date("2026-06-15T14:30:00.000Z");
    const outOfRangeDate = new Date("2026-07-20T10:00:00.000Z");

    // 1. In-range active order with deadline on June 10
    const activeOrder = await createTestOrder(
      customer.id,
      "JF-2026-CAL1",
      "IN_PROGRESS",
      targetDate1
    );

    // 2. Fitting scheduled on active order for June 15
    const fitting1 = await prisma.fitting.create({
      data: {
        orderId: activeOrder.id,
        fittingNumber: 1,
        status: "SCHEDULED",
        scheduledAt: targetDate2,
        notes: "First fitting session for jacket"
      }
    });

    // 3. Cancelled order on June 12 (should be excluded)
    await createTestOrder(
      customer.id,
      "JF-2026-CAL2",
      "CANCELLED",
      new Date("2026-06-12T10:00:00.000Z")
    );

    // 4. Cancelled fitting on June 14 (should be excluded)
    await prisma.fitting.create({
      data: {
        orderId: activeOrder.id,
        fittingNumber: 2,
        status: "CANCELLED",
        scheduledAt: new Date("2026-06-14T10:00:00.000Z")
      }
    });

    // 5. Order out of range (July)
    await createTestOrder(
      customer.id,
      "JF-2026-CAL3",
      "CONFIRMED",
      outOfRangeDate
    );

    // Query for June 2026
    const res = await fetch(
      `${baseUrl}/api/calendar/events?from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.999Z`
    );
    assert.equal(res.status, 200);

    const json = await res.json();
    const events: CalendarEvent[] = json.data;

    // Must find activeOrder deadline and fitting1, and not find cancelled items or July items
    const deadlineEv = events.find((e) => e.id === `deadline-${activeOrder.id}`);
    assert.ok(deadlineEv, "Deadline event should be present");
    assert.equal(deadlineEv.type, "deadline");
    assert.equal(deadlineEv.orderNumber, "JF-2026-CAL1");
    assert.equal(deadlineEv.customerName, "Calendar Tester One");
    assert.equal(deadlineEv.status, "IN_PROGRESS");
    assert.equal(new Date(deadlineEv.date).toISOString(), targetDate1.toISOString());

    const fittingEv = events.find((e) => e.id === `fitting-${fitting1.id}`);
    assert.ok(fittingEv, "Fitting event should be present");
    assert.equal(fittingEv.type, "fitting");
    assert.equal(fittingEv.orderNumber, "JF-2026-CAL1");
    assert.equal(fittingEv.fittingNumber, 1);
    assert.equal(fittingEv.notes, "First fitting session for jacket");
    assert.equal(new Date(fittingEv.date).toISOString(), targetDate2.toISOString());

    // Cancelled items should NOT appear
    const cancelledOrderEv = events.find((e) => e.orderNumber === "JF-2026-CAL2");
    assert.equal(cancelledOrderEv, undefined);

    const cancelledFittingEv = events.find((e) => e.fittingNumber === 2);
    assert.equal(cancelledFittingEv, undefined);

    // Out of range should NOT appear
    const outOfRangeEv = events.find((e) => e.orderNumber === "JF-2026-CAL3");
    assert.equal(outOfRangeEv, undefined);
  });

  await t.test("GET /api/calendar/events handles date-only string parameters (YYYY-MM-DD)", async () => {
    const res = await fetch(`${baseUrl}/api/calendar/events?from=2026-06-01&to=2026-06-30`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.meta.from.startsWith("2026-06-01T00:00:00"));
    assert.ok(json.meta.to.startsWith("2026-06-30T23:59:59"));
  });

  await t.test("GET /api/calendar/events validates inverted date range (from > to)", async () => {
    const res = await fetch(`${baseUrl}/api/calendar/events?from=2026-06-30&to=2026-06-01`);
    assert.equal(res.status, 400);

    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("GET /api/calendar/events validates malformed date format", async () => {
    const res = await fetch(`${baseUrl}/api/calendar/events?from=not-a-date`);
    assert.equal(res.status, 400);

    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("GET /api/calendar/events validates span exceeding max limit", async () => {
    const res = await fetch(`${baseUrl}/api/calendar/events?from=2025-01-01&to=2026-06-01`);
    assert.equal(res.status, 400);

    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });
});
