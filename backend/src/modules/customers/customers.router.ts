import { Router } from "express";
import {
  validateQuery,
  validateBody,
  validateParams
} from "../../shared/validation/index.js";
import {
  customerIdParamSchema,
  customerQuerySchema,
  createCustomerSchema,
  updateCustomerSchema
} from "./customers.schemas.js";
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from "./customers.handlers.js";

const customerRouter = Router();

customerRouter.get("/", validateQuery(customerQuerySchema), listCustomers);
customerRouter.post("/", validateBody(createCustomerSchema), createCustomer);
customerRouter.get("/:id", validateParams(customerIdParamSchema), getCustomerById);
customerRouter.patch(
  "/:id",
  validateParams(customerIdParamSchema),
  validateBody(updateCustomerSchema),
  updateCustomer
);
customerRouter.delete("/:id", validateParams(customerIdParamSchema), deleteCustomer);

export { customerRouter };
export default customerRouter;
