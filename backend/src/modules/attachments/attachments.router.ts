import { Router } from "express";
import {
  validateBody,
  validateParams
} from "../../shared/validation/index.js";
import {
  orderIdParamSchema,
  attachmentIdParamSchema,
  createAttachmentSchema
} from "./attachments.schemas.js";
import {
  getUploadSignatureHandler,
  createAttachmentHandler,
  listAttachmentsHandler,
  deleteAttachmentHandler
} from "./attachments.handlers.js";

const attachmentRouter = Router({ mergeParams: true });

// Validate orderId param on all attachment routes
attachmentRouter.use(validateParams(orderIdParamSchema));

attachmentRouter.post("/upload-signature", getUploadSignatureHandler);
attachmentRouter.post(
  "/",
  validateBody(createAttachmentSchema),
  createAttachmentHandler
);
attachmentRouter.get("/", listAttachmentsHandler);
attachmentRouter.delete(
  "/:id",
  validateParams(attachmentIdParamSchema),
  deleteAttachmentHandler
);

export { attachmentRouter };
export default attachmentRouter;
