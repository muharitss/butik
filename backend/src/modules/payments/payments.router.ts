import { Router } from "express";
import {
  validateBody,
  validateParams
} from "../../shared/validation/index.js";
import {
  orderIdParamSchema,
  createPaymentSchema
} from "./payments.schemas.js";
import {
  listPaymentsHandler,
  createPaymentHandler
} from "./payments.handlers.js";

const paymentRouter = Router({ mergeParams: true });

// Validate orderId param on all payment routes
paymentRouter.use(validateParams(orderIdParamSchema));

paymentRouter.get("/", listPaymentsHandler);
paymentRouter.post("/", validateBody(createPaymentSchema), createPaymentHandler);

export { paymentRouter };
export default paymentRouter;
