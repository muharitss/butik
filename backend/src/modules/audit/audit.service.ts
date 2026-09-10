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
}

// In-memory store for audit records until TASK-026 introduces the database-backed AuditLog table.
const auditLogStore: AuditLogEntry[] = [];

/**
 * Records an audit log entry.
 * Can be called with either an options object or positional arguments.
 * Supports an optional Prisma transaction client `tx` for future transactional writes.
 */
export async function recordAudit(
  actorIdOrOptions: string | null | undefined | RecordAuditOptions,
  entityTypeOrTx?: string | unknown,
  entityId?: string,
  action?: string,
  before?: unknown,
  after?: unknown,
  _tx?: unknown
): Promise<void> {
  let entry: AuditLogEntry;

  if (typeof actorIdOrOptions === "object" && actorIdOrOptions !== null) {
    const opts = actorIdOrOptions as RecordAuditOptions;
    entry = {
      actorId: opts.actorId ?? null,
      entityType: opts.entityType,
      entityId: opts.entityId,
      action: opts.action,
      before: opts.before ?? null,
      after: opts.after ?? null,
      createdAt: new Date()
    };
  } else {
    entry = {
      actorId: actorIdOrOptions ?? null,
      entityType: entityTypeOrTx as string,
      entityId: entityId as string,
      action: action as string,
      before: before ?? null,
      after: after ?? null,
      createdAt: new Date()
    };
  }

  auditLogStore.push(entry);
}

export function getAuditLogs(): readonly AuditLogEntry[] {
  return [...auditLogStore];
}

export function clearAuditLogs(): void {
  auditLogStore.length = 0;
}
