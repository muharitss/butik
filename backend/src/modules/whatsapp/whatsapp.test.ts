import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";

test("WhatsApp Link API integration tests", async (t) => {
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

  // Setup seed customer and garment type
  const customerWithPhone = await prisma.customer.create({
    data: {
      name: "Ibu Dian WhatsApp Test",
      phone: "0812-3456-7890",
      notes: "Test customer with formatted phone"
    }
  });
  createdCustomerIds.push(customerWithPhone.id);

  const customerWithoutPhone = await prisma.customer.create({
    data: {
      name: "Pak Budi No Phone",
      phone: null
    }
  });
  createdCustomerIds.push(customerWithoutPhone.id);

  const garment = await prisma.garmentType.create({
    data: {
      name: `Kebaya Modern WA ${Date.now()}`
    }
  });
  createdGarmentTypeIds.push(garment.id);

  const order1 = await prisma.order.create({
    data: {
      orderNumber: "JF-2026-WA1",
      customerId: customerWithPhone.id,
      status: "CONFIRMED",
      orderDate: new Date("2026-09-11T00:00:00.000Z"),
      deadlineAt: new Date("2026-09-20T00:00:00.000Z"),
      subtotal: "750000.00",
      additionalCost: "0.00",
      expressFee: "0.00",
      discount: "50000.00",
      total: "700000.00",
      paidTotalCache: "300000.00",
      paymentStatusCache: "PARTIAL",
      items: {
        create: [
          {
            garmentTypeId: garment.id,
            quantity: 1,
            unitPrice: "750000.00",
            subtotal: "750000.00",
            notes: "Warna sage green"
          }
        ]
      }
    }
  });
  createdOrderIds.push(order1.id);

  const orderNoPhone = await prisma.order.create({
    data: {
      orderNumber: "JF-2026-WA2",
      customerId: customerWithoutPhone.id,
      status: "CONFIRMED",
      orderDate: new Date("2026-09-11T00:00:00.000Z"),
      deadlineAt: new Date("2026-09-20T00:00:00.000Z"),
      subtotal: "500000.00",
      total: "500000.00",
      paidTotalCache: "0.00",
      paymentStatusCache: "UNPAID"
    }
  });
  createdOrderIds.push(orderNoPhone.id);

  await t.test("Rejects invalid orderId parameter with 400", async () => {
    const res = await fetch(`${baseUrl}/api/orders/not-a-uuid/whatsapp-link?template=confirmation`);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("Returns 404 for non-existent order", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/orders/${fakeId}/whatsapp-link?template=confirmation`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.error.code, "NOT_FOUND");
  });

  await t.test("Rejects invalid template parameter with 400", async () => {
    const res = await fetch(`${baseUrl}/api/orders/${order1.id}/whatsapp-link?template=unknown_tmpl`);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("Rejects missing template parameter with 400", async () => {
    const res = await fetch(`${baseUrl}/api/orders/${order1.id}/whatsapp-link`);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  await t.test("Rejects order when customer has no valid phone with 400", async () => {
    const res = await fetch(`${baseUrl}/api/orders/${orderNoPhone.id}/whatsapp-link?template=confirmation`);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
    assert.match(json.error.message, /phone number/i);
  });

  await t.test("Generates valid WhatsApp link for confirmation template", async () => {
    const res = await fetch(`${baseUrl}/api/orders/${order1.id}/whatsapp-link?template=confirmation`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data);
    assert.ok(json.data.url);
    assert.equal(json.data.phone, "6281234567890"); // normalized 0812 -> 62812
    assert.equal(json.data.template, "confirmation");

    // Check that URL is formed correctly with https://wa.me/
    assert.ok(json.data.url.startsWith("https://wa.me/6281234567890?text="));

    // Decoded URL text should contain order number, customer name, and remaining balance
    const textParam = new URL(json.data.url).searchParams.get("text");
    assert.ok(textParam);
    assert.match(textParam, /Ibu Dian WhatsApp Test/);
    assert.match(textParam, /JF-2026-WA1/);
    assert.match(textParam, /Kebaya Modern WA/);
    assert.match(textParam, /400\.000/); // 700.000 - 300.000 = 400.000 remaining
  });

  await t.test("Generates valid WhatsApp link for ready template", async () => {
    const res = await fetch(`${baseUrl}/api/orders/${order1.id}/whatsapp-link?template=ready`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data);
    assert.ok(json.data.url.startsWith("https://wa.me/6281234567890?text="));
    const textParam = new URL(json.data.url).searchParams.get("text");
    assert.ok(textParam);
    assert.match(textParam, /siap diambil/i);
    assert.match(textParam, /JF-2026-WA1/);
  });

  await t.test("Generates valid WhatsApp link for payment_reminder template", async () => {
    const res = await fetch(`${baseUrl}/api/orders/${order1.id}/whatsapp-link?template=payment_reminder`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data);
    assert.ok(json.data.url.startsWith("https://wa.me/6281234567890?text="));
    const textParam = new URL(json.data.url).searchParams.get("text");
    assert.ok(textParam);
    assert.match(textParam, /tagihan/i);
    assert.match(textParam, /400\.000/);
  });
});
