import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";
import {
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
  ValidationError
} from "../../shared/errors/index.js";
import {
  toMoney,
  add,
  subtract,
  multiply,
  round,
  isNegative
} from "../../shared/money/index.js";
import { parsePagination, buildPaginationMeta } from "../../shared/http/index.js";
import { recordAudit } from "../audit/index.js";
import { getCurrentMeasurementVersion } from "../measurements/index.js";
import type {
  CreateOrderInput,
  OrderItemInput,
  ListOrdersQueryParams,
  UpdateOrderInput
} from "./orders.schemas.js";
import {
  type OrderStatus,
  validateTransition,
  PRE_FITTING_STATUSES
} from "./orders.rules.js";

export interface ComputedItem {
  garmentTypeId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  notes?: string | null;
}

export interface ComputedOrderTotals {
  items: ComputedItem[];
  subtotal: Prisma.Decimal;
  additionalCost: Prisma.Decimal;
  expressFee: Prisma.Decimal;
  discount: Prisma.Decimal;
  total: Prisma.Decimal;
}

/**
 * Generates the next sequential order number for a given calendar year using row-level locking
 * on the order_number_counters table to prevent race conditions during concurrent inserts.
 * Format: JF-<year>-<sequential 3+ digits>, e.g. JF-2026-001
 */
export async function getNextOrderNumber(
  year: number,
  tx: Prisma.TransactionClient
): Promise<string> {
  // Ensure the counter row for the year exists
  await tx.$executeRaw`
    INSERT INTO order_number_counters (year, last_value)
    VALUES (${year}, 0)
    ON CONFLICT (year) DO NOTHING
  `;

  // Explicitly lock the counter row for this transaction
  const rows = await tx.$queryRaw<{ last_value: number }[]>`
    SELECT last_value FROM order_number_counters
    WHERE year = ${year}
    FOR UPDATE
  `;

  const nextValue = Number(rows[0]?.last_value ?? 0) + 1;

  await tx.$executeRaw`
    UPDATE order_number_counters
    SET last_value = ${nextValue}
    WHERE year = ${year}
  `;

  const sequenceFormatted = String(nextValue).padStart(3, "0");
  return `JF-${year}-${sequenceFormatted}`;
}

/**
 * Computes individual item subtotals and the overall order subtotal and total using decimal arithmetic.
 * total = subtotal + additionalCost + expressFee - discount
 */
export function computeOrderTotals(
  items: OrderItemInput[],
  additionalCostInput: Prisma.Decimal | number | string = 0,
  expressFeeInput: Prisma.Decimal | number | string = 0,
  discountInput: Prisma.Decimal | number | string = 0
): ComputedOrderTotals {
  const additionalCost = round(toMoney(additionalCostInput));
  const expressFee = round(toMoney(expressFeeInput));
  const discount = round(toMoney(discountInput));

  let subtotalAcc = toMoney(0);
  const computedItems: ComputedItem[] = [];

  for (const item of items) {
    const unitPrice = round(toMoney(item.unitPrice));
    const itemSubtotal = round(multiply(unitPrice, item.quantity));
    subtotalAcc = add(subtotalAcc, itemSubtotal);
    computedItems.push({
      garmentTypeId: item.garmentTypeId,
      quantity: item.quantity,
      unitPrice,
      subtotal: itemSubtotal,
      notes: item.notes ?? null
    });
  }

  const subtotal = round(subtotalAcc);
  const total = round(subtract(add(add(subtotal, additionalCost), expressFee), discount));

  if (isNegative(total)) {
    throw new ValidationError("Order total cannot be negative after discount");
  }

  return {
    items: computedItems,
    subtotal,
    additionalCost,
    expressFee,
    discount,
    total
  };
}

/**
 * Validates that all referenced garment types exist and are currently active.
 */
