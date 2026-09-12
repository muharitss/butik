import { Router } from "express";
import { validate } from "../../shared/validation/index.js";
import { authorize } from "../../shared/auth/index.js";
import { auditLogQuerySchema } from "./audit.schemas.js";
import { listAuditLogsHandler } from "./audit.handlers.js";

const auditRouter = Router();

auditRouter.get(
  "/",
  authorize("audit:view"),
  validate({ query: auditLogQuerySchema }),
  listAuditLogsHandler
);


export { auditRouter };
export default auditRouter;

