import { Router } from "express";
import {
  validateBody,
  validateParams
} from "../../shared/validation/index.js";
import {
  orderIdParamSchema,
  fittingIdParamSchema,
  createFittingSchema,
  updateFittingSchema
} from "./fittings.schemas.js";
import {
  listFittingsHandler,
  getFittingHandler,
  scheduleFittingHandler,
  updateFittingHandler
} from "./fittings.handlers.js";

const fittingRouter = Router({ mergeParams: true });

// Validate orderId param on all fitting routes
fittingRouter.use(validateParams(orderIdParamSchema));

fittingRouter.get("/", listFittingsHandler);
fittingRouter.get("/:id", validateParams(fittingIdParamSchema), getFittingHandler);
fittingRouter.post("/", validateBody(createFittingSchema), scheduleFittingHandler);
fittingRouter.patch(
  "/:id",
  validateParams(fittingIdParamSchema),
  validateBody(updateFittingSchema),
  updateFittingHandler
);

export { fittingRouter };
export default fittingRouter;