async function validateGarmentTypes(
  garmentTypeIds: string[],
  tx: Prisma.TransactionClient
): Promise<void> {
  if (garmentTypeIds.length === 0) return;
  const uniqueIds = [...new Set(garmentTypeIds)];
  const garmentTypes = await tx.garmentType.findMany({
    where: { id: { in: uniqueIds } }
  });

  const foundMap = new Map(garmentTypes.map((gt) => [gt.id, gt]));
  for (const id of uniqueIds) {
    const gt = foundMap.get(id);
    if (!gt) {
      throw new NotFoundError(`Garment type not found: ${id}`);
    }
    if (!gt.isActive) {
      throw new ConflictError(`Garment type is inactive: ${gt.name}`);
    }
  }
}

/**
 * Creates an order in DRAFT status with initial status history, snapshotting the customer's
 * current measurement version and calculating all totals in a single database transaction.
 */
export async function createOrder(
  input: CreateOrderInput,
  actorId?: string | null
) {
  return prisma.$transaction(async (tx) => {
    // 1. Validate customer exists and is not soft-deleted
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId }
    });
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    if (customer.deletedAt !== null) {
      throw new ConflictError("Customer is inactive or soft-deleted");
    }

    // 2. Validate referenced garment types
    const garmentTypeIds = input.items.map((i) => i.garmentTypeId);
    await validateGarmentTypes(garmentTypeIds, tx);

    // 3. Resolve customer's current measurement version
    const currentMeasurement = await getCurrentMeasurementVersion(input.customerId, tx);
    if (!currentMeasurement) {
      throw new BusinessRuleViolationError(
        "Customer has no measurement version recorded. Please record customer measurements before creating an order."
      );
    }

    // 4. Compute pricing
    const totals = computeOrderTotals(
      input.items,
      input.additionalCost,
      input.expressFee,
      input.discount
    );

    // 5. Generate sequential order number with row lock
    const year = new Date().getFullYear();
    const orderNumber = await getNextOrderNumber(year, tx);

    // Verify actor is a valid User before assigning foreign key
    let validChangedBy: string | null = null;
    if (actorId) {
      const user = await tx.user.findUnique({ where: { id: actorId } });
      if (user) {
        validChangedBy = user.id;
      }
    }

    // 6. Create order with nested items, measurement snapshot, and status history
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: input.customerId,
        status: "DRAFT",
        requiresFitting: input.requiresFitting ?? true,
        orderDate: new Date(),
        deadlineAt: input.deadlineAt,
        subtotal: totals.subtotal,
        additionalCost: totals.additionalCost,
        expressFee: totals.expressFee,
        discount: totals.discount,
        total: totals.total,
        notes: input.notes ?? null,
        items: {
          create: totals.items.map((i) => ({
            garmentTypeId: i.garmentTypeId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
            notes: i.notes
          }))
        },
        measurementSnapshots: {
          create: {
            sourceMeasurementVersionId: currentMeasurement.id,
            values: {
              create: currentMeasurement.values.map((v) => ({
                fieldKey: v.fieldKey,
                value: v.value,
                unit: v.unit
              }))
            }
          }
        },
        statusHistories: {
          create: {
            fromStatus: null,
            toStatus: "DRAFT",
            changedBy: validChangedBy,
            reason: null
          }
        }
      },
      include: {
        customer: true,
        items: {
          include: { garmentType: true }
        },
        measurementSnapshots: {
          include: { values: true }
        },
        statusHistories: true
      }
    });

    // 7. Record audit log
    await recordAudit(
      {
        actorId: actorId ?? null,
        entityType: "order",
        entityId: order.id,
        action: "create",
        before: null,
        after: order
      },
      tx
    );

    return order;
  });
}

/**
 * Replaces an order's item list and recomputes the subtotal and total.
 * Only allowed when the order is in DRAFT or CONFIRMED status.
 */
