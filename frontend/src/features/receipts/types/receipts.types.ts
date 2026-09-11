export interface BoutiqueInfo {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email?: string | null;
}

export interface ReceiptItem {
  id: string;
  garmentTypeName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  notes?: string | null;
}

export interface ReceiptTotals {
  subtotal: string;
  additionalCost: string;
  expressFee: string;
  discount: string;
  total: string;
}

export interface ReceiptPaymentRecord {
  id: string;
  type: string;
  amount: string;
  method?: string | null;
  note?: string | null;
  recordedAt: string;
}

export interface ReceiptPaymentsSummary {
  paidTotal: string;
  remainingBalance: string;
  paymentStatus: string;
  payments: ReceiptPaymentRecord[];
}

export interface ReceiptDTO {
  boutique: BoutiqueInfo;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  deadlineAt: string;
  status: string;
  notes?: string | null;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  items: ReceiptItem[];
  totals: ReceiptTotals;
  paymentsSummary: ReceiptPaymentsSummary;
  generatedAt: string;
}
