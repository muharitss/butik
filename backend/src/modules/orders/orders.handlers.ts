import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../shared/http/index.js";
import {
  createOrder,
  replaceOrderItems,
  transitionOrder,
  listOrders,
  getOrderById,
  updateOrder,
  resnapshotOrder
} from "./orders.service.js";
import type {
  CreateOrderInput,
  ReplaceOrderItemsInput,
  OrderIdParam,
  TransitionOrderInput,
  ListOrdersQueryParams,
  UpdateOrderInput
} from "./orders.schemas.js";

/**
 * POST /api/orders
 * Creates a new order in DRAFT status with initial status history and measurement snapshot.
 */
export async function createOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateOrderInput;
    const actorId = (req.headers["x-actor-id"] as string) || null;

    const order = await createOrder(body, actorId);
    sendSuccess(res, order, undefined, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/orders/:id/items
 * Replaces an existing order's items and recalculates subtotals and totals.
 */
export async function replaceOrderItemsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as OrderIdParam;
    const body = req.body as ReplaceOrderItemsInput;
    const actorId = (req.headers["x-actor-id"] as string) || null;

    const order = await replaceOrderItems(id, body.items, actorId);
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:id/transition
 * Runs the governed order status transition per the state machine.
 */
export async function transitionOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as OrderIdParam;
    const body = req.body as TransitionOrderInput;
    const actorId = (req.headers["x-actor-id"] as string) || null;

    const order = await transitionOrder(id, body.toStatus, {
      reason: body.reason,
      actorId
    });
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders
 * Lists orders with optional filters (q, status, dueBefore, dueAfter) and pagination.
 */
export async function listOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ListOrdersQueryParams;
    const { items, meta } = await listOrders(query);
    sendSuccess(res, items, meta);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/:id
 * Fetches full order detail including items, measurement snapshot, payments summary, and history.
 */
export async function getOrderByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as OrderIdParam;
    const order = await getOrderById(id);
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/orders/:id
 * Updates mutable fields of an order while in DRAFT or CONFIRMED status.
 */
export async function updateOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as OrderIdParam;
    const body = req.body as UpdateOrderInput;
    const actorId = (req.headers["x-actor-id"] as string) || null;

    const order = await updateOrder(id, body, actorId);
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:id/resnapshot
 * Resnapshots customer measurements into a new snapshot and supersedes the old one.
 */
export async function resnapshotOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as OrderIdParam;
    const actorId = (req.headers["x-actor-id"] as string) || null;

    const order = await resnapshotOrder(id, actorId);
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
}
