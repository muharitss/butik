import { Router } from "express";
import { validateParams, validateQuery } from "../../shared/validation/index.js";
import { orderIdParamSchema, whatsappQuerySchema } from "./whatsapp.schemas.js";
import { getWhatsappLinkHandler } from "./whatsapp.handlers.js";

const whatsappRouter = Router({ mergeParams: true });

// Validate orderId parameter on all whatsapp routes
whatsappRouter.use(validateParams(orderIdParamSchema));

// GET /api/orders/:orderId/whatsapp-link?template=confirmation|ready|payment_reminder
whatsappRouter.get("/", validateQuery(whatsappQuerySchema), getWhatsappLinkHandler);

export { whatsappRouter };
export default whatsappRouter;
