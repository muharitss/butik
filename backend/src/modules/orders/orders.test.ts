import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { getAuditLogs, clearAuditLogs } from "../audit/index.js";

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
