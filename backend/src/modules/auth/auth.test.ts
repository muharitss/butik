import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  parseCookies,
  SESSION_COOKIE_NAME
} from "./auth.service.js";
import { rateLimitLogin, resetLoginRateLimits } from "./auth.middleware.js";

test("Auth Module Unit Tests — Password Hashing, JWT & Cookies", async (t) => {
  await t.test("bcrypt: hashes password with cost factor >= 12 and verifies match", async () => {
    const raw = "SuperSecret123!";
    const hash = await hashPassword(raw);

    assert.ok(hash.startsWith("$2a$12$") || hash.startsWith("$2b$12$"), "Hash must be bcrypt with cost >= 12");
    assert.notEqual(raw, hash);

    const isMatch = await verifyPassword(raw, hash);
    assert.equal(isMatch, true);

    const isWrong = await verifyPassword("WrongPassword123!", hash);
    assert.equal(isWrong, false);
  });

  await t.test("jose: signs and verifies JWT session token with userId and role", async () => {
    const payload = {
      userId: "11111111-2222-3333-4444-555555555555",
      role: "owner"
    };

    const token = await signSessionToken(payload, "1h");
    assert.ok(typeof token === "string" && token.split(".").length === 3);

    const verified = await verifySessionToken(token);
    assert.equal(verified.userId, payload.userId);
    assert.equal(verified.role, payload.role);
  });

  await t.test("cookies: parses standard cookie header correctly", () => {
    const header = `${SESSION_COOKIE_NAME}=abc123token; other_cookie=xyz; trailing=val`;
    const parsed = parseCookies(header);
    assert.equal(parsed[SESSION_COOKIE_NAME], "abc123token");
    assert.equal(parsed.other_cookie, "xyz");
    assert.equal(parsed.trailing, "val");

    assert.deepEqual(parseCookies(undefined), {});
    assert.deepEqual(parseCookies(""), {});
  });
});

