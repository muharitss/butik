export const ATTACHMENT_TYPES = [
  "CUSTOMER_REFERENCE",
  "GARMENT_REFERENCE",
  "RESULT",
  "OTHER"
] as const;

export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

export const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;

export type AllowedFormat = (typeof ALLOWED_FORMATS)[number];

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Returns the Cloudinary folder convention scoped to an order.
 */
export function getAttachmentFolder(orderId: string): string {
  const prefix = process.env.CLOUDINARY_FOLDER_PREFIX || "jahitflow";
  return `${prefix}/orders/${orderId}`;
}

/**
 * Validates that a Cloudinary public ID matches the order's scoped folder convention.
 */
export function isValidPublicIdForOrder(publicId: string, orderId: string): boolean {
  const expectedFolder = getAttachmentFolder(orderId);
  return publicId.startsWith(`${expectedFolder}/`);
}
