import type { AttachmentType, OrderAttachment } from '../types/attachments.types.ts';

export const ATTACHMENT_TYPES: AttachmentType[] = [
  'CUSTOMER_REFERENCE',
  'GARMENT_REFERENCE',
  'RESULT',
  'OTHER',
];

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  CUSTOMER_REFERENCE: 'Customer Reference',
  GARMENT_REFERENCE: 'Garment Reference',
  RESULT: 'Finished Result',
  OTHER: 'Other',
};

export const ATTACHMENT_TYPE_DESCRIPTIONS: Record<AttachmentType, string> = {
  CUSTOMER_REFERENCE: 'Inspiration photos, sketches, and style ideas provided by client',
  GARMENT_REFERENCE: 'Fabric swatches, pattern cuts, and tailoring construction details',
  RESULT: 'Fitting trial photos and finished bespoke garment showcase',
  OTHER: 'Measurement notes, tags, receipts, and general references',
};

export const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateAttachmentFile(file: File | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'The selected file is empty.' };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 10 MB.`,
    };
  }

  // Check file extension and MIME type
  const extensionMatch = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const matchesExt = extensionMatch && allowedExtensions.includes(extensionMatch);
  const matchesMime = file.type && allowedMimeTypes.includes(file.type.toLowerCase());

  if (!matchesExt && !matchesMime) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload JPG, PNG, or WebP images only.',
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDimensions(width?: number | null, height?: number | null): string {
  if (!width || !height) return '';
  return `${width} × ${height} px`;
}

export function formatAttachmentDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function canModifyAttachments(orderStatus: string): boolean {
  return orderStatus !== 'CANCELLED';
}

export function groupAttachmentsByType(
  attachments: OrderAttachment[]
): Record<AttachmentType, OrderAttachment[]> {
  const groups: Record<AttachmentType, OrderAttachment[]> = {
    CUSTOMER_REFERENCE: [],
    GARMENT_REFERENCE: [],
    RESULT: [],
    OTHER: [],
  };

  for (const att of attachments) {
    if (groups[att.type]) {
      groups[att.type].push(att);
    } else {
      groups.OTHER.push(att);
    }
  }

  return groups;
}
