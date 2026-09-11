import { z } from "zod";

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format")
});

export const whatsappTemplateSchema = z.enum([
  "confirmation",
  "ready",
  "payment_reminder"
]);

export const whatsappQuerySchema = z.object({
  template: whatsappTemplateSchema
});

export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type WhatsappTemplate = z.infer<typeof whatsappTemplateSchema>;
export type WhatsappQuery = z.infer<typeof whatsappQuerySchema>;

export interface WhatsappLinkResponse {
  url: string;
  template: WhatsappTemplate;
  phone: string;
  message: string;
}
