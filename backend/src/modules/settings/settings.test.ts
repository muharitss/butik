import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import {
  hashPassword,
  signSessionToken,
  SESSION_COOKIE_NAME
} from "../auth/auth.service.js";

test("Store Settings Module Integration Tests", async (t) => {
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

  let ownerUserId = "";
  let staffUserId = "";
  let ownerCookie = "";
  let staffCookie = "";

  const ownerEmail = `settings_owner_${Date.now()}@jahitflow.com`;
  const staffEmail = `settings_staff_${Date.now()}@jahitflow.com`;
  const initialPassword = "SettingsPassword123!";

  t.before(async () => {
    const hashed = await hashPassword(initialPassword);

    const owner = await prisma.user.create({
      data: {
        name: "Settings Owner",
        email: ownerEmail,
        phone: "081234567801",
        passwordHash: hashed,
        role: "owner",
        isActive: true
      }
    });
    ownerUserId = owner.id;

    const staff = await prisma.user.create({
      data: {
        name: "Settings Staff",
        email: staffEmail,
        phone: "081234567802",
        passwordHash: hashed,
        role: "staff",
        isActive: true
      }
    });
    staffUserId = staff.id;

    const ownerToken = await signSessionToken({
      userId: owner.id,
      role: owner.role
    });
    ownerCookie = `${SESSION_COOKIE_NAME}=${ownerToken}`;

    const staffToken = await signSessionToken({
      userId: staff.id,
      role: staff.role
    });
    staffCookie = `${SESSION_COOKIE_NAME}=${staffToken}`;
  });

  t.after(async () => {
    await prisma.auditLog.deleteMany({
      where: { entityType: "store_settings" }
    });
    if (staffUserId) {
      await prisma.user.delete({ where: { id: staffUserId } }).catch(() => {});
    }
    if (ownerUserId) {
      await prisma.user.delete({ where: { id: ownerUserId } }).catch(() => {});
    }
    server.close();
  });

  await t.test("GET /api/settings - unauthenticated returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      headers: { "x-test-unauthenticated": "true" }
    });
    assert.equal(res.status, 401);
  });

  await t.test("GET /api/settings - authenticated staff gets settings", async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      headers: { Cookie: staffCookie }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data);
    assert.ok(body.data.name);
    assert.ok("receiptFooter" in body.data);
  });

  await t.test("PATCH /api/settings - staff forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      method: "PATCH",
      headers: {
        Cookie: staffCookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Hacked Boutique"
      })
    });
    assert.equal(res.status, 403);
  });

  await t.test("PATCH /api/settings - invalid payload returns 400 validation error", async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      method: "PATCH",
      headers: {
        Cookie: ownerCookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "" // empty string fails min(1)
      })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error?.code, "VALIDATION_ERROR");
  });

  await t.test("PATCH /api/settings - owner successfully updates settings and creates audit log", async () => {
    const updatePayload = {
      name: "Atelier Haute Couture Test",
      tagline: "Finest Stitches & Tailoring",
      address: "Jl. Sudirman No. 45, Jakarta",
      phone: "081122334455",
      whatsappPhone: "6281122334455",
      email: "atelier@couture.com",
      receiptFooter: "Thank you for trusting Atelier Haute Couture!"
    };

    const res = await fetch(`${baseUrl}/api/settings`, {
      method: "PATCH",
      headers: {
        Cookie: ownerCookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatePayload)
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.name, updatePayload.name);
    assert.equal(body.data.tagline, updatePayload.tagline);
    assert.equal(body.data.address, updatePayload.address);
    assert.equal(body.data.phone, updatePayload.phone);
    assert.equal(body.data.whatsappPhone, updatePayload.whatsappPhone);
    assert.equal(body.data.email, updatePayload.email);
    assert.equal(body.data.receiptFooter, updatePayload.receiptFooter);

    // Verify Audit Log
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "store_settings",
        entityId: "default",
        action: "update"
      },
      orderBy: { createdAt: "desc" }
    });

    assert.ok(audit);
    assert.equal(audit.actorId, ownerUserId);
    const after = audit.after as { name: string };
    assert.equal(after.name, updatePayload.name);
  });

  await t.test("GET /api/settings - reflects updated settings", async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      headers: { Cookie: ownerCookie }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.name, "Atelier Haute Couture Test");
  });

  await t.test("Dynamic Integration: Receipt DTO & WhatsApp link reflect updated store settings immediately", async () => {
    // 1. Create temporary customer, garment type, and order
    const customer = await prisma.customer.create({
      data: {
        name: "Settings Integration Customer",
        phone: "081299887766"
      }
    });

    const garmentType = await prisma.garmentType.create({
      data: {
        name: `Gaun Pesta Test ${Date.now()}`
      }
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `JF-SETT-${Date.now().toString().slice(-4)}`,
        customerId: customer.id,
        status: "CONFIRMED",
        subtotal: 1500000,
        additionalCost: 0,
        expressFee: 0,
        discount: 0,
        total: 1500000,
        paidTotalCache: 0,
        paymentStatusCache: "UNPAID",
        deadlineAt: new Date(Date.now() + 7 * 86400000),
        items: {
          create: [
            {
              garmentTypeId: garmentType.id,
              quantity: 1,
              unitPrice: 1500000,
              subtotal: 1500000
            }
          ]
        }
      }
    });

    try {
      // 2. Fetch receipt - should match current settings ("Atelier Haute Couture Test")
      const receiptRes1 = await fetch(`${baseUrl}/api/orders/${order.id}/receipt`, {
        headers: { Cookie: ownerCookie }
      });
      assert.equal(receiptRes1.status, 200);
      const receiptBody1 = await receiptRes1.json();
      assert.equal(receiptBody1.data.boutique.name, "Atelier Haute Couture Test");
      assert.equal(receiptBody1.data.boutique.phone, "081122334455");

      // 3. Update settings via PATCH /api/settings to "Butik Sari Modiste"
      const updateRes = await fetch(`${baseUrl}/api/settings`, {
        method: "PATCH",
        headers: {
          Cookie: ownerCookie,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Butik Sari Modiste",
          phone: "085566778899",
          whatsappPhone: "6285566778899"
        })
      });
      assert.equal(updateRes.status, 200);

      // 4. Fetch receipt again - should immediately reflect "Butik Sari Modiste" without server restart
      const receiptRes2 = await fetch(`${baseUrl}/api/orders/${order.id}/receipt`, {
        headers: { Cookie: ownerCookie }
      });
      assert.equal(receiptRes2.status, 200);
      const receiptBody2 = await receiptRes2.json();
      assert.equal(receiptBody2.data.boutique.name, "Butik Sari Modiste");
      assert.equal(receiptBody2.data.boutique.phone, "085566778899");

      // 5. Check WhatsApp link endpoint
      const waRes = await fetch(
        `${baseUrl}/api/orders/${order.id}/whatsapp-link?template=confirmation`,
        {
          headers: { Cookie: ownerCookie }
        }
      );
      assert.equal(waRes.status, 200);
      const waBody = await waRes.json();
      assert.ok(waBody.data.url.includes(encodeURIComponent("Butik Sari Modiste")));
    } finally {
      // Clean up test order, customer, garment type
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
      await prisma.garmentType.delete({ where: { id: garmentType.id } });
      await prisma.customer.delete({ where: { id: customer.id } });
    }
  });
});
