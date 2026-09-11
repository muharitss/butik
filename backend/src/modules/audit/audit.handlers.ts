import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../shared/http/index.js";
import { listAuditLogs } from "./audit.service.js";
import type { ListAuditLogsQueryInput } from "./audit.schemas.js";

/**
 * GET /api/audit-logs
 * Retrieves audit log entries with optional filters and pagination.
 */
export async function listAuditLogsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListAuditLogsQueryInput;
    const { items, total, page, pageSize } = await listAuditLogs(query);
    sendSuccess(res, items, { page, pageSize, total });
  } catch (err) {
    next(err);
  }
}
