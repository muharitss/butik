import { z } from "zod";

export const updateStoreSettingsSchema = z.object({
  name: z.string().trim().min(1, "Store name cannot be empty").optional(),
  tagline: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  whatsappPhone: z.string().trim().nullable().optional(),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .toLowerCase()
    .nullable()
    .optional()
    .or(z.literal("")),
  receiptFooter: z.string().trim().nullable().optional()
});

export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsSchema>;

export interface StoreSettingsDto {
  id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  receiptFooter: string | null;
  updatedAt: Date | string;
}
