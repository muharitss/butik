import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";

test("Receipt API integration tests", async (t) => {
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

    if (createdOrderIds.length > 0) {
      await prisma.payment.deleteMany({
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

    if (createdGarmentTypeIds.length > 0) {
      await prisma.garmentMeasurementField.deleteMany({
        where: { garmentTypeId: { in: createdGarmentTypeIds } }
      });
      await prisma.garmentType.deleteMany({
        where: { id: { in: createdGarmentTypeIds } }
      });
    }
  });

  await t.test("Rejects invalid orderId parameter with 400", async () => {
    const res = await fetch(`${baseUrl}/api/orders/invalid-uuid-format/receipt`);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("Returns 404 for non-existent order", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/orders/${fakeId}/receipt`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error.code, "NOT_FOUND");
  });

  await t.test("Returns 200 with complete receipt DTO for an order", async () => {
    // 1. Create customer
    const customer = await prisma.customer.create({
      data: {
        name: "Ibu Kartika",
        phone: "081298765432",
        email: "kartika@example.com",
        address: "Jl. Mawar No. 45, Jakarta"
      }
    });
    createdCustomerIds.push(customer.id);

    // 2. Create garment type
    const garmentType = await prisma.garmentType.create({
      data: {
        name: `Kebaya Modern Test ${Date.now()}`,
        description: "Kebaya pesta custom"
      }
    });
    createdGarmentTypeIds.push(garmentType.id);

    // 3. Create order with items
    const orderNumber = `JF-TEST-${Date.now().toString().slice(-4)}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status: "CONFIRMED",
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subtotal: 750000,
        additionalCost: 50000,
        expressFee: 25000,
        discount: 25000,
        total: 800000,
        paidTotalCache: 400000,
        paymentStatusCache: "PARTIAL",
        notes: "Mohon payet warna emas muda",
        items: {
          create: [
            {
              garmentTypeId: garmentType.id,
              quantity: 1,
              unitPrice: 750000,
              subtotal: 750000,
              notes: "Ukuran pas badan"
            }
          ]
        },
        payments: {
          create: [
            {
              type: "DP",
              amount: 400000,
              method: "TRANSFER",
              note: "DP 50% via BCA"
            }
          ]
        }
      }
    });
    createdOrderIds.push(order.id);

    // 4. Request receipt
    const res = await fetch(`${baseUrl}/api/orders/${order.id}/receipt`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.data);
    const receipt = json.data;

    // Boutique validation
    assert.ok(receipt.boutique);
    assert.ok(receipt.boutique.name);
    assert.ok(receipt.boutique.address);

    // Order header validation
    assert.equal(receipt.orderId, order.id);
    assert.equal(receipt.orderNumber, orderNumber);
    assert.equal(receipt.status, "CONFIRMED");
    assert.equal(receipt.notes, "Mohon payet warna emas muda");
    assert.ok(receipt.orderDate);
    assert.ok(receipt.deadlineAt);
    assert.ok(receipt.generatedAt);

    // Customer validation
    assert.equal(receipt.customer.name, "Ibu Kartika");
    assert.equal(receipt.customer.phone, "081298765432");
    assert.equal(receipt.customer.address, "Jl. Mawar No. 45, Jakarta");

    // Items validation
    assert.equal(receipt.items.length, 1);
    assert.equal(receipt.items[0].garmentTypeName, garmentType.name);
    assert.equal(receipt.items[0].quantity, 1);
    assert.equal(receipt.items[0].unitPrice, "750000.00");
    assert.equal(receipt.items[0].subtotal, "750000.00");
    assert.equal(receipt.items[0].notes, "Ukuran pas badan");

    // Totals validation
    assert.equal(receipt.totals.subtotal, "750000.00");
    assert.equal(receipt.totals.additionalCost, "50000.00");
    assert.equal(receipt.totals.expressFee, "25000.00");
    assert.equal(receipt.totals.discount, "25000.00");
    assert.equal(receipt.totals.total, "800000.00");

    // Payments summary & remaining balance validation
    assert.equal(receipt.paymentsSummary.paidTotal, "400000.00");
    assert.equal(receipt.paymentsSummary.remainingBalance, "400000.00");
    assert.equal(receipt.paymentsSummary.paymentStatus, "PARTIAL");
    assert.equal(receipt.paymentsSummary.payments.length, 1);
    assert.equal(receipt.paymentsSummary.payments[0].type, "DP");
    assert.equal(receipt.paymentsSummary.payments[0].amount, "400000.00");
    assert.equal(receipt.paymentsSummary.payments[0].method, "TRANSFER");
  });
});
