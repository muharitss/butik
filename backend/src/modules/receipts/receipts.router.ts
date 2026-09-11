import { Router } from "express";
import { validateParams } from "../../shared/validation/index.js";
import { orderIdParamSchema } from "./receipts.schemas.js";
import { getOrderReceiptHandler } from "./receipts.handlers.js";

const receiptRouter = Router({ mergeParams: true });

// Validate orderId param on all receipt routes
receiptRouter.use(validateParams(orderIdParamSchema));

receiptRouter.get("/", getOrderReceiptHandler);

export { receiptRouter };
export default receiptRouter;
