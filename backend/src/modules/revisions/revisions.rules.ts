import type { Prisma } from "@prisma/client";
import { BusinessRuleViolationError } from "../../shared/errors/index.js";

export const REVISION_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CANCELLED"
] as const;

export type RevisionStatus = (typeof REVISION_STATUSES)[number];

export const ALLOWED_REVISION_TRANSITIONS: Record<RevisionStatus, readonly RevisionStatus[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: [],
  CANCELLED: []
};

/**
 * Validates that a revision state transition is permitted per STATE-MACHINES.md#revision.
 * Terminal states (RESOLVED, CANCELLED) cannot be changed.
 */
export function validateRevisionTransition(
  currentStatus: string,
  targetStatus: RevisionStatus
): void {
  if (currentStatus === targetStatus) {
    return;
  }

  const allowed = ALLOWED_REVISION_TRANSITIONS[currentStatus as RevisionStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new BusinessRuleViolationError(
      `Cannot transition revision from ${currentStatus} to ${targetStatus}`
    );
  }
}

/**
 * Counts open (OPEN or IN_PROGRESS) revisions for an order.
 */
export async function countOpenRevisions(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<number> {
  return tx.revision.count({
    where: {
      orderId,
      status: { in: ["OPEN", "IN_PROGRESS"] }
    }
  });
}
