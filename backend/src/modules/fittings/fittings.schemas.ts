import { z } from "zod";
import {
  FITTING_STATUSES,
  FITTING_RESULTS
} from "./fittings.rules.js";

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format")
}).passthrough();

export type OrderIdParam = z.infer<typeof orderIdParamSchema>;

export const fittingIdParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  id: z.string().uuid("Invalid fitting ID format")
});

export type FittingIdParam = z.infer<typeof fittingIdParamSchema>;

export const createFittingSchema = z.object({
  scheduledAt: z.coerce.date().nullable().optional(),
  notes: z.string().trim().nullable().optional()
});

export type CreateFittingInput = z.infer<typeof createFittingSchema>;

export const updateFittingSchema = z
  .object({
    status: z.enum(FITTING_STATUSES).optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
    occurredAt: z.coerce.date().nullable().optional(),
    result: z.enum(FITTING_RESULTS).nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    nextAction: z.string().trim().nullable().optional()
  })
  .superRefine((data, ctx) => {
    if (data.status === "DONE") {
      if (!data.result) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Result (APPROVED or NEEDS_REVISION) is required when marking fitting as DONE",
          path: ["result"]
        });
      }
      if (!data.occurredAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "occurredAt is required when marking fitting as DONE",
          path: ["occurredAt"]
        });
      }
    }
  });

export type UpdateFittingInput = z.infer<typeof updateFittingSchema>;
