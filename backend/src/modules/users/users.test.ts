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

test("Users Module & Auth Password Integration Tests", async (t) => {
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

  const ownerEmail = `owner_mgmt_${Date.now()}@jahitflow.com`;
  const staffEmail = `staff_mgmt_${Date.now()}@jahitflow.com`;
  const initialPassword = "InitialPassword123!";

  t.before(async () => {
    const hashed = await hashPassword(initialPassword);

    const owner = await prisma.user.create({
      data: {
        name: "Boutique Owner",
        email: ownerEmail,
        phone: "081234567890",
        passwordHash: hashed,
        role: "owner",
        isActive: true
      }
    });
    ownerUserId = owner.id;

    const staff = await prisma.user.create({
      data: {
        name: "Staff Member",
        email: staffEmail,
        phone: "081298765432",
        passwordHash: hashed,
        role: "staff",
        isActive: true
      }
    });
    staffUserId = staff.id;

    const ownerToken = await signSessionToken(
      { userId: owner.id, role: "owner" },
      "1h"
    );
    ownerCookie = `${SESSION_COOKIE_NAME}=${ownerToken}`;

    const staffToken = await signSessionToken(
      { userId: staff.id, role: "staff" },
      "1h"
    );
    staffCookie = `${SESSION_COOKIE_NAME}=${staffToken}`;
  });

  t.after(async () => {
    server.close();
    // Clean up created test users
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "_mgmt_"
        }
      }
    });
  });

  await t.test("RBAC: Staff requesting GET /api/users receives 403 FORBIDDEN", async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      headers: { Cookie: staffCookie }
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.error?.code, "FORBIDDEN");
  });

  await t.test("Owner: GET /api/users returns list of users without passwordHash", async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      headers: { Cookie: ownerCookie }
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 2);

    for (const u of json.data) {
      assert.ok(u.id);
      assert.ok(u.name);
      assert.ok(u.role);
      assert.equal(typeof u.isActive, "boolean");
      assert.equal((u as Record<string, unknown>).passwordHash, undefined);
    }
  });

  let createdStaffId = "";
  const newStaffEmail = `new_staff_mgmt_${Date.now()}@jahitflow.com`;
  const temporaryPassword = "TempPassword123!";

  await t.test("Owner: POST /api/users creates a new staff user with temporary password", async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: ownerCookie
      },
      body: JSON.stringify({
        name: "Newly Hired Tailor",
        email: newStaffEmail,
        phone: "08111222333",
        role: "staff",
        temporaryPassword
      })
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.ok(json.data.id);
    assert.equal(json.data.name, "Newly Hired Tailor");
    assert.equal(json.data.email, newStaffEmail);
    assert.equal(json.data.role, "staff");
    assert.equal(json.data.isActive, true);
    assert.equal((json.data as Record<string, unknown>).passwordHash, undefined);
    createdStaffId = json.data.id;
  });

  await t.test("New staff user can log in with temporary password", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newStaffEmail,
        password: temporaryPassword
      })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.id, createdStaffId);
    assert.equal(json.data.role, "staff");
  });

  await t.test("Owner: PATCH /api/users/:id updates user details", async () => {
    const res = await fetch(`${baseUrl}/api/users/${createdStaffId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: ownerCookie
      },
      body: JSON.stringify({
        name: "Senior Tailor",
        phone: "08999888777"
      })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.name, "Senior Tailor");
    assert.equal(json.data.phone, "08999888777");
    assert.equal((json.data as Record<string, unknown>).passwordHash, undefined);
  });

  await t.test("Owner attempting to deactivate themselves receives 409 CONFLICT", async () => {
    const res = await fetch(`${baseUrl}/api/users/${ownerUserId}/deactivate`, {
      method: "PATCH",
      headers: { Cookie: ownerCookie }
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.error?.code, "CONFLICT");
    assert.match(json.error?.message, /Cannot deactivate your own account/i);
  });

  await t.test("Owner: PATCH /api/users/:id/deactivate deactivates a staff member", async () => {
    const res = await fetch(`${baseUrl}/api/users/${createdStaffId}/deactivate`, {
      method: "PATCH",
      headers: { Cookie: ownerCookie }
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.isActive, false);
    assert.equal((json.data as Record<string, unknown>).passwordHash, undefined);
  });

  await t.test("Deactivated user receives 401 on next login attempt", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newStaffEmail,
        password: temporaryPassword
      })
    });

    assert.equal(res.status, 401);
  });

  await t.test("Owner: PATCH /api/users/:id/activate reactivates a staff member", async () => {
    const res = await fetch(`${baseUrl}/api/users/${createdStaffId}/activate`, {
      method: "PATCH",
      headers: { Cookie: ownerCookie }
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.isActive, true);
  });

  const resetPasswordValue = "NewForcedPassword456!";
  await t.test("Owner: PATCH /api/users/:id/password resets another user's password without current password", async () => {
    const res = await fetch(`${baseUrl}/api/users/${createdStaffId}/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: ownerCookie
      },
      body: JSON.stringify({
        newPassword: resetPasswordValue
      })
    });

    assert.equal(res.status, 200);

    // Old temporary password no longer works
    const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newStaffEmail,
        password: temporaryPassword
      })
    });
    assert.equal(oldLogin.status, 401);

    // New password works
    const newLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newStaffEmail,
        password: resetPasswordValue
      })
    });
    assert.equal(newLogin.status, 200);
  });

  await t.test("Self-service: PATCH /api/auth/password with wrong current password returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/auth/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie
      },
      body: JSON.stringify({
        currentPassword: "IncorrectPassword123!",
        newPassword: "BrandNewStaffPassword789!"
      })
    });

    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.error?.code, "UNAUTHORIZED");
  });

  const changedStaffPassword = "BrandNewStaffPassword789!";
  await t.test("Self-service: PATCH /api/auth/password with correct current password succeeds", async () => {
    const res = await fetch(`${baseUrl}/api/auth/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie
      },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword: changedStaffPassword
      })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.match(json.data?.message, /Password changed successfully/i);

    // Verify login with new password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: staffEmail,
        password: changedStaffPassword
      })
    });
    assert.equal(loginRes.status, 200);
  });
});