test("Auth API Integration Tests — Endpoints, Sessions & Route Protection", async (t) => {
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

  let testActiveUserId = "";
  let testInactiveUserId = "";
  const testEmail = `test_operator_${Date.now()}@jahitflow.com`;
  const testInactiveEmail = `inactive_user_${Date.now()}@jahitflow.com`;
  const testPassword = "ValidTestPassword123!";

  t.before(async () => {
    const hashed = await hashPassword(testPassword);

    const activeUser = await prisma.user.create({
      data: {
        name: "Test Active Operator",
        email: testEmail,
        passwordHash: hashed,
        role: "owner",
        isActive: true
      }
    });
    testActiveUserId = activeUser.id;

    const inactiveUser = await prisma.user.create({
      data: {
        name: "Test Inactive User",
        email: testInactiveEmail,
        passwordHash: hashed,
        role: "tailor",
        isActive: false
      }
    });
    testInactiveUserId = inactiveUser.id;
  });

  t.after(async () => {
    server.close();
    if (testActiveUserId) {
      await prisma.user.deleteMany({ where: { id: testActiveUserId } });
    }
    if (testInactiveUserId) {
      await prisma.user.deleteMany({ where: { id: testInactiveUserId } });
    }
  });

  await t.test("GET /api/health remains accessible without authentication", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { "x-test-unauthenticated": "true" }
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { data: { status: "ok" } });
  });

  await t.test("Protected route: unauthenticated GET /api/customers returns 401 UNAUTHORIZED", async () => {
    const res = await fetch(`${baseUrl}/api/customers`, {
      headers: { "x-test-unauthenticated": "true" }
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.error?.code, "UNAUTHORIZED");
  });

  await t.test("POST /api/auth/login with wrong password returns 401 generic message", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "WrongPassword999!"
      })
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.error?.code, "UNAUTHORIZED");
    assert.equal(json.error?.message, "Invalid email or password");
  });

  await t.test("POST /api/auth/login with non-existent email returns identical 401 generic message", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent_email_12345@jahitflow.com",
        password: "AnyPassword123!"
      })
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.error?.code, "UNAUTHORIZED");
    assert.equal(json.error?.message, "Invalid email or password");
  });

  await t.test("POST /api/auth/login with inactive user returns 401 generic message", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testInactiveEmail,
        password: testPassword
      })
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.error?.code, "UNAUTHORIZED");
    assert.equal(json.error?.message, "Invalid email or password");
  });

  let sessionCookie = "";

  await t.test("POST /api/auth/login with valid credentials returns 200 and sets HttpOnly cookie", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.id, testActiveUserId);
    assert.equal(json.data.name, "Test Active Operator");
    assert.equal(json.data.role, "owner");
    assert.equal(json.data.passwordHash, undefined, "passwordHash must never be returned");

    const rawSetCookie = res.headers.get("set-cookie");
    assert.ok(rawSetCookie, "Response must include Set-Cookie header");
    assert.ok(rawSetCookie.includes(SESSION_COOKIE_NAME), "Cookie must match session cookie name");
    assert.ok(rawSetCookie.toLowerCase().includes("httponly"), "Cookie must be HttpOnly");
    assert.ok(rawSetCookie.toLowerCase().includes("samesite=strict"), "Cookie must be SameSite=Strict");

    // Extract cookie value for subsequent calls
    const match = rawSetCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    assert.ok(match && match[1]);
    sessionCookie = `${SESSION_COOKIE_NAME}=${match[1]}`;
  });

  await t.test("GET /api/auth/me with valid session cookie returns authenticated user profile", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie }
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.id, testActiveUserId);
    assert.equal(json.data.name, "Test Active Operator");
    assert.equal(json.data.email, testEmail);
    assert.equal(json.data.role, "owner");
    assert.equal(json.data.isActive, true);
    assert.equal(json.data.passwordHash, undefined, "passwordHash must not appear in me response");
  });

  await t.test("POST /api/auth/logout clears session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: sessionCookie }
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { data: { loggedOut: true } });

    const rawSetCookie = res.headers.get("set-cookie");
    assert.ok(rawSetCookie, "Response must include Set-Cookie to clear session");
    assert.ok(
      rawSetCookie.includes(`${SESSION_COOKIE_NAME}=;`) || rawSetCookie.includes("Max-Age=0") || rawSetCookie.includes("expires="),
      "Cookie must be cleared"
    );
  });

  await t.test("After logout, GET /api/auth/me returns 401 UNAUTHORIZED", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { "x-test-unauthenticated": "true" }
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.error?.code, "UNAUTHORIZED");
  });

  await t.test("Login rate limiter: blocks excessive login attempts returning 429", async () => {
    resetLoginRateLimits();
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production"; // enable rate limiter enforcement

    try {
      const limiter = rateLimitLogin({ max: 2, windowMs: 60000 });
      let statusCalled: number | null = null;
      let nextCalled = 0;

      const mockReq = {
        method: "POST",
        headers: {},
        ip: "203.0.113.195",
        socket: {}
      } as unknown as import("express").Request;

      const mockRes = {
        setHeader: () => {},
        status: (code: number) => {
          statusCalled = code;
          return mockRes;
        },
        json: () => {}
      } as unknown as import("express").Response;

      const mockNext = () => {
        nextCalled++;
      };

      // 1st request -> pass
      limiter(mockReq, mockRes, mockNext);
      assert.equal(nextCalled, 1);

      // 2nd request -> pass
      limiter(mockReq, mockRes, mockNext);
      assert.equal(nextCalled, 2);

      // 3rd request -> blocked (429)
      limiter(mockReq, mockRes, mockNext);
      assert.equal(nextCalled, 2);
      assert.equal(statusCalled, 429);
    } finally {
      process.env.NODE_ENV = originalEnv;
      resetLoginRateLimits();
    }
  });
});
