import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";

export interface AuditLogEntry {
  id?: string;
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  createdAt: Date;
}

export interface RecordAuditOptions {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  tx?: Prisma.TransactionClient;
}

export interface ListAuditLogsQuery {
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

// In-memory store retained for backwards compatibility with synchronous getAuditLogs() in tests
const auditLogStore: AuditLogEntry[] = [];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function serializeJson(val: unknown): Prisma.InputJsonValue | undefined {
  if (val === undefined || val === null) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(val)) as Prisma.InputJsonValue;
}

/**
 * Records an audit log entry to the database and in-memory test store.
 * Supports both options object and positional parameter signatures.
 * Automatically participates in caller transactions when a transaction client is provided.
 */
export async function recordAudit(
  actorIdOrOptions: string | null | undefined | RecordAuditOptions,
  entityTypeOrTx?: string | Prisma.TransactionClient,
  entityId?: string,
  action?: string,
  before?: unknown,
  after?: unknown,
  txParam?: Prisma.TransactionClient,
): Promise<void> {
  let actorId: string | null;
  let entityType: string;
  let id: string;
  let act: string;
  let beforeVal: unknown;
  let afterVal: unknown;
  let txClient: Prisma.TransactionClient | undefined;

  if (typeof actorIdOrOptions === "object" && actorIdOrOptions !== null) {
    const opts = actorIdOrOptions as RecordAuditOptions;
    actorId = opts.actorId ?? null;
    entityType = opts.entityType;
    id = opts.entityId;
    act = opts.action;
    beforeVal = opts.before ?? null;
    afterVal = opts.after ?? null;
    txClient =
      opts.tx ??
      (typeof entityTypeOrTx === "object" && entityTypeOrTx !== null
        ? (entityTypeOrTx as Prisma.TransactionClient)
        : undefined);
  } else {
    actorId = actorIdOrOptions ?? null;
    entityType = entityTypeOrTx as string;
    id = entityId as string;
    act = action as string;
    beforeVal = before ?? null;
    afterVal = after ?? null;
    txClient = txParam;
  }

  const client = txClient ?? prisma;

  let validActorId: string | null = null;
  if (actorId && UUID_REGEX.test(actorId)) {
    const user = await client.user.findUnique({ where: { id: actorId } });
    if (user) {
      validActorId = user.id;
    }
  }

  const beforeJson = serializeJson(beforeVal);
  const afterJson = serializeJson(afterVal);

  const row = await client.auditLog.create({
    data: {
      actorId: validActorId,
      entityType,
      entityId: id,
      action: act,
      before: beforeJson ?? undefined,
      after: afterJson ?? undefined
    }
  });

  const entry: AuditLogEntry = {
    id: row.id,
    actorId: validActorId,
    entityType,
    entityId: id,
    action: act,
    before: beforeVal,
    after: afterVal,
    createdAt: row.createdAt
  };

  auditLogStore.push(entry);
}

/**
 * Lists audit logs with pagination and filters.
 */
export async function listAuditLogs(query: ListAuditLogsQuery) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const where: Prisma.AuditLogWhereInput = {};

  if (query.entityType) {
    where.entityType = query.entityType;
  }
  if (query.entityId) {
    where.entityId = query.entityId;
  }
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) {
      where.createdAt.gte = query.from;
    }
    if (query.to) {
      where.createdAt.lte = query.to;
    }
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    items,
    total,
    page,
    pageSize
  };
}

export function getAuditLogs(): readonly AuditLogEntry[] {
  return [...auditLogStore];
}

export function clearAuditLogs(): void {
  auditLogStore.length = 0;
}
