import { Router } from "express";
import {
  validateBody,
  validateParams
} from "../../shared/validation/index.js";
import {
  createOrderSchema,
  replaceOrderItemsSchema,
  orderIdParamSchema,
  transitionOrderSchema
} from "./orders.schemas.js";
import {
  createOrderHandler,
  replaceOrderItemsHandler,
  transitionOrderHandler
} from "./orders.handlers.js";

const orderRouter = Router();

orderRouter.post("/", validateBody(createOrderSchema), createOrderHandler);
orderRouter.patch(
  "/:id/items",
  validateParams(orderIdParamSchema),
  validateBody(replaceOrderItemsSchema),
  replaceOrderItemsHandler
);
orderRouter.post(
  "/:id/transition",
  validateParams(orderIdParamSchema),
  validateBody(transitionOrderSchema),
  transitionOrderHandler
);

export { orderRouter };
export default orderRouter;
