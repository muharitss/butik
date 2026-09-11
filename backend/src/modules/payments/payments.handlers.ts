import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../shared/http/index.js";
import {
  recordPayment,
  listPaymentsByOrderId
} from "./payments.service.js";
import type {
  OrderIdParam,
  CreatePaymentInput
} from "./payments.schemas.js";

/**
 * GET /api/orders/:orderId/payments
 * Lists all payments for an order, newest first.
 */
export async function listPaymentsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;
    const items = await listPaymentsByOrderId(orderId);
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:orderId/payments
 * Records a payment against an order and recomputes paid_total and payment_status.
 */
export async function createPaymentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;
    const body = req.body as CreatePaymentInput;
    const actorId =
      (req.headers["x-actor-id"] as string) ||
      (req as unknown as { actorId?: string }).actorId ||
      null;

    const created = await recordPayment(orderId, body, actorId);
    sendSuccess(res, created, undefined, 201);
  } catch (err) {
    next(err);
  }
}
