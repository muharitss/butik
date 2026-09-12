import type { Request, Response, NextFunction } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";
import {
  NotFoundError,
  BusinessRuleViolationError
} from "../../shared/errors/index.js";
import { sendSuccess } from "../../shared/http/index.js";
import { recordAudit } from "../audit/index.js";
import {
  validateRevisionTransition,
  countOpenRevisions
} from "./revisions.rules.js";
import type {
  OrderIdParam,
  RevisionIdParam,
  CreateRevisionInput,
  UpdateRevisionInput
} from "./revisions.schemas.js";

/**
 * GET /api/orders/:orderId/revisions
 * Lists all revisions for an order, ordered chronologically by createdAt.
 */
export async function listRevisionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    const items = await prisma.revision.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" }
    });

    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/:orderId/revisions/:id
 * Retrieves a single revision for an order.
 */
export async function getRevisionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId, id } = req.params as unknown as RevisionIdParam;

    const revision = await prisma.revision.findFirst({
      where: { id, orderId }
    });

    if (!revision) {
      throw new NotFoundError("Revision not found");
    }

    sendSuccess(res, revision);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:orderId/revisions
 * Creates a new revision for an order with status OPEN.
 * Validates that fittingId (if provided) belongs to the same order.
 */
export async function createRevisionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;
    const body = req.body as CreateRevisionInput;
    const actorId = req.actorId ?? null;

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new NotFoundError("Order not found");
      }

      if (order.status === "COMPLETED" || order.status === "CANCELLED") {
        throw new BusinessRuleViolationError(
          `Cannot create revision for order in terminal status ${order.status}`
        );
      }

      if (body.fittingId) {
        const fitting = await tx.fitting.findUnique({
          where: { id: body.fittingId }
        });

        if (!fitting || fitting.orderId !== orderId) {
          throw new BusinessRuleViolationError(
            "Fitting does not belong to this order"
          );
        }
      }

      const revision = await tx.revision.create({
        data: {
          orderId,
          fittingId: body.fittingId ?? null,
          issue: body.issue,
          requestedChange: body.requestedChange ?? null,
          notes: body.notes ?? null,
          status: "OPEN"
        }
      });

      await recordAudit(
        {
          actorId,
          entityType: "revision",
          entityId: revision.id,
          action: "revision.created",
          after: revision
        },
        tx
      );

      return revision;
    });

    sendSuccess(res, created, undefined, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/orders/:orderId/revisions/:id
 * Updates revision status (IN_PROGRESS, RESOLVED, CANCELLED) or notes.
 * Enforces state machine transitions and sets resolvedAt on resolution.
 */
export async function updateRevisionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId, id } = req.params as unknown as RevisionIdParam;
    const body = req.body as UpdateRevisionInput;
    const actorId = req.actorId ?? null;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new NotFoundError("Order not found");
      }

      const revision = await tx.revision.findFirst({
        where: { id, orderId }
      });

      if (!revision) {
        throw new NotFoundError("Revision not found");
      }

      if (revision.status === "RESOLVED" || revision.status === "CANCELLED") {
        throw new BusinessRuleViolationError(
          `Revision is in terminal status ${revision.status} and cannot be modified`
        );
      }

      if (body.status) {
        validateRevisionTransition(revision.status, body.status);
      }

      const updateData: Prisma.RevisionUpdateInput = {};
      if (body.status !== undefined) {
        updateData.status = body.status;
        if (body.status === "RESOLVED") {
          updateData.resolvedAt = body.resolvedAt ?? new Date();
        }
      }
      if (body.notes !== undefined) {
        updateData.notes = body.notes;
      }
      if (body.requestedChange !== undefined) {
        updateData.requestedChange = body.requestedChange;
      }
      if (body.resolvedAt !== undefined && body.status !== "RESOLVED") {
        updateData.resolvedAt = body.resolvedAt;
      }

      const updatedRevision = await tx.revision.update({
        where: { id },
        data: updateData
      });

      const remainingOpenRevisions = await countOpenRevisions(tx, orderId);

      let action = "revision.updated";
      if (body.status === "RESOLVED") {
        action = "revision.resolved";
      } else if (body.status === "CANCELLED") {
        action = "revision.cancelled";
      }

      await recordAudit(
        {
          actorId,
          entityType: "revision",
          entityId: id,
          action,
          before: revision,
          after: updatedRevision
        },
        tx
      );

      return {
        revision: updatedRevision,
        remainingOpenRevisions
      };
    });

    sendSuccess(res, result.revision, {
      remainingOpenRevisions: result.remainingOpenRevisions,
      allRevisionsResolved: result.remainingOpenRevisions === 0
    });
  } catch (err) {
    next(err);
  }
}
