import type { Prisma } from "@prisma/client";
import { BusinessRuleViolationError } from "../../shared/errors/index.js";

export const FITTING_STATUSES = [
  "SCHEDULED",
  "DONE",
  "CANCELLED"
] as const;

export type FittingStatus = (typeof FITTING_STATUSES)[number];

export const FITTING_RESULTS = [
  "APPROVED",
  "NEEDS_REVISION"
] as const;

export type FittingResult = (typeof FITTING_RESULTS)[number];

export const ALLOWED_FITTING_TRANSITIONS: Record<FittingStatus, readonly FittingStatus[]> = {
  SCHEDULED: ["DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: []
};

/**
 * Validates that a fitting state transition is permitted.
 * Terminal states (DONE, CANCELLED) cannot be changed.
 */
export function validateFittingTransition(
  currentStatus: string,
  targetStatus: FittingStatus
): void {
  if (currentStatus === targetStatus) {
    return;
  }

  const allowed = ALLOWED_FITTING_TRANSITIONS[currentStatus as FittingStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new BusinessRuleViolationError(
      `Cannot transition fitting from ${currentStatus} to ${targetStatus}`
    );
  }
}

/**
 * Validates whether the order is in a state that permits scheduling/creating a fitting.
 * Orders must be in IN_PROGRESS, FITTING, or REVISION.
 */
export function validateOrderAllowsFitting(orderStatus: string): void {
  if (orderStatus === "DRAFT" || orderStatus === "CONFIRMED") {
    throw new BusinessRuleViolationError(
      `Cannot schedule fitting for order in status ${orderStatus}. Production must be started first.`
    );
  }

  if (
    orderStatus === "READY" ||
    orderStatus === "COMPLETED" ||
    orderStatus === "CANCELLED"
  ) {
    throw new BusinessRuleViolationError(
      `Cannot schedule fitting for order in status ${orderStatus}.`
    );
  }

  if (
    orderStatus !== "IN_PROGRESS" &&
    orderStatus !== "FITTING" &&
    orderStatus !== "REVISION"
  ) {
    throw new BusinessRuleViolationError(
      `Cannot schedule fitting for order in unknown status ${orderStatus}.`
    );
  }
}

/**
 * Helper to count open (OPEN or IN_PROGRESS) revisions for an order.
 * Safely queries Prisma if the revision model exists, or returns 0 if not yet migrated.
 */
export async function countOpenRevisions(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<number> {
  const client = tx as unknown as {
    revision?: {
      count: (args: {
        where: { orderId: string; status: { in: string[] } };
      }) => Promise<number>;
    };
  };

  if (client.revision && typeof client.revision.count === "function") {
    return client.revision.count({
      where: {
        orderId,
        status: { in: ["OPEN", "IN_PROGRESS"] }
      }
    });
  }
  return 0;
}
