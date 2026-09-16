import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { signSessionToken, SESSION_COOKIE_NAME } from "../auth/auth.service.js";

test("Reports Module — Integration Tests", async (t) => {
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
  const createdPaymentIds: string[] = [];
  const createdUserIds: string[] = [];

  let staffCookie = "";
  let ownerCookie = "";

  t.before(async () => {
    const staffUser = await prisma.user.create({
      data: {
        name: "Reports Staff User",
        email: `reports_staff_${Date.now()}@test.com`,
        role: "staff",
        isActive: true
      }
    });
    createdUserIds.push(staffUser.id);

    const ownerUser = await prisma.user.create({
      data: {
        name: "Reports Owner User",
        email: `reports_owner_${Date.now()}@test.com`,
        role: "owner",
        isActive: true
      }
    });
    createdUserIds.push(ownerUser.id);

    const staffToken = await signSessionToken({ userId: staffUser.id, role: "staff" }, "1h");
    staffCookie = `${SESSION_COOKIE_NAME}=${staffToken}`;

    const ownerToken = await signSessionToken({ userId: ownerUser.id, role: "owner" }, "1h");
    ownerCookie = `${SESSION_COOKIE_NAME}=${ownerToken}`;
  });

  t.after(async () => {
    server.close();

    // Clean up created payments
    if (createdPaymentIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { id: { in: createdPaymentIds } }
      });
    }

    // Clean up created orders and related child records
    if (createdOrderIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { entityType: "order", entityId: { in: createdOrderIds } }
      });
      await prisma.payment.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } }
      });
    }

    // Clean up customers
    if (createdCustomerIds.length > 0) {
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } }
      });
    }

    // Clean up users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } }
      });
    }
  });

  await t.test("Authorization: Staff receives 403 FORBIDDEN on /api/reports/summary", async () => {
    const res = await fetch(`${baseUrl}/api/reports/summary`, {
      headers: { Cookie: staffCookie }
    });
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.error?.code, "FORBIDDEN");
    assert.equal(json.error?.message, "Forbidden: insufficient permissions");
  });

  await t.test("Authorization: Owner receives 200 OK on /api/reports/summary", async () => {
    const res = await fetch(`${baseUrl}/api/reports/summary`, {
      headers: { Cookie: ownerCookie }
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data);
    assert.equal(typeof json.data.totalOrders, "number");
    assert.equal(typeof json.data.completedOrders, "number");
    assert.equal(typeof json.data.cancelledOrders, "number");
    assert.equal(typeof json.data.totalRevenue, "string");
    assert.equal(typeof json.data.totalCollected, "string");
    assert.equal(typeof json.data.outstandingBalance, "string");
    assert.equal(typeof json.data.newCustomers, "number");
  });

  await t.test("Validation: Invalid date string returns 400 VALIDATION_ERROR", async () => {
    const res = await fetch(`${baseUrl}/api/reports/summary?from=not-a-date`, {
      headers: { Cookie: ownerCookie }
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error?.code, "VALIDATION_ERROR");
  });

  await t.test("Validation: 'from' after 'to' returns 400 VALIDATION_ERROR", async () => {
    const res = await fetch(`${baseUrl}/api/reports/summary?from=2026-06-01&to=2026-01-01`, {
      headers: { Cookie: ownerCookie }
    });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error?.code, "VALIDATION_ERROR");
  });

  await t.test("Period Aggregates: Correctly computes metrics for bounded period and global balance", async () => {
    // 1. Create customers:
    // c1: created inside period (2026-02-10)
    const c1 = await prisma.customer.create({
      data: {
        name: "Report Customer In Period",
        createdAt: new Date("2026-02-10T10:00:00.000Z")
      }
    });
    createdCustomerIds.push(c1.id);

    // c2: created inside period but soft-deleted
    const c2 = await prisma.customer.create({
      data: {
        name: "Report Customer Deleted",
        createdAt: new Date("2026-02-15T10:00:00.000Z"),
        deletedAt: new Date("2026-02-20T10:00:00.000Z")
      }
    });
    createdCustomerIds.push(c2.id);

    // c3: created outside period (2025-11-15)
    const c3 = await prisma.customer.create({
      data: {
        name: "Report Customer Outside Period",
        createdAt: new Date("2025-11-15T10:00:00.000Z")
      }
    });
    createdCustomerIds.push(c3.id);

    // 2. Create orders:
    // o1: inside period, COMPLETED (total: 1,000,000, paid: 1,000,000, PAID, orderDate: 2026-01-15)
    const o1 = await prisma.order.create({
      data: {
        orderNumber: `RPT-${Date.now()}-1`,
        customerId: c1.id,
        status: "COMPLETED",
        orderDate: new Date("2026-01-15T10:00:00.000Z"),
        deadlineAt: new Date("2026-01-25T10:00:00.000Z"),
        subtotal: 1000000,
        total: 1000000,
        paidTotalCache: 1000000,
        paymentStatusCache: "PAID"
      }
    });
    createdOrderIds.push(o1.id);

    // o2: inside period, CANCELLED (total: 600,000, paid: 0, UNPAID, orderDate: 2026-02-01)
    const o2 = await prisma.order.create({
      data: {
        orderNumber: `RPT-${Date.now()}-2`,
        customerId: c1.id,
        status: "CANCELLED",
        orderDate: new Date("2026-02-01T10:00:00.000Z"),
        deadlineAt: new Date("2026-02-15T10:00:00.000Z"),
        subtotal: 600000,
        total: 600000,
        paidTotalCache: 0,
        paymentStatusCache: "UNPAID"
      }
    });
    createdOrderIds.push(o2.id);

    // o3: inside period, IN_PROGRESS (total: 800,000, paid: 300,000, PARTIAL, orderDate: 2026-03-01)
    const o3 = await prisma.order.create({
      data: {
        orderNumber: `RPT-${Date.now()}-3`,
        customerId: c1.id,
        status: "IN_PROGRESS",
        orderDate: new Date("2026-03-01T10:00:00.000Z"),
        deadlineAt: new Date("2026-03-20T10:00:00.000Z"),
        subtotal: 800000,
        total: 800000,
        paidTotalCache: 300000,
        paymentStatusCache: "PARTIAL"
      }
    });
    createdOrderIds.push(o3.id);

    // o4: OUTSIDE period, IN_PROGRESS (total: 500,000, paid: 100,000, PARTIAL, orderDate: 2025-12-01)
    const o4 = await prisma.order.create({
      data: {
        orderNumber: `RPT-${Date.now()}-4`,
        customerId: c3.id,
        status: "IN_PROGRESS",
        orderDate: new Date("2025-12-01T10:00:00.000Z"),
        deadlineAt: new Date("2025-12-20T10:00:00.000Z"),
        subtotal: 500000,
        total: 500000,
        paidTotalCache: 100000,
        paymentStatusCache: "PARTIAL"
      }
    });
    createdOrderIds.push(o4.id);

    // 3. Create payments:
    // p1: for o1 inside period (1,000,000 on 2026-01-16)
    const p1 = await prisma.payment.create({
      data: {
        orderId: o1.id,
        type: "FULL",
        amount: 1000000,
        recordedAt: new Date("2026-01-16T10:00:00.000Z")
      }
    });
    createdPaymentIds.push(p1.id);

    // p2: for o3 inside period (300,000 on 2026-03-02)
    const p2 = await prisma.payment.create({
      data: {
        orderId: o3.id,
        type: "DOWN_PAYMENT",
        amount: 300000,
        recordedAt: new Date("2026-03-02T10:00:00.000Z")
      }
    });
    createdPaymentIds.push(p2.id);

    // p3: for o4 OUTSIDE period (100,000 on 2025-12-02)
    const p3 = await prisma.payment.create({
      data: {
        orderId: o4.id,
        type: "DOWN_PAYMENT",
        amount: 100000,
        recordedAt: new Date("2025-12-02T10:00:00.000Z")
      }
    });
    createdPaymentIds.push(p3.id);

    // Query period: 2026-01-01 to 2026-03-31
    const res = await fetch(`${baseUrl}/api/reports/summary?from=2026-01-01&to=2026-03-31`, {
      headers: { Cookie: ownerCookie }
    });
    assert.equal(res.status, 200);
    const { data } = await res.json();

    // Verification:
    // In-period orders are o1, o2, o3 (count = 3)
    assert.equal(data.totalOrders, 3);
    // Completed orders in period = o1 (count = 1)
    assert.equal(data.completedOrders, 1);
    // Cancelled orders in period = o2 (count = 1)
    assert.equal(data.cancelledOrders, 1);
    // Total revenue from completed orders in period = o1.total = 1,000,000.00
    assert.equal(Number(data.totalRevenue), 1000000);
    // Total collected in period = p1 + p2 = 1,000,000 + 300,000 = 1,300,000.00
    assert.equal(Number(data.totalCollected), 1300000);
    // New customers in period (non-deleted) = c1 (c2 is deleted, c3 is outside) = 1
    assert.equal(data.newCustomers, 1);

    // Global outstanding balance:
    // o3 due (800,000 - 300,000 = 500,000) + o4 due (500,000 - 100,000 = 400,000) = at least 900,000
    assert.ok(Number(data.outstandingBalance) >= 900000);

    // Query all-time (no from/to filters)
    const allTimeRes = await fetch(`${baseUrl}/api/reports/summary`, {
      headers: { Cookie: ownerCookie }
    });
    assert.equal(allTimeRes.status, 200);
    const allTimeJson = await allTimeRes.json();
    assert.ok(allTimeJson.data.totalOrders >= 4);
    assert.ok(allTimeJson.data.completedOrders >= 1);
    assert.ok(allTimeJson.data.cancelledOrders >= 1);
    assert.ok(Number(allTimeJson.data.totalCollected) >= 1400000);
    assert.ok(allTimeJson.data.newCustomers >= 2);
  });
});

