import type { CustomerOrderSummary } from '../../orders/types/orders.types.ts';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  orders?: CustomerOrderSummary[];
  orderCount?: number;
  totalSpending?: string | number;
  outstandingBalance?: string | number;
  lastOrderAt?: string | null;
  measurementVersionCount?: number;
}

export interface CustomerPaymentHistoryItem {
  id: string;
  orderId: string;
  orderNumber: string;
  type: string;
  amount: string | number;
  method: string | null;
  note: string | null;
  recordedAt: string;
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface PossibleDuplicate {
  id: string;
  name: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
