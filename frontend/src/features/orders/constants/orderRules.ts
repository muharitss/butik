import type { OrderStatus, PaymentStatus } from '../types/orders.types.ts';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'DRAFT',
  'CONFIRMED',
  'IN_PROGRESS',
  'FITTING',
  'REVISION',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;

/**
 * Verbatim transition table matching backend state machine.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['FITTING', 'READY', 'CANCELLED'],
  FITTING: ['REVISION', 'READY', 'CANCELLED'],
  REVISION: ['FITTING', 'CANCELLED'],
  READY: ['COMPLETED', 'REVISION'],
  COMPLETED: [],
  CANCELLED: [],
};

export function transitionRequiresReason(toStatus: OrderStatus, fromStatus: OrderStatus): boolean {
  if (toStatus === 'CANCELLED') return true;
  if (fromStatus === 'READY' && toStatus === 'REVISION') return true;
  return false;
}

export function getStatusLabel(status: OrderStatus | string): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'IN_PROGRESS':
      return 'In Production';
    case 'FITTING':
      return 'Fitting';
    case 'REVISION':
      return 'Revision';
    case 'READY':
      return 'Ready for Pickup';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export function getStatusBadgeVariant(
  status: OrderStatus | string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'DRAFT':
      return 'outline';
    case 'CONFIRMED':
      return 'secondary';
    case 'IN_PROGRESS':
    case 'FITTING':
    case 'REVISION':
      return 'secondary';
    case 'READY':
    case 'COMPLETED':
      return 'default';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function getPaymentStatusLabel(status: PaymentStatus | string): string {
  switch (status) {
    case 'PAID':
      return 'Fully Paid';
    case 'PARTIAL':
      return 'Partial Down Payment';
    case 'UNPAID':
      return 'Unpaid';
    default:
      return status;
  }
}

export function getPaymentBadgeVariant(
  status: PaymentStatus | string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'PAID':
      return 'default';
    case 'PARTIAL':
      return 'secondary';
    case 'UNPAID':
      return 'outline';
    default:
      return 'outline';
  }
}

export function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return 'Rp 0';
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(numeric)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      dateStyle: 'medium',
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return isoString;
  }
}
