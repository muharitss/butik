import { apiClient } from '../../../lib/apiClient.ts';
import type { Payment, CreatePaymentInput } from '../types/payments.types.ts';

export async function fetchOrderPayments(orderId: string): Promise<Payment[]> {
  return apiClient.get<Payment[]>(`/orders/${orderId}/payments`);
}

export async function createOrderPayment(
  orderId: string,
  input: CreatePaymentInput
): Promise<Payment> {
  return apiClient.post<Payment>(`/orders/${orderId}/payments`, input);
}
