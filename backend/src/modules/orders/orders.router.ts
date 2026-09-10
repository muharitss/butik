import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery
} from "../../shared/validation/index.js";
import {
  createOrderSchema,
  replaceOrderItemsSchema,
  orderIdParamSchema,
  transitionOrderSchema,
  listOrdersQuerySchema,
  updateOrderSchema
} from "./orders.schemas.js";
import {
  createOrderHandler,
  replaceOrderItemsHandler,
  transitionOrderHandler,
  listOrdersHandler,
  getOrderByIdHandler,
  updateOrderHandler,
  resnapshotOrderHandler
} from "./orders.handlers.js";

const orderRouter = Router();

orderRouter.get("/", validateQuery(listOrdersQuerySchema), listOrdersHandler);
orderRouter.get("/:id", validateParams(orderIdParamSchema), getOrderByIdHandler);
orderRouter.post("/", validateBody(createOrderSchema), createOrderHandler);
orderRouter.patch(
  "/:id",
  validateParams(orderIdParamSchema),
  validateBody(updateOrderSchema),
  updateOrderHandler
);
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
orderRouter.post(
  "/:id/resnapshot",
  validateParams(orderIdParamSchema),
  resnapshotOrderHandler
);

export { orderRouter };
export default orderRouter;
