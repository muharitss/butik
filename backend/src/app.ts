import express from "express";
import cors from "cors";
import { z } from "zod";
import { sendSuccess } from "./shared/http/index.js";
import { errorHandler } from "./shared/errors/index.js";
import { validate } from "./shared/validation/index.js";
import { toMoney, add, formatMoney } from "./shared/money/index.js";

import { customerRouter } from "./modules/customers/index.js";
import { garmentRouter } from "./modules/garments/index.js";
import { measurementRouter } from "./modules/measurements/index.js";
import { orderRouter } from "./modules/orders/index.js";
import { paymentRouter } from "./modules/payments/index.js";
import { fittingRouter } from "./modules/fittings/index.js";
import { revisionRouter } from "./modules/revisions/index.js";
import { attachmentRouter } from "./modules/attachments/index.js";
import { auditRouter } from "./modules/audit/index.js";
import { dashboardRouter } from "./modules/dashboard/index.js";
import { calendarRouter } from "./modules/calendar/index.js";
import { receiptRouter } from "./modules/receipts/index.js";
import { whatsappRouter } from "./modules/whatsapp/index.js";
import { authRouter, authenticate } from "./modules/auth/index.js";

import { requestLogger } from "./shared/logger/index.js";
import { rateLimitWrites } from "./shared/middleware/rateLimiter.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actorId?: string | null;
      userRole?: string | null;
    }
  }
}

const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.execArgv.includes("--test") ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  process.argv.some((arg) => arg.includes(".test.ts") || arg.includes(".test.js"));

if (isTestEnv) {
  await import("./shared/test/testSetup.js");
}

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error(`CORS error: Origin ${origin} not allowed`));
      }
    },
    credentials: true
  })
);

app.use(express.json());
app.use(requestLogger);
app.use(rateLimitWrites());

// Global authentication middleware with explicit exclusions
app.use((req, res, next) => {
  if (
    req.path === "/api/health" ||
    (req.path === "/api/auth/login" && req.method.toUpperCase() === "POST") ||
    req.path.startsWith("/api/test/")
  ) {
    return next();
  }
  return authenticate(req, res, next);
});

app.get("/api/health", (_req, res) => {
  sendSuccess(res, { status: "ok" });
});

app.use("/api/auth", authRouter);

// Example route demonstrating shared validation, error handling, and money helpers
const testCalculationSchema = z.object({
  amount: z.coerce.number().positive(),
  adjustment: z.coerce.number().default(0)
});

app.post("/api/test/validation", validate({ body: testCalculationSchema }), (req, res) => {
  const { amount, adjustment } = req.body;
  const total = add(amount, adjustment);
  sendSuccess(res, {
    amount: formatMoney(toMoney(amount)),
    adjustment: formatMoney(toMoney(adjustment)),
    total: formatMoney(total)
  });
});

app.use("/api/customers/:customerId/measurements", measurementRouter);
app.use("/api/customers", customerRouter);
app.use("/api/garment-types", garmentRouter);
app.use("/api/orders/:orderId/payments", paymentRouter);
app.use("/api/orders/:orderId/fittings", fittingRouter);
app.use("/api/orders/:orderId/revisions", revisionRouter);
app.use("/api/orders/:orderId/attachments", attachmentRouter);
app.use("/api/orders/:orderId/receipt", receiptRouter);
app.use("/api/orders/:orderId/whatsapp-link", whatsappRouter);
app.use("/api/audit-logs", auditRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/orders", orderRouter);

app.use(errorHandler);

export default app;
export { app };