export async function replaceOrderItems(
  orderId: string,
  newItems: OrderItemInput[],
  actorId?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.status !== "DRAFT" && order.status !== "CONFIRMED") {
      throw new BusinessRuleViolationError(
        `Items can only be modified when order is in DRAFT or CONFIRMED status (current: ${order.status})`
      );
    }

    if (order.status === "CONFIRMED" && newItems.length === 0) {
      throw new BusinessRuleViolationError(
        "A confirmed order must have at least one item"
      );
    }

    // Validate garment types
    const garmentTypeIds = newItems.map((i) => i.garmentTypeId);
    await validateGarmentTypes(garmentTypeIds, tx);

    // Recompute totals
    const totals = computeOrderTotals(
      newItems,
      order.additionalCost,
      order.expressFee,
      order.discount
    );

    // Delete existing items
    await tx.orderItem.deleteMany({
      where: { orderId }
    });

    // Create new items
    await tx.orderItem.createMany({
      data: totals.items.map((i) => ({
        orderId,
        garmentTypeId: i.garmentTypeId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
        notes: i.notes
      }))
    });

    // Update order with new subtotal and total
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        subtotal: totals.subtotal,
        total: totals.total
      },
      include: {
        customer: true,
        items: {
          include: { garmentType: true }
        },
        measurementSnapshots: {
          include: { values: true }
        },
        statusHistories: true
      }
    });

    // Record audit log
    await recordAudit(
      {
        actorId: actorId ?? null,
        entityType: "order",
        entityId: orderId,
        action: "update_items",
        before: {
          subtotal: order.subtotal,
          total: order.total,
          items: order.items
        },
        after: {
          subtotal: updatedOrder.subtotal,
          total: updatedOrder.total,
          items: updatedOrder.items
        }
      },
      tx
    );

    return updatedOrder;
  });
}

export interface TransitionOrderOptions {
  reason?: string | null;
  actorId?: string | null;
}

/**
 * Transitions an order to a new status according to the governed state machine in STATE-MACHINES.md.
 * Enforces the transition table and guards, updates status and cancellation metadata,
 * records an OrderStatusHistory entry, and logs an audit record.
 */
export async function transitionOrder(
  orderId: string,
  toStatus: OrderStatus,
  options?: TransitionOrderOptions,
  clientTx?: Prisma.TransactionClient
) {
  const execute = async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: true,
        measurementSnapshots: true
      }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    const currentStatus = order.status as OrderStatus;
    const reason = options?.reason?.trim() || null;
    const actorId = options?.actorId ?? null;

    validateTransition(order, toStatus, reason);

    let validChangedBy: string | null = null;
    if (actorId) {
      const user = await tx.user.findUnique({ where: { id: actorId } });
      if (user) {
        validChangedBy = user.id;
      }
    }

    const updateData: Prisma.OrderUpdateInput = {
      status: toStatus,
      statusHistories: {
        create: {
          fromStatus: currentStatus,
          toStatus,
          changedBy: validChangedBy,
          reason
        }
      }
    };

    if (toStatus === "CANCELLED") {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = reason;
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        customer: true,
        items: {
          include: { garmentType: true }
        },
        measurementSnapshots: {
          include: { values: true }
        },
        statusHistories: true
      }
    });

    await recordAudit(
      {
        actorId,
        entityType: "order",
        entityId: orderId,
        action: "status_change",
        before: { status: currentStatus },
        after: { status: toStatus }
      },
      tx
    );

    return updatedOrder;
  };

  if (clientTx) {
    return execute(clientTx);
  }
  return prisma.$transaction(execute);
}

/**
 * Lists and filters orders with pagination.
 * Supports filtering by q (orderNumber, customer name, phone), status, dueBefore, and dueAfter.
 */
