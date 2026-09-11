import { apiClient } from '../../../lib/apiClient.ts';
import type { Fitting, CreateFittingInput, UpdateFittingInput } from '../types/fittings.types.ts';

export async function fetchOrderFittings(orderId: string): Promise<Fitting[]> {
  return apiClient.get<Fitting[]>(`/orders/${orderId}/fittings`);
}

export async function scheduleFitting(
  orderId: string,
  input: CreateFittingInput
): Promise<Fitting> {
  return apiClient.post<Fitting>(`/orders/${orderId}/fittings`, input);
}

export async function updateFitting(
  orderId: string,
  fittingId: string,
  input: UpdateFittingInput
): Promise<Fitting> {
  return apiClient.patch<Fitting>(`/orders/${orderId}/fittings/${fittingId}`, input);
}
