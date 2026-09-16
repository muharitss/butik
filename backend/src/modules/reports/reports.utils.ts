import type { Prisma } from "@prisma/client";

/**
 * Builds a Prisma DateTimeFilter from optional 'from' and 'to' date strings.
 * Returns undefined if neither is provided.
 * Appends UTC start/end timestamps when date-only strings are passed.
 */
export function buildDateRangeFilter(
  from?: string,
  to?: string
): Prisma.DateTimeFilter | undefined {
  if (!from && !to) {
    return undefined;
  }

  const filter: Prisma.DateTimeFilter = {};

  if (from) {
    filter.gte = from.includes("T") ? new Date(from) : new Date(`${from}T00:00:00.000Z`);
  }

  if (to) {
    filter.lte = to.includes("T") ? new Date(to) : new Date(`${to}T23:59:59.999Z`);
  }

  return filter;
}
