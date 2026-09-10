import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { NotFoundError } from "../../shared/errors/index.js";
import { sendSuccess } from "../../shared/http/index.js";
import {
  createMeasurementVersion,
  listMeasurementVersions,
  getCurrentMeasurementVersion
} from "./measurements.service.js";
import type {
  CustomerIdParam,
  CreateMeasurementVersionInput
} from "./measurements.schemas.js";

/**
 * GET /api/customers/:customerId/measurements
 * Lists all measurement versions for a customer, newest first, each with its values.
 */
export async function listMeasurements(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { customerId } = req.params as unknown as CustomerIdParam;
    const items = await listMeasurementVersions(customerId);
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/customers/:customerId/measurements/current
 * Returns the latest measurement version with values for a customer.
 * Returns 404 NOT_FOUND if none exist or customer does not exist.
 */
export async function getCurrentMeasurement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { customerId } = req.params as unknown as CustomerIdParam;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null }
    });

    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    const current = await getCurrentMeasurementVersion(customerId);
    if (!current) {
      throw new NotFoundError("No measurement version found for this customer");
    }

    sendSuccess(res, current);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/customers/:customerId/measurements
 * Creates a new measurement version and its values in one transaction.
 */
export async function createMeasurement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { customerId } = req.params as unknown as CustomerIdParam;
    const body = req.body as CreateMeasurementVersionInput;

    const created = await createMeasurementVersion(customerId, body);
    sendSuccess(res, created, undefined, 201);
  } catch (err) {
    next(err);
  }
}
