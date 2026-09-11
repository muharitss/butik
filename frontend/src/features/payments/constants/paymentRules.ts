import type { PaymentType, PaymentPreviewResult } from '../types/payments.types.ts';
import { formatCurrency } from '../../orders/constants/orderRules.ts';

export const PAYMENT_TYPES: readonly PaymentType[] = [
  'DP',
  'PARTIAL',
  'FINAL',
  'ADJUSTMENT',
] as const;

export const COMMON_PAYMENT_METHODS: readonly string[] = [
  'Cash',
  'Bank Transfer',
  'QRIS',
  'Debit Card',
  'Credit Card',
] as const;

export function getPaymentTypeLabel(type: PaymentType | string): string {
  switch (type) {
    case 'DP':
      return 'Down Payment (DP)';
    case 'PARTIAL':
      return 'Partial Payment';
    case 'FINAL':
      return 'Final Settlement';
    case 'ADJUSTMENT':
      return 'Adjustment / Refund';
    default:
      return type;
  }
}

export function getPaymentTypeBadgeVariant(
  type: PaymentType | string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (type) {
    case 'FINAL':
      return 'default';
    case 'DP':
      return 'secondary';
    case 'PARTIAL':
      return 'outline';
    case 'ADJUSTMENT':
      return 'destructive';
    default:
      return 'outline';
  }
}

export interface CalculatePreviewParams {
  orderTotal: number | string;
  currentPaidTotal: number | string;
  type: PaymentType;
  amount: number | string;
  note?: string | null;
}

export function calculatePaymentPreview({
  orderTotal,
  currentPaidTotal,
  type,
  amount,
  note,
}: CalculatePreviewParams): PaymentPreviewResult {
  const numericAmount = Number(amount) || 0;
  const currentPaid = Number(currentPaidTotal) || 0;
  const total = Number(orderTotal) || 0;
  const currentRemaining = Math.max(0, total - currentPaid);

  const resultingPaidTotal = currentPaid + numericAmount;
  const resultingRemainingBalance = total - resultingPaidTotal;

  let resultingStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  if (resultingPaidTotal <= 0) {
    resultingStatus = 'UNPAID';
  } else if (resultingPaidTotal < total) {
    resultingStatus = 'PARTIAL';
  } else {
    resultingStatus = 'PAID';
  }

  if (type !== 'ADJUSTMENT') {
    const wouldOverpay = numericAmount > currentRemaining;
    if (numericAmount <= 0) {
      return {
        numericAmount,
        resultingPaidTotal,
        resultingRemainingBalance,
        wouldOverpay: false,
        resultingStatus,
        isValid: false,
        validationError: 'Payment amount must be greater than zero.',
      };
    }

    if (wouldOverpay) {
      return {
        numericAmount,
        resultingPaidTotal,
        resultingRemainingBalance,
        wouldOverpay: true,
        resultingStatus,
        isValid: false,
        validationError: `Payment amount exceeds remaining balance of ${formatCurrency(currentRemaining)}.`,
      };
    }

    return {
      numericAmount,
      resultingPaidTotal,
      resultingRemainingBalance,
      wouldOverpay: false,
      resultingStatus,
      isValid: true,
      validationError: null,
    };
  }

  // ADJUSTMENT branch
  if (numericAmount === 0) {
    return {
      numericAmount,
      resultingPaidTotal,
      resultingRemainingBalance,
      wouldOverpay: false,
      resultingStatus,
      isValid: false,
      validationError: 'Adjustment amount cannot be zero.',
    };
  }

  if (!note || note.trim().length === 0) {
    return {
      numericAmount,
      resultingPaidTotal,
      resultingRemainingBalance,
      wouldOverpay: false,
      resultingStatus,
      isValid: false,
      validationError: 'A note explaining the reason is required for adjustments/refunds.',
    };
  }

  return {
    numericAmount,
    resultingPaidTotal,
    resultingRemainingBalance,
    wouldOverpay: false,
    resultingStatus,
    isValid: true,
    validationError: null,
  };
}
