import { Router } from "express";
import { validate } from "../../shared/validation/index.js";
import { dashboardSummaryQuerySchema } from "./dashboard.schemas.js";
import { getDashboardSummaryHandler } from "./dashboard.handlers.js";

const dashboardRouter = Router();

dashboardRouter.get(
  "/summary",
  validate({ query: dashboardSummaryQuerySchema }),
  getDashboardSummaryHandler
);

export { dashboardRouter };
export default dashboardRouter;
