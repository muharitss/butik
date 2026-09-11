import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { sendSuccess } from "../../shared/http/index.js";
import { toMoney, subtract, round, add } from "../../shared/money/index.js";
import type { DashboardSummaryQueryParams } from "./dashboard.schemas.js";

interface OrderCustomerSelect {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: { id: string; name: string; phone?: string | null } | null;
  status: string;
  deadlineAt?: Date | null;
  total: { toString(): string };
  paidTotalCache: { toString(): string };
  paymentStatusCache: string;
  createdAt?: Date | null;
}

function formatOrderSummary(order: OrderCustomerSelect) {
  const remainingBalance = round(
    subtract(toMoney(order.total.toString()), toMoney(order.paidTotalCache.toString()))
  );

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customer?.name ?? "Unknown",
    customerPhone: order.customer?.phone ?? null,
    status: order.status,
    deadlineAt: order.deadlineAt ? order.deadlineAt.toISOString() : null,
    total: order.total.toString(),
    paidTotal: order.paidTotalCache.toString(),
    remainingBalance: remainingBalance.toString(),
    paymentStatus: order.paymentStatusCache,
    createdAt: order.createdAt ? order.createdAt.toISOString() : null
  };
}

interface FittingSelect {
  id: string;
  fittingNumber: number;
  scheduledAt?: Date | null;
  status: string;
  notes?: string | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    customer?: { id: string; name: string; phone?: string | null } | null;
  };
}

function formatFittingSummary(fitting: FittingSelect) {
  return {
    id: fitting.id,
    fittingNumber: fitting.fittingNumber,
    scheduledAt: fitting.scheduledAt ? fitting.scheduledAt.toISOString() : null,
    status: fitting.status,
    notes: fitting.notes ?? null,
    orderId: fitting.order.id,
    orderNumber: fitting.order.orderNumber,
    orderStatus: fitting.order.status,
    customerId: fitting.order.customer?.id ?? "",
    customerName: fitting.order.customer?.name ?? "Unknown",
    customerPhone: fitting.order.customer?.phone ?? null
  };
}

/**
 * GET /api/dashboard/summary
 * Assembles live business aggregates for the operator dashboard in a single pass.
 */
export async function getDashboardSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as DashboardSummaryQueryParams;
    const now = new Date();
    const dueSoonDate = new Date(now.getTime() + query.dueSoonDays * 24 * 60 * 60 * 1000);
    const fittingsEndDate = new Date(now.getTime() + query.fittingsDays * 24 * 60 * 60 * 1000);

    const nonTerminalStatuses = { notIn: ["COMPLETED", "CANCELLED"] };

    const [
      activeOrdersCount,
      activeGroupBy,
      dueSoonOrders,
      dueSoonCount,
      overdueOrders,
      overdueCount,
      readyOrders,
      readyForPickupCount,
      upcomingFittings,
      upcomingFittingsCount,
      unpaidOrders,
      recentOrders
    ] = await Promise.all([
      // 1. Active orders count
      prisma.order.count({
        where: { status: nonTerminalStatuses }
      }),

      // 1b. Active orders breakdown by status
      prisma.order.groupBy({
        by: ["status"],
        where: { status: nonTerminalStatuses },
        _count: { id: true }
      }),

      // 2. Due soon orders (top 10 + total count)
      prisma.order.findMany({
        where: {
          status: nonTerminalStatuses,
          deadlineAt: { gte: now, lte: dueSoonDate }
        },
        orderBy: { deadlineAt: "asc" },
        take: 10,
        include: { customer: { select: { id: true, name: true, phone: true } } }
      }),
      prisma.order.count({
        where: {
          status: nonTerminalStatuses,
          deadlineAt: { gte: now, lte: dueSoonDate }
        }
      }),

      // 3. Overdue orders (top 10 + total count)
      prisma.order.findMany({
        where: {
          status: nonTerminalStatuses,
          deadlineAt: { lt: now }
        },
        orderBy: { deadlineAt: "asc" },
        take: 10,
        include: { customer: { select: { id: true, name: true, phone: true } } }
      }),
      prisma.order.count({
        where: {
          status: nonTerminalStatuses,
          deadlineAt: { lt: now }
        }
      }),

      // 4. Ready for pickup orders (top 10 + total count)
      prisma.order.findMany({
        where: { status: "READY" },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: { customer: { select: { id: true, name: true, phone: true } } }
      }),
      prisma.order.count({
        where: { status: "READY" }
      }),

      // 5. Upcoming scheduled fittings (top 10 + total count)
      prisma.fitting.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: { gte: now, lte: fittingsEndDate },
          order: { status: { not: "CANCELLED" } }
        },
        orderBy: { scheduledAt: "asc" },
        take: 10,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              customer: { select: { id: true, name: true, phone: true } }
            }
          }
        }
      }),
      prisma.fitting.count({
        where: {
          status: "SCHEDULED",
          scheduledAt: { gte: now, lte: fittingsEndDate },
          order: { status: { not: "CANCELLED" } }
        }
      }),

      // 6. Unpaid / Partial orders and outstanding balance
      prisma.order.findMany({
        where: {
          status: nonTerminalStatuses,
          paymentStatusCache: { in: ["UNPAID", "PARTIAL"] }
        },
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { id: true, name: true, phone: true } } }
      }),

      // 7. Recent orders
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: query.recentLimit,
        include: { customer: { select: { id: true, name: true, phone: true } } }
      })
    ]);

    // Format active breakdown
    const activeOrdersByStatus: Record<string, number> = {};
    for (const row of activeGroupBy) {
      activeOrdersByStatus[row.status] = row._count.id;
    }

    // Compute total outstanding balance from unpaid/partial orders
    // ponytail: in-memory sum of unpaid orders is fast for atelier order volume (< 1000 orders); for high-volume scale, push to SQL SUM(total - paid_total_cache)
    let totalOutstanding = toMoney(0);
    for (const ord of unpaidOrders) {
      const balance = subtract(toMoney(ord.total.toString()), toMoney(ord.paidTotalCache.toString()));
      totalOutstanding = add(totalOutstanding, balance);
    }

    const payload = {
      metrics: {
        activeOrdersCount,
        activeOrdersByStatus,
        dueSoonCount,
        dueSoonDays: query.dueSoonDays,
        overdueCount,
        readyForPickupCount,
        upcomingFittingsCount,
        upcomingFittingsDays: query.fittingsDays,
        unpaidOrPartialCount: unpaidOrders.length,
        totalOutstandingBalance: round(totalOutstanding).toString()
      },
      dueSoonOrders: dueSoonOrders.map(formatOrderSummary),
      overdueOrders: overdueOrders.map(formatOrderSummary),
      readyOrders: readyOrders.map(formatOrderSummary),
      upcomingFittings: upcomingFittings.map(formatFittingSummary),
      unpaidOrders: unpaidOrders.slice(0, 10).map(formatOrderSummary),
      recentOrders: recentOrders.map(formatOrderSummary)
    };

    sendSuccess(res, payload);
  } catch (err) {
    next(err);
  }
}
