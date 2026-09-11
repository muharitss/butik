import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";
import {
  NotFoundError,
  BusinessRuleViolationError
} from "../../shared/errors/index.js";
import {
  toMoney,
  round,
  add,
  subtract,
  isGreaterThan,
  isLessThan,
  isLessThanOrEqual
} from "../../shared/money/index.js";
import { recordAudit } from "../audit/index.js";
import type { CreatePaymentInput } from "./payments.schemas.js";

export interface OrderBalanceInfo {
  orderId: string;
  orderTotal: Prisma.Decimal;
  paidTotal: Prisma.Decimal;
  remainingBalance: Prisma.Decimal;
  paymentStatus: string;
}

/**
 * Computes authoritative paid_total, remaining_balance, and payment_status
 * from all payment rows associated with the given order.
 */
export async function getOrderBalance(
  orderId: string,
  clientTx?: Prisma.TransactionClient
): Promise<OrderBalanceInfo> {
  const db = clientTx ?? prisma;
  const order = await db.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const payments = await db.payment.findMany({
    where: { orderId }
  });

  let paidTotal = toMoney(0);
  for (const p of payments) {
    paidTotal = add(paidTotal, p.amount);
  }
  paidTotal = round(paidTotal);

  const remainingBalance = round(subtract(order.total, paidTotal));

  let paymentStatus: string;
  if (isLessThanOrEqual(paidTotal, 0)) {
    paymentStatus = "UNPAID";
  } else if (isLessThan(paidTotal, order.total)) {
    paymentStatus = "PARTIAL";
  } else {
    paymentStatus = "PAID";
  }

  return {
    orderId,
    orderTotal: order.total,
    paidTotal,
    remainingBalance,
    paymentStatus
  };
}

/**
 * Lists all payments for an order, newest first.
 */
export async function listPaymentsByOrderId(
  orderId: string,
  clientTx?: Prisma.TransactionClient
) {
  const db = clientTx ?? prisma;
  const order = await db.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  return db.payment.findMany({
    where: { orderId },
    orderBy: { recordedAt: "desc" },
    include: {
      user: true,
      reversedPayment: true
    }
  });
}

/**
 * Records a payment against an order inside a single database transaction.
 * Enforces:
 * - Order existence and non-cancelled status (cancelled orders accept ADJUSTMENT only).
 * - Overpayment check for non-adjustment payments (amount <= order.total - paid_total).
 * - Reversed payment validation (must exist on same order).
 * - Transactional recomputation of orders.paid_total_cache and orders.payment_status_cache.
 * - Audit logging.
 */
export async function recordPayment(
  orderId: string,
  input: CreatePaymentInput,
  actorId?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.status === "CANCELLED" && input.type !== "ADJUSTMENT") {
      throw new BusinessRuleViolationError(
        "Cannot record payment on a cancelled order. Only adjustments/refunds are permitted."
      );
    }

    if (input.reversedPaymentId) {
      const targetPayment = await tx.payment.findUnique({
        where: { id: input.reversedPaymentId }
      });

      if (!targetPayment) {
        throw new NotFoundError("Reversed payment not found");
      }

      if (targetPayment.orderId !== orderId) {
        throw new BusinessRuleViolationError(
          "Reversed payment does not belong to this order"
        );
      }
    }

    const amountDecimal = round(toMoney(input.amount));

    if (input.type !== "ADJUSTMENT") {
      const remainingBalance = subtract(order.total, order.paidTotalCache);
      if (isGreaterThan(amountDecimal, remainingBalance)) {
        throw new BusinessRuleViolationError(
          `Payment amount ${amountDecimal.toString()} exceeds remaining order balance of ${remainingBalance.toString()}`
        );
      }
    }

    let validActorId: string | null = null;
    if (actorId) {
      const user = await tx.user.findUnique({ where: { id: actorId } });
      if (user) {
        validActorId = user.id;
      }
    }

    const payment = await tx.payment.create({
      data: {
        orderId,
        type: input.type,
        amount: amountDecimal,
        method: input.method ?? null,
        note: input.note ?? null,
        reversedPaymentId: input.reversedPaymentId ?? null,
        recordedBy: validActorId
      },
      include: {
        user: true,
        reversedPayment: true
      }
    });

    // Recompute order balance and status from all payments
    const allPayments = await tx.payment.findMany({
      where: { orderId }
    });

    let paidTotal = toMoney(0);
    for (const p of allPayments) {
      paidTotal = add(paidTotal, p.amount);
    }
    paidTotal = round(paidTotal);

    let paymentStatus: string;
    if (isLessThanOrEqual(paidTotal, 0)) {
      paymentStatus = "UNPAID";
    } else if (isLessThan(paidTotal, order.total)) {
      paymentStatus = "PARTIAL";
    } else {
      paymentStatus = "PAID";
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        paidTotalCache: paidTotal,
        paymentStatusCache: paymentStatus
      }
    });

    await recordAudit({
      actorId: validActorId,
      entityType: "payment",
      entityId: payment.id,
      action: "payment.recorded",
      after: {
        id: payment.id,
        orderId: payment.orderId,
        type: payment.type,
        amount: payment.amount.toString(),
        method: payment.method,
        note: payment.note,
        reversedPaymentId: payment.reversedPaymentId,
        orderPaidTotalCache: paidTotal.toString(),
        orderPaymentStatusCache: paymentStatus
      }
    });

    return payment;
  });
}
