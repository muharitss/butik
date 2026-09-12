import type { Request, Response, NextFunction } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";
import { NotFoundError } from "../../shared/errors/index.js";
import { sendSuccess } from "../../shared/http/index.js";
import { recordAudit } from "../audit/index.js";
import type {
  CreateGarmentTypeInput,
  UpdateGarmentTypeInput,
  GarmentTypeQueryParams,
  GarmentTypeIdParam
} from "./garments.schemas.js";

/**
 * GET /api/garment-types
 * Lists garment types, optionally filtered by active status or search term.
 * Includes nested measurement fields sorted by sort_order.
 */
export async function listGarmentTypes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as GarmentTypeQueryParams;
    const includeInactive = query.includeInactive === true;

    const where: Prisma.GarmentTypeWhereInput = {
      deletedAt: null,
      ...(includeInactive ? {} : { isActive: true })
    };

    if (query.q) {
      const trimmedQ = query.q.trim();
      where.OR = [
        { name: { contains: trimmedQ, mode: "insensitive" } },
        { description: { contains: trimmedQ, mode: "insensitive" } }
      ];
    }

    const items = await prisma.garmentType.findMany({
      where,
      include: {
        measurementFields: {
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: { name: "asc" }
    });

    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/garment-types/:id
 * Fetches a single garment type by ID with its measurement fields.
 */
export async function getGarmentTypeById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as GarmentTypeIdParam;

    const item = await prisma.garmentType.findFirst({
      where: { id, deletedAt: null },
      include: {
        measurementFields: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    if (!item) {
      throw new NotFoundError("Garment type not found");
    }

    sendSuccess(res, item);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/garment-types
 * Creates a new garment type with optional nested measurement fields in a transaction.
 */
export async function createGarmentType(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateGarmentTypeInput;

    const actorId = req.actorId ?? null;

    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.garmentType.create({
        data: {
          name: body.name,
          description: body.description ?? null,
          isActive: body.isActive ?? true,
          measurementFields:
            body.measurementFields && body.measurementFields.length > 0
              ? {
                  create: body.measurementFields.map((f, idx) => ({
                    fieldKey: f.fieldKey,
                    label: f.label,
                    unit: f.unit,
                    isRequired: f.isRequired ?? true,
                    sortOrder: f.sortOrder ?? idx
                  }))
                }
              : undefined
        },
        include: {
          measurementFields: {
            orderBy: { sortOrder: "asc" }
          }
        }
      });

      await recordAudit({
        actorId,
        entityType: "garment_type",
        entityId: item.id,
        action: "create",
        before: null,
        after: item
      }, tx);

      return item;
    });

    sendSuccess(res, created, undefined, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/garment-types/:id
 * Updates garment type attributes and optionally replaces the entire measurementFields array.
 * Runs atomically inside a transaction.
 */
export async function updateGarmentType(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as GarmentTypeIdParam;
    const body = req.body as UpdateGarmentTypeInput;

    const actorId = req.actorId ?? null;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.garmentType.findFirst({
        where: { id, deletedAt: null },
        include: {
          measurementFields: {
            orderBy: { sortOrder: "asc" }
          }
        }
      });

      if (!existing) {
        throw new NotFoundError("Garment type not found");
      }

      await tx.garmentType.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {})
        }
      });

      if (body.measurementFields !== undefined) {
        await tx.garmentMeasurementField.deleteMany({
          where: { garmentTypeId: id }
        });

        if (body.measurementFields.length > 0) {
          await tx.garmentMeasurementField.createMany({
            data: body.measurementFields.map((f, idx) => ({
              garmentTypeId: id,
              fieldKey: f.fieldKey,
              label: f.label,
              unit: f.unit,
              isRequired: f.isRequired ?? true,
              sortOrder: f.sortOrder ?? idx
            }))
          });
        }
      }

      const fresh = await tx.garmentType.findUniqueOrThrow({
        where: { id },
        include: {
          measurementFields: {
            orderBy: { sortOrder: "asc" }
          }
        }
      });

      await recordAudit({
        actorId,
        entityType: "garment_type",
        entityId: id,
        action: "update",
        before: existing,
        after: fresh
      }, tx);

      return fresh;
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/garment-types/:id/deactivate
 * Deactivates a garment type (sets is_active=false) as a soft-delete equivalent.
 */
export async function deactivateGarmentType(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as GarmentTypeIdParam;

    const actorId = req.actorId ?? null;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.garmentType.findFirst({
        where: { id, deletedAt: null },
        include: {
          measurementFields: {
            orderBy: { sortOrder: "asc" }
          }
        }
      });

      if (!existing) {
        throw new NotFoundError("Garment type not found");
      }

      const fresh = await tx.garmentType.update({
        where: { id },
        data: { isActive: false },
        include: {
          measurementFields: {
            orderBy: { sortOrder: "asc" }
          }
        }
      });

      await recordAudit({
        actorId,
        entityType: "garment_type",
        entityId: id,
        action: "deactivate",
        before: existing,
        after: fresh
      }, tx);

      return fresh;
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}
