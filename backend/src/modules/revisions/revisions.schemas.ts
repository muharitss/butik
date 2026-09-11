import { z } from "zod";
import { REVISION_STATUSES } from "./revisions.rules.js";

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format")
}).passthrough();

export type OrderIdParam = z.infer<typeof orderIdParamSchema>;

export const revisionIdParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  id: z.string().uuid("Invalid revision ID format")
});

export type RevisionIdParam = z.infer<typeof revisionIdParamSchema>;

export const createRevisionSchema = z.object({
  fittingId: z.string().uuid("Invalid fitting ID format").nullable().optional(),
  issue: z.string().trim().min(1, "Issue description is required"),
  requestedChange: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional()
});

export type CreateRevisionInput = z.infer<typeof createRevisionSchema>;

export const updateRevisionSchema = z.object({
  status: z.enum(REVISION_STATUSES).optional(),
  notes: z.string().trim().nullable().optional(),
  requestedChange: z.string().trim().nullable().optional(),
  resolvedAt: z.coerce.date().nullable().optional()
});

export type UpdateRevisionInput = z.infer<typeof updateRevisionSchema>;
