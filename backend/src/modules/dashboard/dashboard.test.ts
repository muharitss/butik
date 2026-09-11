import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";

test("Dashboard API integration tests", async (t) => {
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

    // Clean up created orders and their children
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

    // Clean up created customers
    if (createdCustomerIds.length > 0) {
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } }
      });
    }
  });

  // Helper to create customer
  async function createTestCustomer(name: string) {
    const customer = await prisma.customer.create({
      data: {
        name,
        phone: "081234567890",
        email: `${name.toLowerCase().replace(/\s+/g, "")}@example.com`
      }
    });
    createdCustomerIds.push(customer.id);
    return customer;
  }

  // Helper to create an order
  async function createTestOrder(
    customerId: string,
    orderNumber: string,
    status: string,
    deadlineAt: Date,
    total = 500000,
    paidTotal = 0,
    paymentStatus = "UNPAID"
  ) {
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        status,
        deadlineAt,
        subtotal: total,
        total,
        paidTotalCache: paidTotal,
        paymentStatusCache: paymentStatus
      }
    });
    createdOrderIds.push(order.id);
    return order;
  }

  await t.test("GET /api/dashboard/summary returns valid structure and default values", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/summary`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.data);
    assert.ok(json.data.metrics);
    assert.equal(typeof json.data.metrics.activeOrdersCount, "number");
    assert.equal(typeof json.data.metrics.dueSoonCount, "number");
    assert.equal(json.data.metrics.dueSoonDays, 7);
    assert.equal(typeof json.data.metrics.overdueCount, "number");
    assert.equal(typeof json.data.metrics.readyForPickupCount, "number");
    assert.equal(typeof json.data.metrics.upcomingFittingsCount, "number");
    assert.equal(json.data.metrics.upcomingFittingsDays, 7);
    assert.equal(typeof json.data.metrics.unpaidOrPartialCount, "number");
    assert.equal(typeof json.data.metrics.totalOutstandingBalance, "string");

    assert.ok(Array.isArray(json.data.dueSoonOrders));
    assert.ok(Array.isArray(json.data.overdueOrders));
    assert.ok(Array.isArray(json.data.readyOrders));
    assert.ok(Array.isArray(json.data.upcomingFittings));
    assert.ok(Array.isArray(json.data.unpaidOrders));
    assert.ok(Array.isArray(json.data.recentOrders));
  });

  await t.test("Dashboard accurately aggregates active, overdue, due-soon, ready, fittings, and payments", async () => {
    const customer = await createTestCustomer("Dashboard Tester");
    const now = new Date();

    // 1. Overdue order (deadline 2 days ago, status IN_PROGRESS, total 600,000, paid 200,000 PARTIAL)
    const overdueDeadline = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const overdueOrder = await createTestOrder(
      customer.id,
      "JF-TEST-OVERDUE",
      "IN_PROGRESS",
      overdueDeadline,
      600000,
      200000,
      "PARTIAL"
    );

    // 2. Due soon order (deadline in 3 days, status CONFIRMED, total 400,000, paid 0 UNPAID)
    const dueSoonDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dueSoonOrder = await createTestOrder(
      customer.id,
      "JF-TEST-DUESOON",
      "CONFIRMED",
      dueSoonDeadline,
      400000,
      0,
      "UNPAID"
    );

    // 3. Ready order (deadline in 5 days, status READY, total 300,000, paid 300,000 PAID)
    const readyDeadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const readyOrder = await createTestOrder(
      customer.id,
      "JF-TEST-READY",
      "READY",
      readyDeadline,
      300000,
      300000,
      "PAID"
    );

    // 4. Completed order (should NOT appear in active, overdue, due soon, or unpaid)
    const completedDeadline = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    await createTestOrder(
      customer.id,
      "JF-TEST-COMPLETED",
      "COMPLETED",
      completedDeadline,
      500000,
      500000,
      "PAID"
    );

    // 5. Cancelled order (should NOT appear in active, overdue, due soon, or unpaid)
    const cancelledDeadline = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    await createTestOrder(
      customer.id,
      "JF-TEST-CANCELLED",
      "CANCELLED",
      cancelledDeadline,
      500000,
      0,
      "UNPAID"
    );

    // 6. Schedule an upcoming fitting for dueSoonOrder in 2 days
    const fittingDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const fitting = await prisma.fitting.create({
      data: {
        orderId: dueSoonOrder.id,
        fittingNumber: 1,
        status: "SCHEDULED",
        scheduledAt: fittingDate,
        notes: "First try-on"
      }
    });

    // Fetch dashboard summary
    const res = await fetch(`${baseUrl}/api/dashboard/summary?dueSoonDays=7&fittingsDays=7`);
    assert.equal(res.status, 200);
    const { data } = await res.json();

    // Verify overdue orders list contains overdueOrder
    const foundOverdue = data.overdueOrders.find(
      (o: { id: string }) => o.id === overdueOrder.id
    );
    assert.ok(foundOverdue);
    assert.equal(foundOverdue.orderNumber, "JF-TEST-OVERDUE");
    assert.equal(foundOverdue.customerName, "Dashboard Tester");
    assert.equal(Number(foundOverdue.remainingBalance), 400000);

    // Verify due soon list contains dueSoonOrder
    const foundDueSoon = data.dueSoonOrders.find(
      (o: { id: string }) => o.id === dueSoonOrder.id
    );
    assert.ok(foundDueSoon);
    assert.equal(foundDueSoon.orderNumber, "JF-TEST-DUESOON");
    assert.equal(Number(foundDueSoon.remainingBalance), 400000);

    // Verify ready orders list contains readyOrder
    const foundReady = data.readyOrders.find(
      (o: { id: string }) => o.id === readyOrder.id
    );
    assert.ok(foundReady);
    assert.equal(foundReady.orderNumber, "JF-TEST-READY");
    assert.equal(foundReady.status, "READY");

    // Verify upcoming fittings contains scheduled fitting
    const foundFitting = data.upcomingFittings.find(
      (f: { id: string }) => f.id === fitting.id
    );
    assert.ok(foundFitting);
    assert.equal(foundFitting.orderNumber, "JF-TEST-DUESOON");
    assert.equal(foundFitting.fittingNumber, 1);
    assert.equal(foundFitting.customerName, "Dashboard Tester");

    // Verify unpaid orders contains overdueOrder (partial) and dueSoonOrder (unpaid)
    const foundUnpaid1 = data.unpaidOrders.find(
      (o: { id: string }) => o.id === overdueOrder.id
    );
    assert.ok(foundUnpaid1);
    assert.equal(foundUnpaid1.paymentStatus, "PARTIAL");

    const foundUnpaid2 = data.unpaidOrders.find(
      (o: { id: string }) => o.id === dueSoonOrder.id
    );
    assert.ok(foundUnpaid2);
    assert.equal(foundUnpaid2.paymentStatus, "UNPAID");

    // Excluded orders check: COMPLETED and CANCELLED should not be in overdue or dueSoon
    const foundCompleted = data.overdueOrders.find(
      (o: { orderNumber: string }) => o.orderNumber === "JF-TEST-COMPLETED"
    );
    assert.equal(foundCompleted, undefined);

    const foundCancelled = data.overdueOrders.find(
      (o: { orderNumber: string }) => o.orderNumber === "JF-TEST-CANCELLED"
    );
    assert.equal(foundCancelled, undefined);
  });

  await t.test("dueSoonDays and fittingsDays query parameters filter cutoff window", async () => {
    // If we request dueSoonDays=1, an order due in 3 days should NOT be in dueSoonOrders
    const res = await fetch(`${baseUrl}/api/dashboard/summary?dueSoonDays=1&fittingsDays=1`);
    assert.equal(res.status, 200);
    const { data } = await res.json();

    assert.equal(data.metrics.dueSoonDays, 1);
    assert.equal(data.metrics.upcomingFittingsDays, 1);

    const foundDueSoon = data.dueSoonOrders.find(
      (o: { orderNumber: string }) => o.orderNumber === "JF-TEST-DUESOON"
    );
    assert.equal(foundDueSoon, undefined);

    const foundFitting = data.upcomingFittings.find(
      (f: { orderNumber: string }) => f.orderNumber === "JF-TEST-DUESOON"
    );
    assert.equal(foundFitting, undefined);
  });
});
