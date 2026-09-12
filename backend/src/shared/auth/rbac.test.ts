import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { signSessionToken, SESSION_COOKIE_NAME } from "../../modules/auth/auth.service.js";
import { hasPermission, PERMISSIONS } from "./permissions.js";

test("RBAC Permissions Map — Unit Tests", (t) => {
  assert.equal(hasPermission("owner", "customers:delete"), true);
  assert.equal(hasPermission("staff", "customers:delete"), false);

  assert.equal(hasPermission("owner", "garments:manage"), true);
  assert.equal(hasPermission("staff", "garments:manage"), false);

  assert.equal(hasPermission("owner", "audit:view"), true);
  assert.equal(hasPermission("staff", "audit:view"), false);

  assert.equal(hasPermission("owner", "orders:create"), true);
  assert.equal(hasPermission("staff", "orders:create"), true);

  assert.equal(hasPermission(null, "customers:delete"), false);
  assert.equal(hasPermission(undefined, "customers:delete"), false);
  assert.equal(hasPermission("staff", "unknown:permission"), false);
});

test("RBAC Endpoint Authorization — Integration Tests", async (t) => {
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

  let staffUserId = "";
  let ownerUserId = "";
  let staffCookie = "";
  let ownerCookie = "";

  t.before(async () => {
    const staff = await prisma.user.create({
      data: {
        name: "Test Staff Member",
        email: `staff_${Date.now()}@jahitflow.com`,
        role: "staff",
        isActive: true
      }
    });
    staffUserId = staff.id;

    const owner = await prisma.user.create({
      data: {
        name: "Test Owner Member",
        email: `owner_${Date.now()}@jahitflow.com`,
        role: "owner",
        isActive: true
      }
    });
    ownerUserId = owner.id;

    const staffToken = await signSessionToken({ userId: staff.id, role: "staff" }, "1h");
    staffCookie = `${SESSION_COOKIE_NAME}=${staffToken}`;

    const ownerToken = await signSessionToken({ userId: owner.id, role: "owner" }, "1h");
    ownerCookie = `${SESSION_COOKIE_NAME}=${ownerToken}`;
  });

  t.after(async () => {
    server.close();
    if (staffUserId) {
      await prisma.user.deleteMany({ where: { id: staffUserId } });
    }
    if (ownerUserId) {
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
  });

  await t.test("Staff: DELETE /api/customers/:id returns 403 FORBIDDEN", async () => {
    const dummyId = crypto.randomUUID();
    const res = await fetch(`${baseUrl}/api/customers/${dummyId}`, {
      method: "DELETE",
      headers: { Cookie: staffCookie }
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.error?.code, "FORBIDDEN");
    assert.equal(json.error?.message, "Forbidden: insufficient permissions");
  });

  await t.test("Staff: POST /api/garment-types returns 403 FORBIDDEN", async () => {
    const res = await fetch(`${baseUrl}/api/garment-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie
      },
      body: JSON.stringify({
        name: "Unauthorized Garment",
        measurementFields: []
      })
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.error?.code, "FORBIDDEN");
  });

  await t.test("Staff: PATCH /api/garment-types/:id returns 403 FORBIDDEN", async () => {
    const dummyId = crypto.randomUUID();
    const res = await fetch(`${baseUrl}/api/garment-types/${dummyId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie
      },
      body: JSON.stringify({ name: "Updated Name" })
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.error?.code, "FORBIDDEN");
  });

  await t.test("Staff: PATCH /api/garment-types/:id/deactivate returns 403 FORBIDDEN", async () => {
    const dummyId = crypto.randomUUID();
    const res = await fetch(`${baseUrl}/api/garment-types/${dummyId}/deactivate`, {
      method: "PATCH",
      headers: { Cookie: staffCookie }
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.error?.code, "FORBIDDEN");
  });


  await t.test("Staff: GET /api/audit-logs returns 403 FORBIDDEN", async () => {
    const res = await fetch(`${baseUrl}/api/audit-logs`, {
      headers: { Cookie: staffCookie }
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.error?.code, "FORBIDDEN");
  });

  await t.test("Owner: GET /api/audit-logs succeeds with 200 OK", async () => {
    const res = await fetch(`${baseUrl}/api/audit-logs`, {
      headers: { Cookie: ownerCookie }
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data));
  });

  await t.test("Staff: GET /api/customers succeeds (staff has read permissions)", async () => {
    const res = await fetch(`${baseUrl}/api/customers`, {
      headers: { Cookie: staffCookie }
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data));
  });
});
