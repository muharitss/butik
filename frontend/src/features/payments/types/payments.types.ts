export type PaymentType = 'DP' | 'PARTIAL' | 'FINAL' | 'ADJUSTMENT';

export interface PaymentUser {
  id: string;
  name?: string;
  email?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  type: PaymentType;
  amount: number | string;
  method: string | null;
  note: string | null;
  reversedPaymentId: string | null;
  recordedBy: string | null;
  recordedAt: string;
  reversedPayment?: Payment | null;
  user?: PaymentUser | null;
}

export interface CreatePaymentInput {
  type: PaymentType;
  amount: number;
  method?: string | null;
  note?: string | null;
  reversedPaymentId?: string | null;
}

export interface PaymentPreviewResult {
  numericAmount: number;
  resultingPaidTotal: number;
  resultingRemainingBalance: number;
  wouldOverpay: boolean;
  resultingStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  isValid: boolean;
  validationError: string | null;
}
