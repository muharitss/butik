import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";

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
 */
export async function canDeleteCustomer(
  customerId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<boolean> {
  const activeOrder = await tx.order.findFirst({
    where: {
      customerId,
      status: { not: "CANCELLED" }
    },
    select: { id: true }
  });
  return !activeOrder;
}
