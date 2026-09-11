import { z } from "zod";
import {
  ATTACHMENT_TYPES,
  ALLOWED_FORMATS,
  MAX_ATTACHMENT_SIZE_BYTES
} from "./attachments.rules.js";

export const orderIdParamSchema = z
  .object({
    orderId: z.string().uuid("Invalid order ID format")
  })
  .passthrough();

export type OrderIdParam = z.infer<typeof orderIdParamSchema>;

export const attachmentIdParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  id: z.string().uuid("Invalid attachment ID format")
});

export type AttachmentIdParam = z.infer<typeof attachmentIdParamSchema>;

export const createAttachmentSchema = z.object({
  type: z.enum(ATTACHMENT_TYPES),
  cloudinaryPublicId: z.string().trim().min(1, "Cloudinary public ID is required"),
  secureUrl: z.string().trim().url("Valid secure URL is required"),
  format: z
    .string()
    .trim()
    .toLowerCase()
    .refine((val) => ALLOWED_FORMATS.includes(val as (typeof ALLOWED_FORMATS)[number]), {
      message: "Format must be jpg, jpeg, png, or webp"
    })
    .optional()
    .nullable(),
  width: z.coerce.number().int().positive("Width must be a positive integer").optional().nullable(),
  height: z.coerce.number().int().positive("Height must be a positive integer").optional().nullable(),
  bytes: z
    .coerce
    .number()
    .int()
    .positive("Size must be positive")
    .max(MAX_ATTACHMENT_SIZE_BYTES, "Attachment size exceeds 10MB limit")
    .optional()
    .nullable()
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
