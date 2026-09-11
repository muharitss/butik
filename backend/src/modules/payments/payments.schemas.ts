import { z } from "zod";

export const PAYMENT_TYPES = [
  "DP",
  "PARTIAL",
  "FINAL",
  "ADJUSTMENT"
] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format")
});

export type OrderIdParam = z.infer<typeof orderIdParamSchema>;

export const createPaymentSchema = z
  .object({
    type: z.enum(PAYMENT_TYPES),
    amount: z.coerce.number().refine((val) => Number.isFinite(val), {
      message: "Amount must be a valid number"
    }),
    method: z.string().trim().nullable().optional(),
    note: z.string().trim().nullable().optional(),
    reversedPaymentId: z.string().uuid("Invalid reversed payment ID format").nullable().optional()
  })
  .superRefine((data, ctx) => {
    if (data.type !== "ADJUSTMENT") {
      if (data.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Payment amount must be greater than zero for non-adjustment payments",
          path: ["amount"]
        });
      }
    } else {
      if (data.amount === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Adjustment payment amount cannot be zero",
          path: ["amount"]
        });
      }
      if (!data.note || data.note.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Note is required for adjustment payments",
          path: ["note"]
        });
      }
    }
  });

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
