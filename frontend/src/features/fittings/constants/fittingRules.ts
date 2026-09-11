import type { FittingStatus, FittingResult } from '../types/fittings.types.ts';

export const FITTING_STATUSES: readonly FittingStatus[] = [
  'SCHEDULED',
  'DONE',
  'CANCELLED',
] as const;

export const FITTING_RESULTS: readonly FittingResult[] = [
  'APPROVED',
  'NEEDS_REVISION',
] as const;

export function getFittingStatusLabel(status: FittingStatus | string): string {
  switch (status) {
    case 'SCHEDULED':
      return 'Scheduled';
    case 'DONE':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export function getFittingBadgeVariant(
  status: FittingStatus | string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'DONE':
      return 'default';
    case 'SCHEDULED':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function getFittingResultLabel(result: FittingResult | string | null | undefined): string {
  switch (result) {
    case 'APPROVED':
      return 'Approved';
    case 'NEEDS_REVISION':
      return 'Needs Revision';
    default:
      return 'Pending Outcome';
  }
}

export function getFittingResultBadgeVariant(
  result: FittingResult | string | null | undefined
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (result) {
    case 'APPROVED':
      return 'default';
    case 'NEEDS_REVISION':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Checks whether an order's status allows a fitting appointment to be scheduled.
 * Per BUSINESS-RULES.md#fitting, order must be in IN_PROGRESS, FITTING, or REVISION.
 */
export function canScheduleFitting(orderStatus: string): { allowed: boolean; reason?: string } {
  if (orderStatus === 'DRAFT' || orderStatus === 'CONFIRMED') {
    return {
      allowed: false,
      reason: `Production must be started (IN_PROGRESS) before scheduling fittings. Current status: ${orderStatus}.`,
    };
  }

  if (orderStatus === 'READY' || orderStatus === 'COMPLETED' || orderStatus === 'CANCELLED') {
    return {
      allowed: false,
      reason: `Cannot schedule fittings for orders in ${orderStatus} status.`,
    };
  }

  if (orderStatus === 'IN_PROGRESS' || orderStatus === 'FITTING' || orderStatus === 'REVISION') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Fittings cannot be scheduled for status ${orderStatus}.`,
  };
}

/**
 * Formats an ISO date/time string into readable format (e.g. 11 Sep 2026, 14:00).
 */
export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Formats an ISO date string into readable date (e.g. 11 Sep 2026).
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateStr);
  }
}
