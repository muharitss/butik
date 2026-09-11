import { apiClient } from '../../../lib/apiClient.ts';
import type {
  AttachmentType,
  CloudinaryUploadResponse,
  CreateAttachmentPayload,
  OrderAttachment,
  UploadSignatureResponse,
} from '../types/attachments.types.ts';

/**
 * Fetches all non-deleted attachments for an order.
 */
export async function fetchOrderAttachments(orderId: string): Promise<OrderAttachment[]> {
  return apiClient.get<OrderAttachment[]>(`/orders/${orderId}/attachments`);
}

/**
 * Requests a signed direct-upload payload from the backend.
 */
export async function getUploadSignature(orderId: string): Promise<UploadSignatureResponse> {
  return apiClient.post<UploadSignatureResponse>(`/orders/${orderId}/attachments/upload-signature`);
}

/**
 * Uploads a file directly to Cloudinary using XMLHttpRequest for upload progress tracking.
 * This does not pass through the backend server (per DECISIONS.md#D-006).
 */
export function uploadToCloudinaryDirect(
  signatureData: UploadSignatureResponse,
  file: File,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signatureData.apiKey);
    formData.append('timestamp', String(signatureData.timestamp));
    formData.append('signature', signatureData.signature);
    formData.append('folder', signatureData.folder);

    const xhr = new XMLHttpRequest();
    const uploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`;

    xhr.open('POST', uploadUrl);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      let data: Record<string, unknown> | null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && data) {
        resolve(data as unknown as CloudinaryUploadResponse);
      } else {
        const errorMsg =
          (data?.error as { message?: string } | undefined)?.message ||
          xhr.statusText ||
          `Cloudinary upload failed with status ${xhr.status}`;
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during file upload to Cloudinary.'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload operation was aborted.'));
    };

    xhr.send(formData);
  });
}

/**
 * Registers attachment metadata with the backend after a successful direct upload.
 */
export async function registerAttachmentMetadata(
  orderId: string,
  payload: CreateAttachmentPayload
): Promise<OrderAttachment> {
  return apiClient.post<OrderAttachment>(`/orders/${orderId}/attachments`, payload);
}

/**
 * Soft-deletes an attachment via the backend API.
 */
export async function deleteAttachment(
  orderId: string,
  attachmentId: string
): Promise<{ id: string; deleted: boolean }> {
  return apiClient.delete<{ id: string; deleted: boolean }>(
    `/orders/${orderId}/attachments/${attachmentId}`
  );
}

/**
 * High-level orchestration for direct upload flow per DECISIONS.md#D-006:
 * 1. Request signature from backend
 * 2. Upload file directly to Cloudinary (reporting real progress)
 * 3. Register metadata with backend ONLY upon successful upload
 *
 * If step 2 fails, step 3 is never invoked, preventing orphaned rows.
 */
export async function uploadAttachmentFlow(
  orderId: string,
  type: AttachmentType,
  file: File,
  onProgress?: (percent: number) => void
): Promise<OrderAttachment> {
  // Step 1: Request signature
  const signatureData = await getUploadSignature(orderId);

  // Step 2: Direct upload to Cloudinary
  const cloudinaryResult = await uploadToCloudinaryDirect(signatureData, file, onProgress);

  // Step 3: Register metadata with backend
  const payload: CreateAttachmentPayload = {
    type,
    cloudinaryPublicId: cloudinaryResult.public_id,
    secureUrl: cloudinaryResult.secure_url,
    format: cloudinaryResult.format ?? null,
    width: cloudinaryResult.width ? Number(cloudinaryResult.width) : null,
    height: cloudinaryResult.height ? Number(cloudinaryResult.height) : null,
    bytes: cloudinaryResult.bytes ? Number(cloudinaryResult.bytes) : null,
  };

  return registerAttachmentMetadata(orderId, payload);
}
