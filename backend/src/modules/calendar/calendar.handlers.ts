import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { sendSuccess } from "../../shared/http/index.js";
import type {
  CalendarEventsQueryParams,
  CalendarEvent
} from "./calendar.schemas.js";

/**
 * Parses date input into a bounded Date object.
 * If input is a YYYY-MM-DD string without time, expands it to cover the full start or end of day in UTC.
 */
function resolveBoundaryDate(val: string | undefined, isEnd: boolean, fallbackDate: Date): Date {
  if (!val) {
    return fallbackDate;
  }
  if (!val.includes("T")) {
    return isEnd ? new Date(`${val}T23:59:59.999Z`) : new Date(`${val}T00:00:00.000Z`);
  }
  return new Date(val);
}

/**
 * GET /api/calendar/events
 * Returns unified deadline and fitting events for the given date range.
 * Default range: current month (UTC).
 */
export async function getCalendarEventsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as CalendarEventsQueryParams;
    const now = new Date();

    const defaultMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
    );
    const defaultMonthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)
    );

    const fromDate = resolveBoundaryDate(query.from, false, defaultMonthStart);
    const toDate = resolveBoundaryDate(query.to, true, defaultMonthEnd);

    const [orders, fittings] = await Promise.all([
      // 1. Orders with deadlines in range (exclude cancelled)
      prisma.order.findMany({
        where: {
          status: { not: "CANCELLED" },
          deadlineAt: {
            gte: fromDate,
            lte: toDate
          }
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } }
        },
        orderBy: { deadlineAt: "asc" }
      }),

      // 2. Scheduled fittings in range (exclude cancelled fittings & cancelled orders)
      prisma.fitting.findMany({
        where: {
          status: { not: "CANCELLED" },
          order: { status: { not: "CANCELLED" } },
          scheduledAt: {
            gte: fromDate,
            lte: toDate
          }
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              customer: { select: { id: true, name: true, phone: true } }
            }
          }
        },
        orderBy: { scheduledAt: "asc" }
      })
    ]);

    const deadlineEvents: CalendarEvent[] = orders.map((order) => ({
      id: `deadline-${order.id}`,
      type: "deadline",
      date: order.deadlineAt.toISOString(),
      title: `${order.orderNumber} Deadline`,
      status: order.status,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customer?.name ?? "Unknown",
      customerPhone: order.customer?.phone ?? null,
      total: order.total.toString(),
      paymentStatus: order.paymentStatusCache
    }));

    const fittingEvents: CalendarEvent[] = fittings.map((fitting) => ({
      id: `fitting-${fitting.id}`,
      type: "fitting",
      date: fitting.scheduledAt!.toISOString(),
      title: `${fitting.order.orderNumber} Fitting #${fitting.fittingNumber}`,
      status: fitting.status,
      orderId: fitting.order.id,
      orderNumber: fitting.order.orderNumber,
      customerId: fitting.order.customer?.id ?? "",
      customerName: fitting.order.customer?.name ?? "Unknown",
      customerPhone: fitting.order.customer?.phone ?? null,
      fittingId: fitting.id,
      fittingNumber: fitting.fittingNumber,
      notes: fitting.notes ?? null
    }));

    const allEvents = [...deadlineEvents, ...fittingEvents].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sendSuccess(res, allEvents, {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      count: allEvents.length,
      deadlinesCount: deadlineEvents.length,
      fittingsCount: fittingEvents.length
    });
  } catch (err) {
    next(err);
  }
}