export async function listOrders(query: Partial<ListOrdersQueryParams> = {}) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where: Prisma.OrderWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.dueBefore || query.dueAfter) {
    where.deadlineAt = {};
    if (query.dueBefore) {
      where.deadlineAt.lte = query.dueBefore;
    }
    if (query.dueAfter) {
      where.deadlineAt.gte = query.dueAfter;
    }
  }

  if (query.q) {
    const trimmedQ = query.q.trim();
    const digits = trimmedQ.replace(/\D/g, "");

    const orConditions: Prisma.OrderWhereInput[] = [
      { orderNumber: { contains: trimmedQ, mode: "insensitive" } },
      { customer: { name: { contains: trimmedQ, mode: "insensitive" } } },
      { customer: { phone: { contains: trimmedQ, mode: "insensitive" } } }
    ];

    if (digits.length >= 3) {
      orConditions.push({ customer: { phone: { contains: digits } } });
      if (digits.startsWith("0")) {
        orConditions.push({ customer: { phone: { contains: digits.slice(1) } } });
      } else if (digits.startsWith("62")) {
        orConditions.push({ customer: { phone: { contains: digits.slice(2) } } });
      }
    }

    where.OR = orConditions;
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        items: {
          include: { garmentType: true }
        }
      }
    }),
    prisma.order.count({ where })
  ]);

  return {
    items,
    meta: buildPaginationMeta(total, page, pageSize)
  };
}

/**
 * Retrieves full detail for an order.
 * Assembles order + items + current (non-superseded) snapshot with values +
 * payments summary + status history + future sub-resource arrays (fittings, revisions, attachments).
 */
export async function getOrderById(
  orderId: string,
  clientTx?: Prisma.TransactionClient
) {
  const db = clientTx ?? prisma;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: {
        include: { garmentType: true }
      },
      measurementSnapshots: {
        where: { supersededByResnapshotAt: null },
        include: { values: true },
        orderBy: { createdAt: "desc" },
        take: 1
      },
      statusHistories: {
        orderBy: { changedAt: "asc" },
        include: { user: true }
      },
      payments: {
        orderBy: { recordedAt: "desc" }
      }
    }
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const activeSnapshot = order.measurementSnapshots[0] ?? null;
  const remainingBalance = round(
    subtract(toMoney(order.total), toMoney(order.paidTotalCache))
  );

  const paymentsSummary = {
    paidTotal: order.paidTotalCache,
    remainingBalance,
    paymentStatus: order.paymentStatusCache,
    paid_total: order.paidTotalCache,
    remaining_balance: remainingBalance,
    payment_status: order.paymentStatusCache
  };

  return {
    ...order,
    measurementSnapshot: activeSnapshot,
    paymentsSummary,
    payments: order.payments,
    fittings: [],
    revisions: [],
    attachments: []
  };
}

/**
 * Updates mutable fields of an order (deadlineAt, notes, pricing adjustments).
 * Only permitted when order is in DRAFT or CONFIRMED status.
 * Recomputes totals when pricing adjustments change.
 */
