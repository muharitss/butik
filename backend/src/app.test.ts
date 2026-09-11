import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "./app.js";

test("express app integration routes", async (t) => {
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

  t.after(() => {
    server.close();
  });

  await t.test("GET /api/health responds with status ok envelope", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json, { data: { status: "ok" } });
  });

  await t.test(
    "POST /api/test/validation with invalid payload returns 400 VALIDATION_ERROR envelope",
    async () => {
      const res = await fetch(`${baseUrl}/api/test/validation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: "invalid-amount" })
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error?.code, "VALIDATION_ERROR");
      assert.equal(json.error?.message, "Validation failed");
      assert.ok(Array.isArray(json.error?.details));
      assert.equal(json.error?.details?.[0]?.field, "amount");
    }
  );

  await t.test(
    "POST /api/test/validation with valid payload returns 200 and decimal-computed total",
    async () => {
      const res = await fetch(`${baseUrl}/api/test/validation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 150000.5, adjustment: 24999.5 })
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.deepEqual(json, {
        data: {
          amount: "150000.50",
          adjustment: "24999.50",
          total: "175000.00"
        }
      });
    }
  );

  await t.test("CORS allows configured origin and includes CORS headers", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: "http://localhost:5173" }
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
  });

  await t.test("Logger sanitizes sensitive keys and secrets", async () => {
    const { sanitizeMeta } = await import("./shared/logger/index.js");
    const sample = {
      password: "supersecretpassword",
      apiKey: "secret_123",
      authorization: "Bearer sensitive_token",
      customer: {
        name: "Test User",
        token: "nested_token"
      }
    };
    const sanitized = sanitizeMeta(sample) as Record<string, unknown>;
    assert.equal(sanitized.password, "[REDACTED]");
    assert.equal(sanitized.apiKey, "[REDACTED]");
    assert.equal(sanitized.authorization, "[REDACTED]");
    assert.equal((sanitized.customer as Record<string, unknown>).name, "Test User");
    assert.equal((sanitized.customer as Record<string, unknown>).token, "[REDACTED]");
  });

  await t.test("Rate limiter middleware blocks excessive write requests when active", async () => {
    const { rateLimitWrites, resetRateLimits } = await import("./shared/middleware/rateLimiter.js");
    resetRateLimits();

    // Create a mini limiter with max 2 requests
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production"; // temporarily enable enforcement

    try {
      const limiter = rateLimitWrites({ max: 2, windowMs: 60000 });
      let statusCalled: number | null = null;
      let nextCalled = 0;

      const mockReq = {
        method: "POST",
        headers: {},
        ip: "192.168.1.100",
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
      resetRateLimits();
    }
  });
});
