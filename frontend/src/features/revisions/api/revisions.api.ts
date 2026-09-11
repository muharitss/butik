import { apiClient } from '../../../lib/apiClient.ts';
import type { Revision, CreateRevisionInput, UpdateRevisionInput } from '../types/revisions.types.ts';

export async function fetchOrderRevisions(orderId: string): Promise<Revision[]> {
  return apiClient.get<Revision[]>(`/orders/${orderId}/revisions`);
}

export async function createRevision(
  orderId: string,
  input: CreateRevisionInput
): Promise<Revision> {
  return apiClient.post<Revision>(`/orders/${orderId}/revisions`, input);
}

export async function updateRevision(
  orderId: string,
  revisionId: string,
  input: UpdateRevisionInput
): Promise<Revision> {
  return apiClient.patch<Revision>(`/orders/${orderId}/revisions/${revisionId}`, input);
}
