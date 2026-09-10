import { z } from "zod";

export const customerIdParamSchema = z.object({
  id: z.string().uuid("Invalid customer ID format")
});

export const customerQuerySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const createCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Customer name is required"),
  phone: z
    .string()
    .trim()
    .nullable()
    .optional(),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .or(z.literal(""))
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
  address: z
    .string()
    .trim()
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .nullable()
    .optional()
});

export const updateCustomerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Customer name cannot be empty")
      .optional(),
    phone: z
      .string()
      .trim()
      .nullable()
      .optional(),
    email: z
      .string()
      .trim()
      .email("Invalid email format")
      .or(z.literal(""))
      .nullable()
      .optional()
      .transform((val) => (val === "" ? null : val)),
    address: z
      .string()
      .trim()
      .nullable()
      .optional(),
    notes: z
      .string()
      .trim()
      .nullable()
      .optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
  });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryParams = z.infer<typeof customerQuerySchema>;
export type CustomerIdParam = z.infer<typeof customerIdParamSchema>;