export async function updateOrder(
  orderId: string,
  input: UpdateOrderInput,
  actorId?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.status !== "DRAFT" && order.status !== "CONFIRMED") {
      throw new BusinessRuleViolationError(
        `Order can only be modified when in DRAFT or CONFIRMED status (current: ${order.status})`
      );
    }

    const additionalCost =
      input.additionalCost !== undefined
        ? round(toMoney(input.additionalCost))
        : round(toMoney(order.additionalCost));
    const expressFee =
      input.expressFee !== undefined
        ? round(toMoney(input.expressFee))
        : round(toMoney(order.expressFee));
    const discount =
      input.discount !== undefined
        ? round(toMoney(input.discount))
        : round(toMoney(order.discount));

    const subtotal = round(toMoney(order.subtotal));
    const total = round(
      subtract(add(add(subtotal, additionalCost), expressFee), discount)
    );

    if (isNegative(total)) {
      throw new ValidationError("Order total cannot be negative after discount");
    }

    const updateData: Prisma.OrderUpdateInput = {
      total,
      additionalCost,
      expressFee,
      discount
    };

    if (input.deadlineAt !== undefined) {
      updateData.deadlineAt = input.deadlineAt;
    }
    if (input.requiresFitting !== undefined) {
      updateData.requiresFitting = input.requiresFitting;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        customer: true,
        items: {
          include: { garmentType: true }
        },
        measurementSnapshots: {
          where: { supersededByResnapshotAt: null },
          include: { values: true }
        },
        statusHistories: true
      }
    });

    await recordAudit(
      {
        actorId: actorId ?? null,
        entityType: "order",
        entityId: orderId,
        action: "update",
        before: {
          deadlineAt: order.deadlineAt,
          requiresFitting: order.requiresFitting,
          notes: order.notes,
          subtotal: order.subtotal,
          additionalCost: order.additionalCost,
          expressFee: order.expressFee,
          discount: order.discount,
          total: order.total
        },
        after: {
          deadlineAt: updatedOrder.deadlineAt,
          requiresFitting: updatedOrder.requiresFitting,
          notes: updatedOrder.notes,
          subtotal: updatedOrder.subtotal,
          additionalCost: updatedOrder.additionalCost,
          expressFee: updatedOrder.expressFee,
          discount: updatedOrder.discount,
          total: updatedOrder.total
        }
      },
      tx
    );

    return updatedOrder;
  });
}

/**
 * Resnapshots the order measurements from the customer's current measurement version.
 * Marks the old active snapshot as superseded and audit-logs before/after values.
 * Permitted only pre-FITTING (DRAFT, CONFIRMED, IN_PROGRESS).
 */
export async function resnapshotOrder(
  orderId: string,
  actorId?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        measurementSnapshots: {
          where: { supersededByResnapshotAt: null },
          include: { values: true },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (!PRE_FITTING_STATUSES.includes(order.status as OrderStatus)) {
      throw new BusinessRuleViolationError(
        `Cannot resnapshot order: resnapshot is only permitted pre-FITTING (current: ${order.status})`
      );
    }

    const currentMeasurement = await getCurrentMeasurementVersion(
      order.customerId,
      tx
    );
    if (!currentMeasurement) {
      throw new BusinessRuleViolationError(
        "Customer has no measurement version recorded. Please record customer measurements first."
      );
    }

    const activeSnapshot = order.measurementSnapshots[0];
    if (!activeSnapshot) {
      throw new BusinessRuleViolationError(
        "No active measurement snapshot found for order"
      );
    }

    // Mark previous snapshot as superseded
    const now = new Date();
    await tx.orderMeasurementSnapshot.update({
      where: { id: activeSnapshot.id },
      data: { supersededByResnapshotAt: now }
    });

    // Create new snapshot
    const newSnapshot = await tx.orderMeasurementSnapshot.create({
      data: {
        orderId,
        sourceMeasurementVersionId: currentMeasurement.id,
        values: {
          create: currentMeasurement.values.map((v) => ({
            fieldKey: v.fieldKey,
            value: v.value,
            unit: v.unit
          }))
        }
      },
      include: { values: true }
    });

    await recordAudit(
      {
        actorId: actorId ?? null,
        entityType: "order",
        entityId: orderId,
        action: "resnapshot",
        before: {
          snapshotId: activeSnapshot.id,
          sourceMeasurementVersionId: activeSnapshot.sourceMeasurementVersionId,
          values: activeSnapshot.values.map((v) => ({
            fieldKey: v.fieldKey,
            value: v.value.toString(),
            unit: v.unit
          }))
        },
        after: {
          snapshotId: newSnapshot.id,
          sourceMeasurementVersionId: newSnapshot.sourceMeasurementVersionId,
          values: newSnapshot.values.map((v) => ({
            fieldKey: v.fieldKey,
            value: v.value.toString(),
            unit: v.unit
          }))
        }
      },
      tx
    );

    return getOrderById(orderId, tx);
  });
}
