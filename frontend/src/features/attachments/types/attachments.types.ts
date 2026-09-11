export type AttachmentType =
  | 'CUSTOMER_REFERENCE'
  | 'GARMENT_REFERENCE'
  | 'RESULT'
  | 'OTHER';

export interface OrderAttachment {
  id: string;
  orderId: string;
  type: AttachmentType;
  cloudinaryPublicId: string;
  secureUrl: string;
  format: string | null;
  width: number | null;
  height: number | null;
  uploadedBy: string | null;
  uploadedAt: string;
  deletedAt: string | null;
}

export interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export interface CreateAttachmentPayload {
  type: AttachmentType;
  cloudinaryPublicId: string;
  secureUrl: string;
  format?: string | null;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
}

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  resource_type?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface AttachmentUploadState {
  uploading: boolean;
  progressPercent: number;
  statusText: string;
  error: string | null;
}
