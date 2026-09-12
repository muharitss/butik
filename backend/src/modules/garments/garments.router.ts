import { Router } from "express";
import {
  validateQuery,
  validateBody,
  validateParams
} from "../../shared/validation/index.js";
import { authorize } from "../../shared/auth/index.js";
import {
  garmentTypeIdParamSchema,
  garmentTypeQuerySchema,
  createGarmentTypeSchema,
  updateGarmentTypeSchema
} from "./garments.schemas.js";
import {
  listGarmentTypes,
  getGarmentTypeById,
  createGarmentType,
  updateGarmentType,
  deactivateGarmentType
} from "./garments.handlers.js";

const garmentRouter = Router();

garmentRouter.get("/", validateQuery(garmentTypeQuerySchema), listGarmentTypes);
garmentRouter.post(
  "/",
  authorize("garments:manage"),
  validateBody(createGarmentTypeSchema),
  createGarmentType
);
garmentRouter.get("/:id", validateParams(garmentTypeIdParamSchema), getGarmentTypeById);
garmentRouter.patch(
  "/:id",
  authorize("garments:manage"),
  validateParams(garmentTypeIdParamSchema),
  validateBody(updateGarmentTypeSchema),
  updateGarmentType
);
garmentRouter.patch(
  "/:id/deactivate",
  authorize("garments:manage"),
  validateParams(garmentTypeIdParamSchema),
  deactivateGarmentType
);


export { garmentRouter };
export default garmentRouter;

