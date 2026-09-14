import { apiClient } from '../../../lib/apiClient.ts';

export interface StoreSettings {
  id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  receiptFooter: string | null;
  updatedAt: string;
}

export interface UpdateStoreSettingsInput {
  name?: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsappPhone?: string | null;
  email?: string | null;
  receiptFooter?: string | null;
}

/**
 * Fetch current store settings (any authenticated user).
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  return apiClient.get<StoreSettings>('/settings');
}

/**
 * Update store settings (owner only).
 */
export async function updateStoreSettings(
  input: UpdateStoreSettingsInput
): Promise<StoreSettings> {
  return apiClient.patch<StoreSettings>('/settings', input);
}
