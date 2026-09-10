import { apiClient } from '../../../lib/apiClient.ts';
import type {
  Customer,
  CustomerInput,
  PaginationMeta,
  PossibleDuplicate,
} from '../types/customers.types.ts';

export interface CustomerListResult {
  customers: Customer[];
  meta: PaginationMeta;
}

export interface CustomerCreateResult {
  customer: Customer;
  possibleDuplicate?: PossibleDuplicate;
}

export async function fetchCustomers(params: {
  q?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<CustomerListResult> {
  const query = new URLSearchParams();
  if (params.q && params.q.trim().length > 0) {
    query.set('q', params.q.trim());
  }
  if (params.page && params.page > 0) {
    query.set('page', String(params.page));
  }
  if (params.pageSize && params.pageSize > 0) {
    query.set('pageSize', String(params.pageSize));
  }

  const qs = query.toString();
  const endpoint = qs ? `/customers?${qs}` : '/customers';

  const envelope = await apiClient.getEnvelope<Customer[]>(endpoint);
  const meta = envelope.meta as unknown as PaginationMeta | undefined;

  return {
    customers: envelope.data || [],
    meta: {
      page: meta?.page ?? params.page ?? 1,
      pageSize: meta?.pageSize ?? params.pageSize ?? 20,
      totalItems: meta?.totalItems ?? (envelope.data ? envelope.data.length : 0),
      totalPages: meta?.totalPages ?? 1,
    },
  };
}

export async function fetchCustomer(id: string): Promise<Customer> {
  return apiClient.get<Customer>(`/customers/${id}`);
}

export async function createCustomer(input: CustomerInput): Promise<CustomerCreateResult> {
  const envelope = await apiClient.postEnvelope<Customer>('/customers', input);
  const meta = envelope.meta as { possibleDuplicate?: PossibleDuplicate } | undefined;

  return {
    customer: envelope.data,
    possibleDuplicate: meta?.possibleDuplicate,
  };
}

export async function updateCustomer(
  id: string,
  input: Partial<CustomerInput>
): Promise<Customer> {
  return apiClient.patch<Customer>(`/customers/${id}`, input);
}

export async function deleteCustomer(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiClient.delete<{ id: string; deleted: boolean }>(`/customers/${id}`);
}
