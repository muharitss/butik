import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusBadgeVariant,
  getPaymentStatusLabel,
  getPaymentBadgeVariant,
} from '../../orders/constants/orderRules.ts';

export {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusBadgeVariant,
  getPaymentStatusLabel,
  getPaymentBadgeVariant,
};

export function formatDateTime(isoString?: string | null): string {
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

export function getPaymentTypeLabel(type: string): string {
  switch (type) {
    case 'DP':
      return 'Down Payment (DP)';
    case 'PARTIAL':
      return 'Installment / Partial';
    case 'FINAL':
      return 'Final Settlement';
    case 'ADJUSTMENT':
      return 'Adjustment / Refund';
    default:
      return type;
  }
}
