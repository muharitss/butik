import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../shared/http/index.js";
import {
  listFittingsByOrderId,
  getFittingById,
  scheduleFitting,
  updateFitting
} from "./fittings.service.js";
import type {
  OrderIdParam,
  FittingIdParam,
  CreateFittingInput,
  UpdateFittingInput
} from "./fittings.schemas.js";

/**
 * GET /api/orders/:orderId/fittings
 * Lists all fittings for an order, ordered by fittingNumber.
 */
export async function listFittingsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;
    const items = await listFittingsByOrderId(orderId);
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/:orderId/fittings/:id
 * Retrieves a single fitting for an order.
 */
export async function getFittingHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId, id } = req.params as unknown as FittingIdParam;
    const item = await getFittingById(orderId, id);
    sendSuccess(res, item);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:orderId/fittings
 * Schedules a new fitting for an order.
 */
export async function scheduleFittingHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;
    const body = req.body as CreateFittingInput;
    const actorId =
      (req.headers["x-actor-id"] as string) ||
      (req as unknown as { actorId?: string }).actorId ||
      null;

    const created = await scheduleFitting(orderId, body, actorId);
    sendSuccess(res, created, undefined, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/orders/:orderId/fittings/:id
 * Records fitting outcome (status=DONE) or cancels (status=CANCELLED).
 */
export async function updateFittingHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId, id } = req.params as unknown as FittingIdParam;
    const body = req.body as UpdateFittingInput;
    const actorId =
      (req.headers["x-actor-id"] as string) ||
      (req as unknown as { actorId?: string }).actorId ||
      null;

    const updated = await updateFitting(orderId, id, body, actorId);
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}
