import { Router } from "express";
import {
  validateBody,
  validateParams
} from "../../shared/validation/index.js";
import {
  customerIdParamSchema,
  createMeasurementVersionSchema
} from "./measurements.schemas.js";
import {
  listMeasurements,
  getCurrentMeasurement,
  createMeasurement
} from "./measurements.handlers.js";

const measurementRouter = Router({ mergeParams: true });

// Validate customerId param on all measurement routes
measurementRouter.use(validateParams(customerIdParamSchema));

measurementRouter.get("/current", getCurrentMeasurement);
measurementRouter.get("/", listMeasurements);
measurementRouter.post("/", validateBody(createMeasurementVersionSchema), createMeasurement);

export { measurementRouter };
export default measurementRouter;
