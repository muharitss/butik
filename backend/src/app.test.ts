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
});
