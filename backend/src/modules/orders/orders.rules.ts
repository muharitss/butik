import type { Prisma } from "@prisma/client";
import { BusinessRuleViolationError } from "../../shared/errors/index.js";
import { subtract, isPositive } from "../../shared/money/index.js";

export const ORDER_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROGRESS",
  "FITTING",
  "REVISION",
  "READY",
  "COMPLETED",
  "CANCELLED"
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PRE_FITTING_STATUSES: readonly OrderStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROGRESS"
];

/**
 * Verbatim transition table from STATE-MACHINES.md#order.
 * Terminal states (COMPLETED, CANCELLED) have empty allowed target lists.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["FITTING", "READY", "CANCELLED"],
  FITTING: ["REVISION", "READY", "CANCELLED"],
  REVISION: ["FITTING", "CANCELLED"],
  READY: ["COMPLETED", "REVISION"],
  COMPLETED: [],
  CANCELLED: []
};

export interface TransitionOrderEntity {
  id: string;
  status: string;
  requiresFitting: boolean;
  total: Prisma.Decimal | number | string;
  paidTotalCache: Prisma.Decimal | number | string;
  items?: unknown[];
  customer?: { id: string; deletedAt: Date | null } | null;
  measurementSnapshots?: unknown[];
}

export type TransitionGuard = (
  order: TransitionOrderEntity,
  reason?: string | null
) => void;

function requireCancellationReason(
  _order: TransitionOrderEntity,
  reason?: string | null
): void {
  if (!reason || reason.trim().length === 0) {
    throw new BusinessRuleViolationError(
      "Reason is required when cancelling an order"
    );
  }
}

export const TRANSITION_GUARDS: Partial<
  Record<`${OrderStatus}->${OrderStatus}`, TransitionGuard>
> = {
  "DRAFT->CONFIRMED": (order) => {
    if (!order.items || order.items.length === 0) {
      throw new BusinessRuleViolationError(
        "Cannot confirm order without at least one item"
      );
    }
    if (!order.customer || order.customer.deletedAt !== null) {
      throw new BusinessRuleViolationError(
        "Cannot confirm order for a missing or inactive customer"
      );
    }
    if (
      !order.measurementSnapshots ||
      order.measurementSnapshots.length === 0
    ) {
      throw new BusinessRuleViolationError(
        "Cannot confirm order without a measurement snapshot"
      );
    }
  },
  "IN_PROGRESS->READY": (order) => {
    if (order.requiresFitting) {
      throw new BusinessRuleViolationError(
        "Cannot transition order from IN_PROGRESS to READY: order requires fitting (must transition to FITTING first)"
      );
    }
  },
  "FITTING->READY": (_order) => {
    // ponytail: Revision check (no open revisions) will query revisions table once introduced in TASK-021
  },
  "READY->COMPLETED": (order) => {
    const remainingBalance = subtract(order.total, order.paidTotalCache);
    if (isPositive(remainingBalance)) {
      throw new BusinessRuleViolationError(
        `Cannot complete order with outstanding balance of ${remainingBalance.toString()}`
      );
    }
  },
  "READY->REVISION": (_order, reason) => {
    if (!reason || reason.trim().length === 0) {
      throw new BusinessRuleViolationError(
        "Reason is required when reopening an order to REVISION"
      );
    }
  },
  "DRAFT->CANCELLED": requireCancellationReason,
  "CONFIRMED->CANCELLED": requireCancellationReason,
  "IN_PROGRESS->CANCELLED": requireCancellationReason,
  "FITTING->CANCELLED": requireCancellationReason,
  "REVISION->CANCELLED": requireCancellationReason
};

/**
 * Validates whether transitioning an order from its current status to target status is permitted.
 * Throws BusinessRuleViolationError (409) if the transition is illegal or fails guards.
 */
export function validateTransition(
  order: TransitionOrderEntity,
  toStatus: OrderStatus,
  reason?: string | null
): void {
  const currentStatus = order.status as OrderStatus;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];

  if (!allowed || !allowed.includes(toStatus)) {
    throw new BusinessRuleViolationError(
      `Cannot transition order from ${order.status} to ${toStatus}`
    );
  }

  const guardKey = `${currentStatus}->${toStatus}` as `${OrderStatus}->${OrderStatus}`;
  const guard = TRANSITION_GUARDS[guardKey];
  if (guard) {
    guard(order, reason);
  }
}
