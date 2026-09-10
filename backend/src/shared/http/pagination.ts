import { z } from "zod";

export interface PaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

export interface ParsedPagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  [key: string]: unknown;
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export function parsePagination(
  query: { page?: unknown; pageSize?: unknown } = {},
  options: PaginationOptions = {}
): ParsedPagination {
  const defaultPage = options.defaultPage ?? 1;
  const defaultPageSize = options.defaultPageSize ?? 20;
  const maxPageSize = options.maxPageSize ?? 100;

  const rawPage = Number(query.page);
  const rawPageSize = Number(query.pageSize);

  const page = !Number.isNaN(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : defaultPage;

  let pageSize =
    !Number.isNaN(rawPageSize) && rawPageSize >= 1 ? Math.floor(rawPageSize) : defaultPageSize;

  if (pageSize > maxPageSize) {
    pageSize = maxPageSize;
  }

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}

export function buildPaginationMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return {
    page,
    pageSize,
    total
  };
}
