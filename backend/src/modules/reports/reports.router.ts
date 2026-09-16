import { Router } from "express";
import { authorize } from "../../shared/auth/authorize.js";
import { validateQuery } from "../../shared/validation/index.js";
import { reportsSummaryQuerySchema } from "./reports.schemas.js";
import { getReportsSummaryHandler } from "./reports.handlers.js";

const reportsRouter = Router();

reportsRouter.get(
  "/summary",
  authorize("reports:view"),
  validateQuery(reportsSummaryQuerySchema),
  getReportsSummaryHandler
);

export { reportsRouter };
