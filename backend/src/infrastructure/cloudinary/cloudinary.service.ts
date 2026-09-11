import { v2 as cloudinary } from "cloudinary";
export function resolveCloudinaryCredentials() {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  let apiKey = process.env.CLOUDINARY_API_KEY || "";
  let apiSecret = process.env.CLOUDINARY_API_SECRET || "";

  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    const match = cloudinaryUrl.trim().match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      apiKey = match[1] || apiKey;
      apiSecret = match[2] || apiSecret;
      cloudName = match[3] || cloudName;
    }
  }

  return { cloudName, apiKey, apiSecret };
}

const { cloudName, apiKey, apiSecret } = resolveCloudinaryCredentials();

cloudinary.config({
  cloud_name: cloudName || undefined,
  api_key: apiKey || undefined,
  api_secret: apiSecret || undefined,
  secure: true
});

export interface UploadSignaturePayload {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export interface DestroyAssetResult {
  success: boolean;
  result?: string;
  error?: string;
}

// Optional test override for Cloudinary operations (e.g. mock uploader in unit/integration tests)
type DestroyHandler = (publicId: string) => Promise<{ result?: string }>;
let customDestroyHandler: DestroyHandler | null = null;

export function setCloudinaryDestroyHandler(handler: DestroyHandler | null): void {
  customDestroyHandler = handler;
}

/**
 * Generates a signed Cloudinary direct upload payload scoped to an order folder.
 * Uses jahitflow/orders/<orderId> as default folder convention.
 */
export function generateUploadSignature(
  orderId: string,
  customFolder?: string
): UploadSignaturePayload {
  const prefix = process.env.CLOUDINARY_FOLDER_PREFIX || "jahitflow";
  const folder = customFolder || `${prefix}/orders/${orderId}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp
  };

  const { apiKey, apiSecret, cloudName } = resolveCloudinaryCredentials();
  const secret = apiSecret || "mock_secret";
  const signature = cloudinary.utils.api_sign_request(paramsToSign, secret);

  return {
    signature,
    timestamp,
    apiKey: apiKey || "mock_api_key",
    cloudName: cloudName || "mock_cloud_name",
    folder
  };
}

/**
 * Attempts a best-effort delete of an asset from Cloudinary.
 * Per DECISIONS.md#D-006, failures to delete from Cloudinary are logged and
 * do NOT throw errors or block database soft-deletion.
 */
export async function destroyCloudinaryAsset(
  publicId: string
): Promise<DestroyAssetResult> {
  try {
    if (customDestroyHandler) {
      const res = await customDestroyHandler(publicId);
      return { success: true, result: res.result ?? "ok" };
    }

    const res = await cloudinary.uploader.destroy(publicId);
    return { success: true, result: res.result };
  } catch (err: unknown) {
    // ponytail: Best-effort external cleanup. Network or auth failures are logged
    // but never fail the user operation. Orphaned assets can be pruned via batch reconciliation.
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Cloudinary] Best-effort destroy failed for public_id "${publicId}": ${message}`);
    return { success: false, error: message };
  }
}
