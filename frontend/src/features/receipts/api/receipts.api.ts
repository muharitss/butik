import { apiClient } from '../../../lib/apiClient.ts';
import type { ReceiptDTO } from '../types/receipts.types.ts';

/**
 * Fetches the printable receipt data DTO for a given order.
 * GET /api/orders/:orderId/receipt
 */
export async function fetchOrderReceipt(orderId: string): Promise<ReceiptDTO> {
  return apiClient.get<ReceiptDTO>(`/orders/${orderId}/receipt`);
}
