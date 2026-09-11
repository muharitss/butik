import { apiClient } from '../../../lib/apiClient.ts';
import type { PaginationMeta } from '../../customers/types/customers.types.ts';
import type {
  Order,
  CreateOrderInput,
  UpdateOrderInput,
  TransitionOrderInput,
  ListOrdersQueryParams,
  OrdersListResult,
  OrderItemInput,
} from '../types/orders.types.ts';

export async function fetchOrders(
  params: ListOrdersQueryParams = {}
): Promise<OrdersListResult> {
  const query = new URLSearchParams();
  if (params.q && params.q.trim().length > 0) {
    query.set('q', params.q.trim());
  }
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.dueBefore) {
    query.set('dueBefore', params.dueBefore);
  }
  if (params.dueAfter) {
    query.set('dueAfter', params.dueAfter);
  }
  if (params.page && params.page > 0) {
    query.set('page', String(params.page));
  }
  if (params.pageSize && params.pageSize > 0) {
    query.set('pageSize', String(params.pageSize));
  }

  const qs = query.toString();
  const endpoint = qs ? `/orders?${qs}` : '/orders';

  const envelope = await apiClient.getEnvelope<Order[]>(endpoint);
  const meta = envelope.meta as unknown as PaginationMeta | undefined;

  return {
    orders: envelope.data || [],
    meta: {
      page: meta?.page ?? params.page ?? 1,
      pageSize: meta?.pageSize ?? params.pageSize ?? 20,
      totalItems: meta?.totalItems ?? (envelope.data ? envelope.data.length : 0),
      totalPages: meta?.totalPages ?? 1,
    },
  };
}

export async function fetchOrder(id: string): Promise<Order> {
  return apiClient.get<Order>(`/orders/${id}`);
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  return apiClient.post<Order>('/orders', input);
}

export async function updateOrder(id: string, input: UpdateOrderInput): Promise<Order> {
  return apiClient.patch<Order>(`/orders/${id}`, input);
}

export async function replaceOrderItems(
  id: string,
  items: OrderItemInput[]
): Promise<Order> {
  return apiClient.patch<Order>(`/orders/${id}/items`, { items });
}

export async function transitionOrder(
  id: string,
  input: TransitionOrderInput
): Promise<Order> {
  return apiClient.post<Order>(`/orders/${id}/transition`, input);
}

export async function resnapshotOrder(id: string): Promise<Order> {
  return apiClient.post<Order>(`/orders/${id}/resnapshot`, {});
}
