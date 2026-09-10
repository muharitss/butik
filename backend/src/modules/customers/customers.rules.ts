/**
 * Normalizes phone numbers for duplicate comparison and WhatsApp linking.
 * Strips all non-digit characters and standardizes Indonesian prefixes (0 -> 62).
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) {
    return "62" + digits.slice(1);
  }
  if (digits.startsWith("62")) {
    return digits;
  }
  return digits;
}

/**
 * Checks if a customer can be soft-deleted.
 * Per BUSINESS-RULES.md#customer, customer deletion is blocked if active (non-cancelled) orders exist.
 *
 * TODO(TASK-016 or later): enforce order-existence check once the orders table exists.
 * Currently stubbed to return true per TASK-006 specification.
 */
export async function canDeleteCustomer(_customerId: string): Promise<boolean> {
  return true;
}
