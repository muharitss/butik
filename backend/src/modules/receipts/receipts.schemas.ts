import { z } from "zod";

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format")
});

export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
