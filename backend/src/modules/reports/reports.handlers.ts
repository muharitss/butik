import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { sendSuccess } from "../../shared/http/index.js";
import { toMoney, subtract, add, round, formatMoney, isPositive } from "../../shared/money/index.js";
import { buildDateRangeFilter } from "./reports.utils.js";
import type { ReportsSummaryQueryParams } from "./reports.schemas.js";

/**
 * GET /api/reports/summary
 * Assembles period-based aggregate metrics and global financial snapshot.
 */
export async function getReportsSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as ReportsSummaryQueryParams;
    const { from, to } = query;

    const orderDateFilter = buildDateRangeFilter(from, to);
    const paymentDateFilter = buildDateRangeFilter(from, to);
    const customerDateFilter = buildDateRangeFilter(from, to);

    // ponytail: 5 separate aggregate queries per request is fine at boutique scale.
    // Upgrade path: Promise.all runs them concurrently from day one.
    const [
      totalOrders,
      completedOrders,
      cancelledOrders,
      revenueAggregate,
      collectedAggregate,
      unpaidOrders,
      newCustomers
    ] = await Promise.all([
      // 1. Count of all orders where orderDate is in period
      prisma.order.count({
        where: orderDateFilter ? { orderDate: orderDateFilter } : {}
      }),

      // 2. Count of COMPLETED orders where orderDate is in period
      prisma.order.count({
        where: {
          status: "COMPLETED",
          ...(orderDateFilter ? { orderDate: orderDateFilter } : {})
        }
      }),

      // 3. Count of CANCELLED orders where orderDate is in period
      prisma.order.count({
        where: {
          status: "CANCELLED",
          ...(orderDateFilter ? { orderDate: orderDateFilter } : {})
        }
      }),

      // 4. Sum of order.total for COMPLETED orders where orderDate is in period
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          status: "COMPLETED",
          ...(orderDateFilter ? { orderDate: orderDateFilter } : {})
        }
      }),

      // 5. Sum of payment.amount where recordedAt is in period
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: paymentDateFilter ? { recordedAt: paymentDateFilter } : {}
      }),

      // 6. Outstanding balance: sum of (total - paidTotalCache) for non-CANCELLED, non-fully-paid orders (global snapshot)
      prisma.order.findMany({
        where: {
          status: { not: "CANCELLED" },
          paymentStatusCache: { not: "PAID" }
        },
        select: {
          total: true,
          paidTotalCache: true
        }
      }),

      // 7. Count of non-deleted customers where createdAt is in period
      prisma.customer.count({
        where: {
          deletedAt: null,
          ...(customerDateFilter ? { createdAt: customerDateFilter } : {})
        }
      })
    ]);

    let outstandingTotal = toMoney(0);
    for (const order of unpaidOrders) {
      const balance = subtract(toMoney(order.total.toString()), toMoney(order.paidTotalCache.toString()));
      if (isPositive(balance)) {
        outstandingTotal = add(outstandingTotal, balance);
      }
    }

    sendSuccess(res, {
      totalOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue: formatMoney(toMoney(revenueAggregate._sum.total?.toString() ?? 0)),
      totalCollected: formatMoney(toMoney(collectedAggregate._sum.amount?.toString() ?? 0)),
      outstandingBalance: formatMoney(round(outstandingTotal)),
      newCustomers
    });
  } catch (err) {
    next(err);
  }
}
