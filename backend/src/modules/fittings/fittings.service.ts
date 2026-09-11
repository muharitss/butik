import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";
import {
  NotFoundError,
  BusinessRuleViolationError
} from "../../shared/errors/index.js";
import { transitionOrder } from "../orders/orders.service.js";
import { recordAudit } from "../audit/index.js";
import {
  validateFittingTransition,
  validateOrderAllowsFitting,
  countOpenRevisions
} from "./fittings.rules.js";
import type {
  CreateFittingInput,
  UpdateFittingInput
} from "./fittings.schemas.js";

/**
 * Lists all fittings for a given order, ordered sequentially by fittingNumber.
 */
export async function listFittingsByOrderId(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  return prisma.fitting.findMany({
    where: { orderId },
    orderBy: { fittingNumber: "asc" }
  });
}

/**
 * Retrieves a single fitting by id and orderId.
 */
export async function getFittingById(orderId: string, fittingId: string) {
  const fitting = await prisma.fitting.findFirst({
    where: { id: fittingId, orderId }
  });

  if (!fitting) {
    throw new NotFoundError("Fitting not found");
  }

  return fitting;
}

/**
 * Schedules a new fitting for an order.
 * Computes sequential fitting_number = max(existing) + 1.
 * If order is IN_PROGRESS, transitions order to FITTING.
 * If order is REVISION and no open revisions exist, transitions order to FITTING.
 * Entire operation runs inside a single Prisma transaction.
 */
export async function scheduleFitting(
  orderId: string,
  input: CreateFittingInput,
  actorId?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    validateOrderAllowsFitting(order.status);

    if (order.status === "REVISION") {
      const openCount = await countOpenRevisions(tx, orderId);
      if (openCount > 0) {
        throw new BusinessRuleViolationError(
          "Cannot schedule fitting: order has unresolved revisions"
        );
      }
    }

    const lastFitting = await tx.fitting.findFirst({
      where: { orderId },
      orderBy: { fittingNumber: "desc" },
      select: { fittingNumber: true }
    });

    const fittingNumber = (lastFitting?.fittingNumber ?? 0) + 1;

    const fitting = await tx.fitting.create({
      data: {
        orderId,
        fittingNumber,
        status: "SCHEDULED",
        scheduledAt: input.scheduledAt ?? null,
        notes: input.notes ?? null
      }
    });

    // Side effect: First fitting on IN_PROGRESS order moves to FITTING
    if (order.status === "IN_PROGRESS") {
      await transitionOrder(
        orderId,
        "FITTING",
        {
          reason: `Fitting #${fittingNumber} scheduled`,
          actorId
        },
        tx
      );
    } else if (order.status === "REVISION") {
      await transitionOrder(
        orderId,
        "FITTING",
        {
          reason: `Fitting #${fittingNumber} scheduled after revision resolution`,
          actorId
        },
        tx
      );
    }

    await recordAudit({
      actorId,
      entityType: "fitting",
      entityId: fitting.id,
      action: "fitting.created",
      after: {
        id: fitting.id,
        orderId: fitting.orderId,
        fittingNumber: fitting.fittingNumber,
        status: fitting.status,
        scheduledAt: fitting.scheduledAt,
        notes: fitting.notes
      }
    });

    return fitting;
  });
}

/**
 * Updates a fitting: records outcome (status=DONE) or cancels (status=CANCELLED).
 * - DONE requires result (APPROVED / NEEDS_REVISION) and occurredAt.
 * - If result=NEEDS_REVISION, transitions order to REVISION (if not already there).
 * - If result=APPROVED and no open revisions exist, transitions order to READY.
 * - Entire operation runs inside a single Prisma transaction.
 */
export async function updateFitting(
  orderId: string,
  fittingId: string,
  input: UpdateFittingInput,
  actorId?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const fitting = await tx.fitting.findFirst({
      where: { id: fittingId, orderId }
    });

    if (!fitting) {
      throw new NotFoundError("Fitting not found");
    }

    const order = await tx.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      throw new BusinessRuleViolationError(
        `Cannot update fitting for an order in terminal status ${order.status}`
      );
    }

    if (fitting.status === "DONE" || fitting.status === "CANCELLED") {
      throw new BusinessRuleViolationError(
        `Fitting is in terminal status ${fitting.status} and cannot be modified`
      );
    }

    if (input.status) {
      validateFittingTransition(fitting.status, input.status);
    }

    if (input.status === "CANCELLED") {
      const updatedFitting = await tx.fitting.update({
        where: { id: fittingId },
        data: {
          status: "CANCELLED",
          notes: input.notes !== undefined ? input.notes : fitting.notes
        }
      });

      await recordAudit({
        actorId,
        entityType: "fitting",
        entityId: fittingId,
        action: "fitting.cancelled",
        before: fitting,
        after: updatedFitting
      });

      return updatedFitting;
    }

    if (input.status === "DONE") {
      if (!input.result || !input.occurredAt) {
        throw new BusinessRuleViolationError(
          "Result and occurredAt are required when marking fitting as DONE"
        );
      }

      const updatedFitting = await tx.fitting.update({
        where: { id: fittingId },
        data: {
          status: "DONE",
          result: input.result,
          occurredAt: input.occurredAt,
          notes: input.notes !== undefined ? input.notes : fitting.notes,
          nextAction: input.nextAction !== undefined ? input.nextAction : fitting.nextAction
        }
      });

      // Side effects on order
      if (input.result === "NEEDS_REVISION") {
        if (order.status !== "REVISION") {
          await transitionOrder(
            orderId,
            "REVISION",
            {
              reason: `Fitting #${fitting.fittingNumber} result: NEEDS_REVISION`,
              actorId
            },
            tx
          );
        }
      } else if (input.result === "APPROVED") {
        const openRevisions = await countOpenRevisions(tx, orderId);
        if (openRevisions > 0) {
          throw new BusinessRuleViolationError(
            "Cannot transition order to READY: open revisions exist"
          );
        }
        if (order.status === "FITTING") {
          await transitionOrder(
            orderId,
            "READY",
            {
              reason: `Fitting #${fitting.fittingNumber} result: APPROVED`,
              actorId
            },
            tx
          );
        }
      }

      await recordAudit({
        actorId,
        entityType: "fitting",
        entityId: fittingId,
        action: "fitting.result_recorded",
        before: fitting,
        after: updatedFitting
      });

      return updatedFitting;
    }

    // Updating scheduledAt or notes while remaining SCHEDULED
    const updateData: Prisma.FittingUpdateInput = {};
    if (input.scheduledAt !== undefined) updateData.scheduledAt = input.scheduledAt;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const updatedFitting = await tx.fitting.update({
      where: { id: fittingId },
      data: updateData
    });

    await recordAudit({
      actorId,
      entityType: "fitting",
      entityId: fittingId,
      action: "fitting.updated",
      before: fitting,
      after: updatedFitting
    });

    return updatedFitting;
  });
}
