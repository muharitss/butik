import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../shared/http/index.js";
import { generateWhatsappLink } from "./whatsapp.service.js";
import type { OrderIdParam, WhatsappQuery } from "./whatsapp.schemas.js";

/**
 * GET /api/orders/:orderId/whatsapp-link?template=confirmation|ready|payment_reminder
 * Returns deep link to open WhatsApp with pre-filled template message.
 */
export async function getWhatsappLinkHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;
    const { template } = req.query as unknown as WhatsappQuery;
    const result = await generateWhatsappLink(orderId, template);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
