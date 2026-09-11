import type { Revision, RevisionStatus } from '../types/revisions.types.ts';

export const REVISION_STATUSES: readonly RevisionStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CANCELLED',
] as const;

export const ALLOWED_REVISION_TRANSITIONS: Record<RevisionStatus, readonly RevisionStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
};

/**
 * Checks whether a transition between two revision statuses is permitted.
 */
export function canTransitionRevision(current: RevisionStatus, target: RevisionStatus): boolean {
  if (current === target) return true;
  const allowed = ALLOWED_REVISION_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(target));
}

/**
 * Human-readable label for revision statuses.
 */
export function getRevisionStatusLabel(status: RevisionStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'RESOLVED':
      return 'Resolved';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

/**
 * Badge variant mapping for Shadcn UI Badge.
 */
export function getRevisionBadgeVariant(
  status: RevisionStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'OPEN':
      return 'secondary';
    case 'IN_PROGRESS':
      return 'default';
    case 'RESOLVED':
      return 'outline';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'secondary';
  }
}

/**
 * Counts open (active) revisions that block order progression.
 */
export function countOpenRevisions(revisions: Revision[] = []): number {
  return revisions.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length;
}

/**
 * Returns true if an order has any active open revisions.
 */
export function hasOpenRevisions(revisions: Revision[] = []): boolean {
  return countOpenRevisions(revisions) > 0;
}

/**
 * Determines whether creating a revision is permitted based on order status.
 */
export function canCreateRevision(orderStatus: string): { allowed: boolean; reason?: string } {
  if (orderStatus === 'COMPLETED') {
    return {
      allowed: false,
      reason: 'Revisions cannot be created on completed orders.',
    };
  }

  if (orderStatus === 'CANCELLED') {
    return {
      allowed: false,
      reason: 'Revisions cannot be created on cancelled orders.',
    };
  }

  return { allowed: true };
}

/**
 * Helper to format ISO datetime string to localized Indonesian standard.
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Helper to format ISO date string.
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
}
