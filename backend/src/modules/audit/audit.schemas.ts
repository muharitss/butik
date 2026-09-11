import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  entityType: z.string().trim().optional(),
  entityId: z.string().uuid("Invalid entityId format").optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const auditLogQuerySchema = listAuditLogsQuerySchema;
export type ListAuditLogsQueryInput = z.infer<typeof listAuditLogsQuerySchema>;
export type AuditLogQueryInput = ListAuditLogsQueryInput;
