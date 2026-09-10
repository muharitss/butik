import express from "express";
import cors from "cors";
import { z } from "zod";
import { sendSuccess } from "./shared/http/index.js";
import { errorHandler } from "./shared/errors/index.js";
import { validate } from "./shared/validation/index.js";
import { toMoney, add, formatMoney } from "./shared/money/index.js";

import { customerRouter } from "./modules/customers/index.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  sendSuccess(res, { status: "ok" });
});

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

app.use("/api/customers", customerRouter);

app.use(errorHandler);

export default app;
export { app };
