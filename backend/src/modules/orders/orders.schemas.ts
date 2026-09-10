import { z } from "zod";

export const orderItemInputSchema = z.object({
  garmentTypeId: z.string().uuid("Invalid garment type ID format"),
  quantity: z.coerce.number().int("Quantity must be an integer").min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  notes: z.string().trim().nullable().optional()
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID format"),
  deadlineAt: z.coerce.date({ message: "Invalid deadline date format" }),
  requiresFitting: z.boolean().optional().default(true),
  items: z.array(orderItemInputSchema).optional().default([]),
  additionalCost: z.coerce.number().min(0, "Additional cost must be non-negative").default(0),
  expressFee: z.coerce.number().min(0, "Express fee must be non-negative").default(0),
  discount: z.coerce.number().min(0, "Discount must be non-negative").default(0),
  notes: z.string().trim().nullable().optional()
});

export const replaceOrderItemsSchema = z.object({
  items: z.array(orderItemInputSchema)
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid("Invalid order ID format")
});

export const transitionOrderSchema = z.object({
  toStatus: z.enum([
    "DRAFT",
    "CONFIRMED",
    "IN_PROGRESS",
    "FITTING",
    "REVISION",
    "READY",
    "COMPLETED",
    "CANCELLED"
  ]),
  reason: z.string().trim().nullable().optional()
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ReplaceOrderItemsInput = z.infer<typeof replaceOrderItemsSchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type TransitionOrderInput = z.infer<typeof transitionOrderSchema>;
