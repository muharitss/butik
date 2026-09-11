import { Router } from "express";
import {
  validateBody,
  validateParams
} from "../../shared/validation/index.js";
import {
  orderIdParamSchema,
  revisionIdParamSchema,
  createRevisionSchema,
  updateRevisionSchema
} from "./revisions.schemas.js";
import {
  listRevisionsHandler,
  getRevisionHandler,
  createRevisionHandler,
  updateRevisionHandler
} from "./revisions.handlers.js";

const revisionRouter = Router({ mergeParams: true });

// Validate orderId param on all revision routes
revisionRouter.use(validateParams(orderIdParamSchema));

revisionRouter.get("/", listRevisionsHandler);
revisionRouter.get("/:id", validateParams(revisionIdParamSchema), getRevisionHandler);
revisionRouter.post("/", validateBody(createRevisionSchema), createRevisionHandler);
revisionRouter.patch(
  "/:id",
  validateParams(revisionIdParamSchema),
  validateBody(updateRevisionSchema),
  updateRevisionHandler
);

export { revisionRouter };
export default revisionRouter;
