import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../shared/http/index.js";
import { getOrderReceipt } from "./receipts.service.js";
import type { OrderIdParam } from "./receipts.schemas.js";

/**
 * GET /api/orders/:orderId/receipt
 * Returns a receipt-ready DTO for printable view.
 */
export async function getOrderReceiptHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;
    const receipt = await getOrderReceipt(orderId);
    sendSuccess(res, receipt);
  } catch (err) {
    next(err);
  }
}
