import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { getAuditLogs, clearAuditLogs } from "../audit/index.js";
import { transitionOrder } from "./orders.service.js";

test("Order Creation & Item Replacement API integration tests", async (t) => {
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

    // Clean up created orders and dependencies
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

  // Helper to create test customer
  async function createTestCustomer(namePrefix = "__test_order_customer__", deletedAt: Date | null = null) {
    const customer = await prisma.customer.create({
      data: {
        name: `${namePrefix}_${Math.random().toString(36).slice(2, 8)}`,
        phone: "081234567890",
        deletedAt
      }
    });
    createdCustomerIds.push(customer.id);
    return customer;
  }

  // Helper to create test measurement version
  async function createTestMeasurement(customerId: string, values: { fieldKey: string; value: number; unit: string }[]) {
    return prisma.measurementVersion.create({
      data: {
        customerId,
        versionNumber: 1,
        measuredAt: new Date(),
        values: {
          create: values.map((v) => ({
            fieldKey: v.fieldKey,
            value: v.value,
            unit: v.unit
          }))
        }
      },
      include: { values: true }
    });
  }

  // Helper to create test garment type
  async function createTestGarmentType(namePrefix = "__test_garment__", isActive = true) {
    const garment = await prisma.garmentType.create({
      data: {
        name: `${namePrefix}_${Math.random().toString(36).slice(2, 8)}`,
        isActive
      }
    });
    createdGarmentTypeIds.push(garment.id);
    return garment;
  }

  await t.test("Rejects order creation if customer does not exist (404)", async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: "00000000-0000-0000-0000-000000000000",
        deadlineAt: new Date(Date.now() + 86400000).toISOString()
      })
    });

    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error.code, "NOT_FOUND");
  });

  await t.test("Rejects order creation if customer is soft-deleted (409 CONFLICT)", async () => {
    const customer = await createTestCustomer("__test_deleted_customer__", new Date());

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000).toISOString()
      })
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error.code, "CONFLICT");
  });

  await t.test("Rejects order creation if customer has no measurement version (409 BUSINESS_RULE_VIOLATION)", async () => {
    const customer = await createTestCustomer("__test_no_measurement_customer__");

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000).toISOString()
      })
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error.code, "BUSINESS_RULE_VIOLATION");
    assert.match(json.error.message, /record/i);
  });

  await t.test("Rejects order creation if referenced garment type is inactive (409 CONFLICT)", async () => {
    const customer = await createTestCustomer("__test_inactive_garment_customer__");
    await createTestMeasurement(customer.id, [{ fieldKey: "lingkar_dada", value: 95, unit: "cm" }]);
    const inactiveGarment = await createTestGarmentType("__inactive_garment__", false);

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000).toISOString(),
        items: [
          {
            garmentTypeId: inactiveGarment.id,
            quantity: 1,
            unitPrice: 200000
          }
        ]
      })
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error.code, "CONFLICT");
  });

  await t.test("Rejects order creation if referenced garment type does not exist (404 NOT_FOUND)", async () => {
    const customer = await createTestCustomer("__test_missing_garment_customer__");
    await createTestMeasurement(customer.id, [{ fieldKey: "lingkar_dada", value: 95, unit: "cm" }]);

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000).toISOString(),
        items: [
          {
            garmentTypeId: "00000000-0000-0000-0000-000000000000",
            quantity: 1,
            unitPrice: 200000
          }
        ]
      })
    });

    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error.code, "NOT_FOUND");
  });

  await t.test("Creates order with items, snapshot, and correct totals", async () => {
    const customer = await createTestCustomer("__test_order_create_customer__");
    await createTestMeasurement(customer.id, [
      { fieldKey: "lingkar_dada", value: 92.5, unit: "cm" },
      { fieldKey: "waist", value: 78, unit: "cm" }
    ]);
    const garment1 = await createTestGarmentType("__garment_1__");
    const garment2 = await createTestGarmentType("__garment_2__");

    const deadline = new Date(Date.now() + 7 * 86400000).toISOString();

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": "00000000-0000-0000-0000-111111111111"
      },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: deadline,
        requiresFitting: true,
        items: [
          { garmentTypeId: garment1.id, quantity: 2, unitPrice: 150000 },
          { garmentTypeId: garment2.id, quantity: 1, unitPrice: 200000, notes: "Silk liner" }
        ],
        additionalCost: 25000,
        expressFee: 50000,
        discount: 20000,
        notes: "Urgent order for wedding"
      })
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    const order = json.data;
    createdOrderIds.push(order.id);

    // Verify fields
    assert.equal(order.customerId, customer.id);
    assert.equal(order.status, "DRAFT");
    assert.equal(order.requiresFitting, true);
    assert.equal(order.notes, "Urgent order for wedding");

    // Order number format JF-<year>-<sequential>
    const currentYear = new Date().getFullYear();
    const regex = new RegExp(`^JF-${currentYear}-\\d{3,}$`);
    assert.match(order.orderNumber, regex);

    // Totals verification
    // item 1: 2 * 150000 = 300000
    // item 2: 1 * 200000 = 200000
    // subtotal = 500000
    // total = 500000 + 25000 + 50000 - 20000 = 555000
    assert.equal(Number(order.subtotal), 500000);
    assert.equal(Number(order.additionalCost), 25000);
    assert.equal(Number(order.expressFee), 50000);
    assert.equal(Number(order.discount), 20000);
    assert.equal(Number(order.total), 555000);
    assert.equal(Number(order.paidTotalCache), 0);
    assert.equal(order.paymentStatusCache, "UNPAID");

    // Items verification
    assert.equal(order.items.length, 2);
    const item1 = order.items.find((i: { garmentTypeId: string }) => i.garmentTypeId === garment1.id);
    assert.equal(item1.quantity, 2);
    assert.equal(Number(item1.unitPrice), 150000);
    assert.equal(Number(item1.subtotal), 300000);

    // Measurement snapshot verification
    assert.equal(order.measurementSnapshots.length, 1);
    const snapshot = order.measurementSnapshots[0];
    assert.equal(snapshot.values.length, 2);
    const dada = snapshot.values.find((v: { fieldKey: string }) => v.fieldKey === "lingkar_dada");
    assert.equal(Number(dada.value), 92.5);
    assert.equal(dada.unit, "cm");

    // Status history verification
    assert.equal(order.statusHistories.length, 1);
    assert.equal(order.statusHistories[0].fromStatus, null);
    assert.equal(order.statusHistories[0].toStatus, "DRAFT");

    // Audit log verification
    const logs = getAuditLogs();
    const orderAudit = logs.find((l) => l.entityType === "order" && l.entityId === order.id);
    assert.ok(orderAudit);
    assert.equal(orderAudit.action, "create");
  });

  await t.test("Allows empty items list on DRAFT order creation", async () => {
    const customer = await createTestCustomer("__test_empty_items_customer__");
    await createTestMeasurement(customer.id, [{ fieldKey: "waist", value: 75, unit: "cm" }]);

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000).toISOString(),
        items: []
      })
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    createdOrderIds.push(json.data.id);
    assert.equal(json.data.status, "DRAFT");
    assert.equal(json.data.items.length, 0);
    assert.equal(Number(json.data.subtotal), 0);
    assert.equal(Number(json.data.total), 0);
  });

  await t.test("Snapshot immutability: subsequent customer measurement changes do not affect order snapshot", async () => {
    const customer = await createTestCustomer("__test_snapshot_immutability_customer__");
    await createTestMeasurement(customer.id, [{ fieldKey: "waist", value: 80, unit: "cm" }]);

    // Create order with version 1 (waist: 80)
    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000).toISOString()
      })
    });
    assert.equal(orderRes.status, 201);
    const orderJson = await orderRes.json();
    createdOrderIds.push(orderJson.data.id);

    // Create version 2 of measurement for customer (waist: 70)
    await prisma.measurementVersion.create({
      data: {
        customerId: customer.id,
        versionNumber: 2,
        measuredAt: new Date(),
        values: {
          create: [{ fieldKey: "waist", value: 70, unit: "cm" }]
        }
      }
    });

    // Query the order's snapshot values from the database directly
    const snapshot = await prisma.orderMeasurementSnapshot.findFirst({
      where: { orderId: orderJson.data.id },
      include: { values: true }
    });

    assert.ok(snapshot);
    assert.equal(snapshot.values.length, 1);
    // Snapshot MUST still be 80, not 70!
    assert.equal(Number(snapshot.values[0].value), 80);
  });

  await t.test("Order numbers are unique and correctly sequenced even under concurrent creation", async () => {
    const customer = await createTestCustomer("__test_concurrency_customer__");
    await createTestMeasurement(customer.id, [{ fieldKey: "waist", value: 75, unit: "cm" }]);

    const count = 5;
    const promises = Array.from({ length: count }, (_, i) =>
      fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          deadlineAt: new Date(Date.now() + 86400000).toISOString(),
          notes: `Concurrent request #${i}`
        })
      }).then((r) => r.json())
    );

    const results = await Promise.all(promises);

    for (const res of results) {
      assert.ok(res.data?.id);
      createdOrderIds.push(res.data.id);
    }

    const orderNumbers = results.map((r) => r.data.orderNumber);
    const uniqueOrderNumbers = new Set(orderNumbers);

    // All order numbers must be unique
    assert.equal(uniqueOrderNumbers.size, count);

    // Extract sequence numbers and ensure they form a strictly increasing contiguous sequence
    const sequences = orderNumbers.map((num: string) => {
      const parts = num.split("-");
      return Number(parts[parts.length - 1]);
    });
    sequences.sort((a, b) => a - b);

    for (let i = 1; i < sequences.length; i++) {
      assert.equal(sequences[i], sequences[i - 1] + 1);
    }
  });

  await t.test("PATCH /api/orders/:id/items replaces items and recomputes totals", async () => {
    const customer = await createTestCustomer("__test_patch_items_customer__");
    await createTestMeasurement(customer.id, [{ fieldKey: "waist", value: 75, unit: "cm" }]);
    const garment1 = await createTestGarmentType("__patch_garment_1__");
    const garment2 = await createTestGarmentType("__patch_garment_2__");

    // Create order with 1 item
    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000).toISOString(),
        items: [{ garmentTypeId: garment1.id, quantity: 1, unitPrice: 100000 }],
        additionalCost: 10000,
        discount: 5000
      })
    });
    const createdJson = await createRes.json();
    const orderId = createdJson.data.id;
    createdOrderIds.push(orderId);

    assert.equal(Number(createdJson.data.subtotal), 100000);
    assert.equal(Number(createdJson.data.total), 105000);

    // Replace items with new list
    const patchRes = await fetch(`${baseUrl}/api/orders/${orderId}/items`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": "00000000-0000-0000-0000-222222222222"
      },
      body: JSON.stringify({
        items: [
          { garmentTypeId: garment2.id, quantity: 3, unitPrice: 200000, notes: "New item" }
        ]
      })
    });

    assert.equal(patchRes.status, 200);
    const patchedJson = await patchRes.json();
    const updatedOrder = patchedJson.data;

    // Verify items replaced
    assert.equal(updatedOrder.items.length, 1);
    assert.equal(updatedOrder.items[0].garmentTypeId, garment2.id);
    assert.equal(updatedOrder.items[0].quantity, 3);
    assert.equal(Number(updatedOrder.items[0].unitPrice), 200000);
    assert.equal(Number(updatedOrder.items[0].subtotal), 600000);

    // Verify totals recomputed
    // subtotal = 600000
    // total = 600000 + 10000 - 5000 = 605000
    assert.equal(Number(updatedOrder.subtotal), 600000);
    assert.equal(Number(updatedOrder.total), 605000);

    // Verify audit record logged
    const logs = getAuditLogs();
    const updateAudit = logs.find((l) => l.entityType === "order" && l.action === "update_items");
    assert.ok(updateAudit);
    assert.equal(updateAudit.entityId, orderId);
  });

  await t.test("PATCH /api/orders/:id/items rejects modification if order status is beyond CONFIRMED (409)", async () => {
    const customer = await createTestCustomer("__test_status_reject_customer__");
    await createTestMeasurement(customer.id, [{ fieldKey: "waist", value: 75, unit: "cm" }]);

    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000).toISOString()
      })
    });
    const order = (await createRes.json()).data;
    createdOrderIds.push(order.id);

    // Simulate status transition to IN_PROGRESS
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "IN_PROGRESS" }
    });

    const patchRes = await fetch(`${baseUrl}/api/orders/${order.id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] })
    });

    assert.equal(patchRes.status, 409);
    const json = await patchRes.json();
    assert.equal(json.error.code, "BUSINESS_RULE_VIOLATION");
    assert.match(json.error.message, /DRAFT or CONFIRMED/);
  });
});

test("Order Status Transitions API integration tests", async (t) => {
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

  async function createTestCustomer(namePrefix = "__test_trans_customer__") {
    const customer = await prisma.customer.create({
      data: {
        name: `${namePrefix}_${Math.random().toString(36).slice(2, 8)}`,
        phone: "081234567890"
      }
    });
    createdCustomerIds.push(customer.id);
    return customer;
  }

  async function createTestMeasurement(customerId: string) {
    return prisma.measurementVersion.create({
      data: {
        customerId,
        versionNumber: 1,
        measuredAt: new Date(),
        values: {
          create: [{ fieldKey: "waist", value: 70, unit: "cm" }]
        }
      },
      include: { values: true }
    });
  }

  async function createTestGarmentType(namePrefix = "__test_trans_gt__") {
    const garment = await prisma.garmentType.create({
      data: {
        name: `${namePrefix}_${Math.random().toString(36).slice(2, 8)}`,
        isActive: true
      }
    });
    createdGarmentTypeIds.push(garment.id);
    return garment;
  }

  async function createOrderHelper(options: {
    requiresFitting?: boolean;
    withItems?: boolean;
  } = {}) {
    const customer = await createTestCustomer();
    await createTestMeasurement(customer.id);
    const garment = await createTestGarmentType();

    const items = options.withItems === false ? [] : [
      {
        garmentTypeId: garment.id,
        quantity: 1,
        unitPrice: 200000
      }
    ];

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        requiresFitting: options.requiresFitting ?? true,
        items
      })
    });

    const json = await res.json();
    const order = json.data;
    createdOrderIds.push(order.id);
    return order;
  }

  async function transitionRequest(orderId: string, toStatus: string, reason?: string | null, headers: Record<string, string> = {}) {
    return fetch(`${baseUrl}/api/orders/${orderId}/transition`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify({ toStatus, reason })
    });
  }

  await t.test("DRAFT -> CONFIRMED requires at least one order item", async () => {
    const order = await createOrderHelper({ withItems: false });
    assert.equal(order.status, "DRAFT");

    const res = await transitionRequest(order.id, "CONFIRMED");
    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error.code, "BUSINESS_RULE_VIOLATION");
    assert.match(json.error.message, /at least one item/i);
  });

  await t.test("Full standard workflow succeeds through legal transitions", async () => {
    const order = await createOrderHelper({ requiresFitting: true, withItems: true });
    assert.equal(order.status, "DRAFT");

    // 1. DRAFT -> CONFIRMED
    const r1 = await transitionRequest(order.id, "CONFIRMED");
    assert.equal(r1.status, 200);
    const o1 = (await r1.json()).data;
    assert.equal(o1.status, "CONFIRMED");

    // 2. CONFIRMED -> IN_PROGRESS
    const r2 = await transitionRequest(order.id, "IN_PROGRESS");
    assert.equal(r2.status, 200);
    const o2 = (await r2.json()).data;
    assert.equal(o2.status, "IN_PROGRESS");

    // 3. IN_PROGRESS -> FITTING
    const r3 = await transitionRequest(order.id, "FITTING");
    assert.equal(r3.status, 200);
    const o3 = (await r3.json()).data;
    assert.equal(o3.status, "FITTING");

    // 4. FITTING -> REVISION
    const r4 = await transitionRequest(order.id, "REVISION");
    assert.equal(r4.status, 200);
    const o4 = (await r4.json()).data;
    assert.equal(o4.status, "REVISION");

    // 5. REVISION -> FITTING
    const r5 = await transitionRequest(order.id, "FITTING");
    assert.equal(r5.status, 200);
    const o5 = (await r5.json()).data;
    assert.equal(o5.status, "FITTING");

    // 6. FITTING -> READY
    const r6 = await transitionRequest(order.id, "READY");
    assert.equal(r6.status, 200);
    const o6 = (await r6.json()).data;
    assert.equal(o6.status, "READY");

    // 7. READY -> REVISION (reopening, requires reason)
    const r7Fail = await transitionRequest(order.id, "REVISION");
    assert.equal(r7Fail.status, 409);
    assert.match((await r7Fail.json()).error.message, /Reason is required/i);

    const r7 = await transitionRequest(order.id, "REVISION", "Client requested hem adjustment");
    assert.equal(r7.status, 200);
    const o7 = (await r7.json()).data;
    assert.equal(o7.status, "REVISION");

    // Loop back: REVISION -> FITTING -> READY
    await transitionRequest(order.id, "FITTING");
    await transitionRequest(order.id, "READY");

    // 8. READY -> COMPLETED (guarded by balance <= 0)
    const r8Fail = await transitionRequest(order.id, "COMPLETED");
    assert.equal(r8Fail.status, 409);
    const r8FailJson = await r8Fail.json();
    assert.equal(r8FailJson.error.code, "BUSINESS_RULE_VIOLATION");
    assert.match(r8FailJson.error.message, /outstanding balance/i);

    // Simulate payment in full
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paidTotalCache: o6.total,
        paymentStatusCache: "PAID"
      }
    });

    const r8 = await transitionRequest(order.id, "COMPLETED");
    assert.equal(r8.status, 200);
    const o8 = (await r8.json()).data;
    assert.equal(o8.status, "COMPLETED");

    // Verify order status history was appended for every transition
    const histories = await prisma.orderStatusHistory.findMany({
      where: { orderId: order.id },
      orderBy: { changedAt: "asc" }
    });
    // Expected transitions: initial DRAFT (created) + CONFIRMED + IN_PROGRESS + FITTING + REVISION + FITTING + READY + REVISION + FITTING + READY + COMPLETED = 11 entries
    assert.equal(histories.length, 11);
    assert.equal(histories[0].toStatus, "DRAFT");
    assert.equal(histories[histories.length - 1].toStatus, "COMPLETED");

    // Verify audit logs
    const auditLogs = getAuditLogs().filter((l) => l.entityId === order.id && l.action === "status_change");
    assert.equal(auditLogs.length, 10);
  });

  await t.test("Simple order flow without fitting (requiresFitting: false)", async () => {
    const order = await createOrderHelper({ requiresFitting: false, withItems: true });
    await transitionRequest(order.id, "CONFIRMED");
    await transitionRequest(order.id, "IN_PROGRESS");

    // IN_PROGRESS -> READY directly allowed when requiresFitting=false
    const res = await transitionRequest(order.id, "READY");
    assert.equal(res.status, 200);
    const data = (await res.json()).data;
    assert.equal(data.status, "READY");
  });

  await t.test("IN_PROGRESS -> READY rejected when requiresFitting is true", async () => {
    const order = await createOrderHelper({ requiresFitting: true, withItems: true });
    await transitionRequest(order.id, "CONFIRMED");
    await transitionRequest(order.id, "IN_PROGRESS");

    const res = await transitionRequest(order.id, "READY");
    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error.code, "BUSINESS_RULE_VIOLATION");
    assert.match(json.error.message, /order requires fitting/i);
  });

  await t.test("Cancellations require a non-empty reason and record cancellation metadata", async () => {
    // 1. Rejection when reason is omitted
    const o1 = await createOrderHelper();
    const resNoReason = await transitionRequest(o1.id, "CANCELLED");
    assert.equal(resNoReason.status, 409);
    const errNoReason = await resNoReason.json();
    assert.equal(errNoReason.error.code, "BUSINESS_RULE_VIOLATION");
    assert.match(errNoReason.error.message, /Reason is required when cancelling/i);

    // 2. Cancellation from DRAFT
    const resDraftCancel = await transitionRequest(o1.id, "CANCELLED", "Customer changed mind");
    assert.equal(resDraftCancel.status, 200);
    const d1 = (await resDraftCancel.json()).data;
    assert.equal(d1.status, "CANCELLED");

    const dbOrder = await prisma.order.findUnique({ where: { id: o1.id } });
    assert.ok(dbOrder?.cancelledAt);
    assert.equal(dbOrder?.cancellationReason, "Customer changed mind");

    // 3. Cancellation from CONFIRMED
    const o2 = await createOrderHelper();
    await transitionRequest(o2.id, "CONFIRMED");
    const rConfCancel = await transitionRequest(o2.id, "CANCELLED", "Fabric out of stock");
    assert.equal(rConfCancel.status, 200);

    // 4. Cancellation from IN_PROGRESS
    const o3 = await createOrderHelper();
    await transitionRequest(o3.id, "CONFIRMED");
    await transitionRequest(o3.id, "IN_PROGRESS");
    const rProgCancel = await transitionRequest(o3.id, "CANCELLED", "Customer requested cancellation during production");
    assert.equal(rProgCancel.status, 200);

    // 5. Cancellation from FITTING
    const o4 = await createOrderHelper();
    await transitionRequest(o4.id, "CONFIRMED");
    await transitionRequest(o4.id, "IN_PROGRESS");
    await transitionRequest(o4.id, "FITTING");
    const rFitCancel = await transitionRequest(o4.id, "CANCELLED", "Customer moved out of city");
    assert.equal(rFitCancel.status, 200);

    // 6. Cancellation from REVISION
    const o5 = await createOrderHelper();
    await transitionRequest(o5.id, "CONFIRMED");
    await transitionRequest(o5.id, "IN_PROGRESS");
    await transitionRequest(o5.id, "FITTING");
    await transitionRequest(o5.id, "REVISION");
    const rRevCancel = await transitionRequest(o5.id, "CANCELLED", "Irreparable tailoring mismatch");
    assert.equal(rRevCancel.status, 200);
  });

  await t.test("Rejects illegal transitions naming current and target status (409)", async () => {
    const order = await createOrderHelper({ requiresFitting: true, withItems: true });

    // DRAFT -> READY (skipping states)
    const rSkip = await transitionRequest(order.id, "READY");
    assert.equal(rSkip.status, 409);
    const jsonSkip = await rSkip.json();
    assert.equal(jsonSkip.error.code, "BUSINESS_RULE_VIOLATION");
    assert.equal(jsonSkip.error.message, "Cannot transition order from DRAFT to READY");

    // Advance to READY
    await transitionRequest(order.id, "CONFIRMED");
    await transitionRequest(order.id, "IN_PROGRESS");
    await transitionRequest(order.id, "FITTING");
    await transitionRequest(order.id, "READY");

    // READY -> CANCELLED is explicitly forbidden (must reopen to REVISION first)
    const rReadyCancel = await transitionRequest(order.id, "CANCELLED", "Cancel directly");
    assert.equal(rReadyCancel.status, 409);
    const jsonReadyCancel = await rReadyCancel.json();
    assert.equal(jsonReadyCancel.error.code, "BUSINESS_RULE_VIOLATION");
    assert.equal(jsonReadyCancel.error.message, "Cannot transition order from READY to CANCELLED");

    // Pay and complete
    await prisma.order.update({
      where: { id: order.id },
      data: { paidTotalCache: order.total }
    });
    await transitionRequest(order.id, "COMPLETED");

    // COMPLETED is terminal (COMPLETED -> *)
    const rComp1 = await transitionRequest(order.id, "READY");
    assert.equal(rComp1.status, 409);
    assert.equal((await rComp1.json()).error.message, "Cannot transition order from COMPLETED to READY");

    const rComp2 = await transitionRequest(order.id, "CANCELLED", "Try cancel completed");
    assert.equal(rComp2.status, 409);
    assert.equal((await rComp2.json()).error.message, "Cannot transition order from COMPLETED to CANCELLED");
  });

  await t.test("Terminal state CANCELLED rejects any further transition", async () => {
    const order = await createOrderHelper();
    await transitionRequest(order.id, "CANCELLED", "Cancelled immediately");

    const res = await transitionRequest(order.id, "CONFIRMED");
    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error.code, "BUSINESS_RULE_VIOLATION");
    assert.equal(json.error.message, "Cannot transition order from CANCELLED to CONFIRMED");
  });

  await t.test("Returns 404 for non-existent order ID", async () => {
    const res = await transitionRequest("00000000-0000-0000-0000-000000000000", "CONFIRMED");
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error.code, "NOT_FOUND");
  });

  await t.test("Returns 400 for invalid body schema", async () => {
    const order = await createOrderHelper();
    const res = await transitionRequest(order.id, "INVALID_STATUS");
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("Exported transitionOrder function operates transactionally and supports clientTx", async () => {
    const order = await createOrderHelper({ withItems: true });

    // Directly call transitionOrder
    const updated = await transitionOrder(order.id, "CONFIRMED", {
      reason: "Confirmed via service",
      actorId: null
    });
    assert.equal(updated.status, "CONFIRMED");

    // Call within an external transaction
    await prisma.$transaction(async (tx) => {
      const nextUpdated = await transitionOrder(
        order.id,
        "IN_PROGRESS",
        { reason: null, actorId: null },
        tx
      );
      assert.equal(nextUpdated.status, "IN_PROGRESS");
    });

    const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
    assert.equal(finalOrder?.status, "IN_PROGRESS");
  });
});

test("Order List, Detail, Update & Resnapshot API integration tests", async (t) => {
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

  async function createTestCustomer(name = "Customer", phone = "081234567890") {
    const customer = await prisma.customer.create({
      data: {
        name: `${name}_${Math.random().toString(36).slice(2, 8)}`,
        phone
      }
    });
    createdCustomerIds.push(customer.id);
    return customer;
  }

  async function createTestMeasurement(
    customerId: string,
    versionNumber = 1,
    values = [{ fieldKey: "chest", value: 95, unit: "cm" }]
  ) {
    return prisma.measurementVersion.create({
      data: {
        customerId,
        versionNumber,
        measuredAt: new Date(),
        values: {
          create: values.map((v) => ({
            fieldKey: v.fieldKey,
            value: v.value,
            unit: v.unit
          }))
        }
      },
      include: { values: true }
    });
  }

  async function createTestGarmentType() {
    const garment = await prisma.garmentType.create({
      data: {
        name: `Garment_${Math.random().toString(36).slice(2, 8)}`,
        isActive: true
      }
    });
    createdGarmentTypeIds.push(garment.id);
    return garment;
  }

  async function createOrderDirect(opts: {
    customerId: string;
    status?: string;
    deadlineAt?: Date;
    subtotal?: number;
    additionalCost?: number;
    expressFee?: number;
    discount?: number;
    items?: { garmentTypeId: string; quantity: number; unitPrice: number; subtotal: number }[];
    snapshotValues?: { fieldKey: string; value: number; unit: string }[];
  }) {
    const year = new Date().getFullYear();
    const orderNumber = `JF-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const subtotal = opts.subtotal ?? 100000;
    const additionalCost = opts.additionalCost ?? 0;
    const expressFee = opts.expressFee ?? 0;
    const discount = opts.discount ?? 0;
    const total = subtotal + additionalCost + expressFee - discount;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: opts.customerId,
        status: opts.status ?? "DRAFT",
        deadlineAt: opts.deadlineAt ?? new Date(Date.now() + 86400000),
        subtotal,
        additionalCost,
        expressFee,
        discount,
        total,
        items: opts.items
          ? {
              create: opts.items.map((i) => ({
                garmentTypeId: i.garmentTypeId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                subtotal: i.subtotal
              }))
            }
          : undefined,
        statusHistories: {
          create: {
            fromStatus: null,
            toStatus: opts.status ?? "DRAFT"
          }
        }
      },
      include: { items: true, statusHistories: true }
    });
    createdOrderIds.push(order.id);

    if (opts.snapshotValues) {
      let measurement = await prisma.measurementVersion.findFirst({
        where: { customerId: opts.customerId },
        orderBy: { versionNumber: "desc" }
      });
      if (!measurement) {
        measurement = await createTestMeasurement(opts.customerId, 1, opts.snapshotValues);
      }
      await prisma.orderMeasurementSnapshot.create({
        data: {
          orderId: order.id,
          sourceMeasurementVersionId: measurement.id,
          values: {
            create: opts.snapshotValues.map((v) => ({
              fieldKey: v.fieldKey,
              value: v.value,
              unit: v.unit
            }))
          }
        }
      });
    }

    return order;
  }

  await t.test("GET /api/orders returns paginated list with meta", async () => {
    const customer = await createTestCustomer("__list_cust_1__");
    await createOrderDirect({ customerId: customer.id });
    await createOrderDirect({ customerId: customer.id });

    const res = await fetch(`${baseUrl}/api/orders?page=1&pageSize=10`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 2);
    assert.equal(json.meta.page, 1);
    assert.equal(json.meta.pageSize, 10);
    assert.ok(json.meta.total >= 2);
  });

  await t.test("GET /api/orders filters by status", async () => {
    const customer = await createTestCustomer("__status_filter_cust__");
    const draftOrder = await createOrderDirect({ customerId: customer.id, status: "DRAFT" });
    const confirmedOrder = await createOrderDirect({ customerId: customer.id, status: "CONFIRMED" });

    const res = await fetch(`${baseUrl}/api/orders?status=CONFIRMED`);
    assert.equal(res.status, 200);
    const json = await res.json();

    assert.ok(json.data.some((o: { id: string }) => o.id === confirmedOrder.id));
    assert.ok(!json.data.some((o: { id: string }) => o.id === draftOrder.id));
  });

  await t.test("GET /api/orders searches by q (orderNumber, customer name, phone)", async () => {
    const customer = await createTestCustomer("UniqueAlphaCustomer", "081987654321");
    const order = await createOrderDirect({ customerId: customer.id });

    // Search by order number
    const resByOrderNo = await fetch(`${baseUrl}/api/orders?q=${order.orderNumber}`);
    assert.equal(resByOrderNo.status, 200);
    const jsonByOrderNo = await resByOrderNo.json();
    assert.ok(jsonByOrderNo.data.some((o: { id: string }) => o.id === order.id));

    // Search by customer name
    const resByName = await fetch(`${baseUrl}/api/orders?q=UniqueAlphaCustomer`);
    assert.equal(resByName.status, 200);
    const jsonByName = await resByName.json();
    assert.ok(jsonByName.data.some((o: { id: string }) => o.id === order.id));

    // Search by phone
    const resByPhone = await fetch(`${baseUrl}/api/orders?q=081987654321`);
    assert.equal(resByPhone.status, 200);
    const jsonByPhone = await resByPhone.json();
    assert.ok(jsonByPhone.data.some((o: { id: string }) => o.id === order.id));
  });

  await t.test("GET /api/orders filters by dueBefore and dueAfter", async () => {
    const customer = await createTestCustomer("__due_filter_cust__");
    const now = Date.now();
    const nearDeadline = new Date(now + 2 * 86400000); // in 2 days
    const farDeadline = new Date(now + 20 * 86400000); // in 20 days

    const nearOrder = await createOrderDirect({ customerId: customer.id, deadlineAt: nearDeadline });
    const farOrder = await createOrderDirect({ customerId: customer.id, deadlineAt: farDeadline });

    // Filter dueBefore in 5 days
    const beforeDate = new Date(now + 5 * 86400000).toISOString();
    const resBefore = await fetch(`${baseUrl}/api/orders?dueBefore=${beforeDate}`);
    const jsonBefore = await resBefore.json();
    assert.ok(jsonBefore.data.some((o: { id: string }) => o.id === nearOrder.id));
    assert.ok(!jsonBefore.data.some((o: { id: string }) => o.id === farOrder.id));

    // Filter dueAfter in 10 days
    const afterDate = new Date(now + 10 * 86400000).toISOString();
    const resAfter = await fetch(`${baseUrl}/api/orders?dueAfter=${afterDate}`);
    const jsonAfter = await resAfter.json();
    assert.ok(jsonAfter.data.some((o: { id: string }) => o.id === farOrder.id));
    assert.ok(!jsonAfter.data.some((o: { id: string }) => o.id === nearOrder.id));
  });

  await t.test("GET /api/orders/:id returns full detail assembled view", async () => {
    const customer = await createTestCustomer("__detail_cust__");
    const garment = await createTestGarmentType();
    const order = await createOrderDirect({
      customerId: customer.id,
      items: [
        {
          garmentTypeId: garment.id,
          quantity: 2,
          unitPrice: 50000,
          subtotal: 100000
        }
      ],
      snapshotValues: [
        { fieldKey: "chest", value: 92, unit: "cm" },
        { fieldKey: "waist", value: 80, unit: "cm" }
      ]
    });

    const res = await fetch(`${baseUrl}/api/orders/${order.id}`);
    assert.equal(res.status, 200);

    const json = await res.json();
    const data = json.data;

    assert.equal(data.id, order.id);
    assert.equal(data.orderNumber, order.orderNumber);
    assert.equal(data.customer.id, customer.id);
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].garmentType.id, garment.id);

    // Active measurement snapshot
    assert.ok(data.measurementSnapshot);
    assert.equal(data.measurementSnapshot.values.length, 2);

    // Payments summary
    assert.ok(data.paymentsSummary);
    assert.equal(Number(data.paymentsSummary.paidTotal), 0);
    assert.equal(Number(data.paymentsSummary.remainingBalance), 100000);
    assert.equal(data.paymentsSummary.paymentStatus, "UNPAID");

    // Sub-resources arrays
    assert.deepEqual(data.payments, []);
    assert.deepEqual(data.fittings, []);
    assert.deepEqual(data.revisions, []);
    assert.deepEqual(data.attachments, []);

    // Status histories
    assert.ok(Array.isArray(data.statusHistories));
    assert.ok(data.statusHistories.length >= 1);
  });

  await t.test("GET /api/orders/:id returns 404 for non-existent order", async () => {
    const randomId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/orders/${randomId}`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error.code, "NOT_FOUND");
  });

  await t.test("PATCH /api/orders/:id updates mutable fields and recomputes total", async () => {
    const customer = await createTestCustomer("__patch_cust__");
    const order = await createOrderDirect({
      customerId: customer.id,
      subtotal: 200000,
      additionalCost: 10000,
      expressFee: 0,
      discount: 0
    });

    const newDeadline = new Date(Date.now() + 5 * 86400000).toISOString();
    const updatePayload = {
      deadlineAt: newDeadline,
      notes: "Updated order notes",
      additionalCost: 20000,
      expressFee: 15000,
      discount: 10000
    };

    const res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-actor-id": "00000000-0000-0000-0000-000000000000"
      },
      body: JSON.stringify(updatePayload)
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    const data = json.data;

    assert.equal(data.notes, "Updated order notes");
    assert.equal(Number(data.additionalCost), 20000);
    assert.equal(Number(data.expressFee), 15000);
    assert.equal(Number(data.discount), 10000);
    // 200,000 + 20,000 + 15,000 - 10,000 = 225,000
    assert.equal(Number(data.total), 225000);

    const logs = getAuditLogs();
    assert.ok(logs.some((l) => l.entityId === order.id && l.action === "update"));
  });

  await t.test("PATCH /api/orders/:id rejects negative total after discount", async () => {
    const customer = await createTestCustomer("__negative_patch_cust__");
    const order = await createOrderDirect({
      customerId: customer.id,
      subtotal: 50000
    });

    const res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discount: 100000 })
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("PATCH /api/orders/:id rejects update if status is beyond CONFIRMED (409)", async () => {
    const customer = await createTestCustomer("__blocked_patch_cust__");
    const order = await createOrderDirect({
      customerId: customer.id,
      status: "IN_PROGRESS"
    });

    const res = await fetch(`${baseUrl}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Cannot update in progress" })
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error.code, "BUSINESS_RULE_VIOLATION");
  });

  await t.test("POST /api/orders/:id/resnapshot supersedes old snapshot and creates new one with audit log", async () => {
    const customer = await createTestCustomer("__resnapshot_cust__");

    // Version 1: chest: 90
    await createTestMeasurement(customer.id, 1, [{ fieldKey: "chest", value: 90, unit: "cm" }]);

    const order = await createOrderDirect({
      customerId: customer.id,
      status: "DRAFT",
      snapshotValues: [{ fieldKey: "chest", value: 90, unit: "cm" }]
    });

    // Customer records Version 2: chest: 96, waist: 82
    await createTestMeasurement(customer.id, 2, [
      { fieldKey: "chest", value: 96, unit: "cm" },
      { fieldKey: "waist", value: 82, unit: "cm" }
    ]);

    // Resnapshot the order
    const res = await fetch(`${baseUrl}/api/orders/${order.id}/resnapshot`, {
      method: "POST"
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    const data = json.data;

    // Current snapshot in response should have 2 values (chest: 96, waist: 82)
    assert.ok(data.measurementSnapshot);
    assert.equal(data.measurementSnapshot.values.length, 2);
    const chestVal = data.measurementSnapshot.values.find((v: { fieldKey: string }) => v.fieldKey === "chest");
    assert.equal(Number(chestVal.value), 96);

    // Verify DB: previous snapshot is superseded
    const allSnapshots = await prisma.orderMeasurementSnapshot.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" }
    });
    assert.equal(allSnapshots.length, 2);
    assert.ok(allSnapshots[0].supersededByResnapshotAt !== null);
    assert.equal(allSnapshots[1].supersededByResnapshotAt, null);

    // Audit log verifies before/after
    const logs = getAuditLogs();
    const resnapLog = logs.find((l) => l.entityId === order.id && l.action === "resnapshot");
    assert.ok(resnapLog);
    assert.ok((resnapLog.before as { snapshotId: string })?.snapshotId === allSnapshots[0].id);
    assert.ok((resnapLog.after as { snapshotId: string })?.snapshotId === allSnapshots[1].id);
  });

  await t.test("POST /api/orders/:id/resnapshot rejects if order status is at or beyond FITTING (409)", async () => {
    const customer = await createTestCustomer("__fitting_cust__");
    await createTestMeasurement(customer.id, 1, [{ fieldKey: "chest", value: 90, unit: "cm" }]);

    const order = await createOrderDirect({
      customerId: customer.id,
      status: "FITTING",
      snapshotValues: [{ fieldKey: "chest", value: 90, unit: "cm" }]
    });

    const res = await fetch(`${baseUrl}/api/orders/${order.id}/resnapshot`, {
      method: "POST"
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error.code, "BUSINESS_RULE_VIOLATION");
  });
});

