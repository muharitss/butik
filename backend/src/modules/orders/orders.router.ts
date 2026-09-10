import { Router } from "express";
import {
  validateBody,
  validateParams
} from "../../shared/validation/index.js";
import {
  createOrderSchema,
  replaceOrderItemsSchema,
  orderIdParamSchema
} from "./orders.schemas.js";
import {
  createOrderHandler,
  replaceOrderItemsHandler
} from "./orders.handlers.js";

const orderRouter = Router();

orderRouter.post("/", validateBody(createOrderSchema), createOrderHandler);
orderRouter.patch(
  "/:id/items",
  validateParams(orderIdParamSchema),
  validateBody(replaceOrderItemsSchema),
  replaceOrderItemsHandler
);

export { orderRouter };
export default orderRouter;
