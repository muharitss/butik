import type { Customer, PaginationMeta } from '../../customers/types/customers.types.ts';
import type { GarmentType } from '../../garments/types/garments.types.ts';
import type { Payment } from '../../payments/types/payments.types.ts';

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'FITTING'
  | 'REVISION'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface OrderItem {
  id: string;
  orderId: string;
  garmentTypeId: string;
  quantity: number;
  unitPrice: number | string;
  subtotal: number | string;
  notes: string | null;
  garmentType?: GarmentType;
}

export interface OrderItemInput {
  garmentTypeId: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
}

export interface OrderMeasurementSnapshotValue {
  id: string;
  orderMeasurementSnapshotId: string;
  fieldKey: string;
  value: number | string;
  unit: string;
}

export interface OrderMeasurementSnapshot {
  id: string;
  orderId: string;
  sourceMeasurementVersionId: string;
  createdAt: string;
  supersededByResnapshotAt: string | null;
  values: OrderMeasurementSnapshotValue[];
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  reason: string | null;
  changedAt: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
  } | null;
}

export interface PaymentsSummary {
  paidTotal: number | string;
  remainingBalance: number | string;
  paymentStatus: PaymentStatus | string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  requiresFitting: boolean;
  orderDate: string;
  deadlineAt: string;
  subtotal: number | string;
  additionalCost: number | string;
  expressFee: number | string;
  discount: number | string;
  total: number | string;
  paidTotalCache: number | string;
  paymentStatusCache: PaymentStatus;
  notes: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;

  customer?: Customer;
  items?: OrderItem[];
  measurementSnapshots?: OrderMeasurementSnapshot[];
  measurementSnapshot?: OrderMeasurementSnapshot | null;
  statusHistories?: OrderStatusHistory[];
  paymentsSummary?: PaymentsSummary;
  payments?: Payment[];
  fittings?: unknown[];
  revisions?: unknown[];
  attachments?: unknown[];
}

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  requiresFitting: boolean;
  orderDate: string;
  deadlineAt: string;
  total: number | string;
  paidTotalCache: number | string;
  paymentStatusCache: PaymentStatus;
  createdAt: string;
}

export interface CreateOrderInput {
  customerId: string;
  deadlineAt: string;
  requiresFitting?: boolean;
  items?: OrderItemInput[];
  additionalCost?: number;
  expressFee?: number;
  discount?: number;
  notes?: string | null;
}

export interface UpdateOrderInput {
  deadlineAt?: string;
  requiresFitting?: boolean;
  additionalCost?: number;
  expressFee?: number;
  discount?: number;
  notes?: string | null;
}

export interface TransitionOrderInput {
  toStatus: OrderStatus;
  reason?: string | null;
}

export interface ListOrdersQueryParams {
  q?: string;
  status?: OrderStatus;
  dueBefore?: string;
  dueAfter?: string;
  page?: number;
  pageSize?: number;
}

export interface OrdersListResult {
  orders: Order[];
  meta: PaginationMeta;
}
