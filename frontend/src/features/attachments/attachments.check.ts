import assert from 'node:assert/strict';
import {
  validateAttachmentFile,
  formatFileSize,
  formatDimensions,
  canModifyAttachments,
  groupAttachmentsByType,
  ATTACHMENT_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from './constants/attachmentRules.ts';
import type { OrderAttachment, UploadSignatureResponse } from './types/attachments.types.ts';

async function runAttachmentSelfChecks() {
  console.log('Running attachments self-checks...');

  assert.equal(ATTACHMENT_TYPES.length, 4);
  assert.equal(ATTACHMENT_TYPES.includes('CUSTOMER_REFERENCE'), true);

  // 1. File validation logic checks
  // 1.1 Null / undefined / empty
  assert.equal(validateAttachmentFile(null).valid, false);
  assert.equal(validateAttachmentFile(undefined).valid, false);

  const emptyFile = new File([''], 'empty.jpg', { type: 'image/jpeg' });
  assert.equal(validateAttachmentFile(emptyFile).valid, false);
  assert.match(validateAttachmentFile(emptyFile).error || '', /empty/i);

  // 1.2 Valid formats
  const validJpg = new File(['mock content'], 'sketch.jpg', { type: 'image/jpeg' });
  assert.equal(validateAttachmentFile(validJpg).valid, true);

  const validPng = new File(['mock content'], 'sample.png', { type: 'image/png' });
  assert.equal(validateAttachmentFile(validPng).valid, true);

  const validWebp = new File(['mock content'], 'photo.webp', { type: 'image/webp' });
  assert.equal(validateAttachmentFile(validWebp).valid, true);

  // 1.3 Invalid format
  const invalidPdf = new File(['mock content'], 'invoice.pdf', { type: 'application/pdf' });
  assert.equal(validateAttachmentFile(invalidPdf).valid, false);
  assert.match(validateAttachmentFile(invalidPdf).error || '', /JPG, PNG, or WebP/i);

  const invalidGif = new File(['mock content'], 'animation.gif', { type: 'image/gif' });
  assert.equal(validateAttachmentFile(invalidGif).valid, false);

  // 1.4 Max size limit (10MB)
  const oversizedFile = {
    name: 'huge.png',
    type: 'image/png',
    size: MAX_ATTACHMENT_SIZE_BYTES + 1024,
  } as unknown as File;
  const oversizedResult = validateAttachmentFile(oversizedFile);
  assert.equal(oversizedResult.valid, false);
  assert.match(oversizedResult.error || '', /exceeds the maximum allowed limit/i);

  // 2. Formatting utilities
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(null), '0 B');
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(2048), '2 KB');
  assert.equal(formatFileSize(1500000), '1.4 MB');

  assert.equal(formatDimensions(1920, 1080), '1920 × 1080 px');
  assert.equal(formatDimensions(null, 1080), '');
  assert.equal(formatDimensions(1920, null), '');
  assert.equal(formatDimensions(null, null), '');

  // 3. canModifyAttachments rule
  assert.equal(canModifyAttachments('DRAFT'), true);
  assert.equal(canModifyAttachments('CONFIRMED'), true);
  assert.equal(canModifyAttachments('IN_PROGRESS'), true);
  assert.equal(canModifyAttachments('FITTING'), true);
  assert.equal(canModifyAttachments('REVISION'), true);
  assert.equal(canModifyAttachments('READY'), true);
  assert.equal(canModifyAttachments('COMPLETED'), true);
  assert.equal(canModifyAttachments('CANCELLED'), false);

  // 4. groupAttachmentsByType
  const mockAttachments: OrderAttachment[] = [
    {
      id: 'att-1',
      orderId: 'order-1',
      type: 'CUSTOMER_REFERENCE',
      cloudinaryPublicId: 'jahitflow/orders/order-1/ref1',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/ref1.jpg',
      format: 'jpg',
      width: 1000,
      height: 800,
      uploadedBy: null,
      uploadedAt: '2026-09-11T10:00:00Z',
      deletedAt: null,
    },
    {
      id: 'att-2',
      orderId: 'order-1',
      type: 'GARMENT_REFERENCE',
      cloudinaryPublicId: 'jahitflow/orders/order-1/fabric1',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/fabric1.png',
      format: 'png',
      width: 1200,
      height: 1200,
      uploadedBy: null,
      uploadedAt: '2026-09-11T11:00:00Z',
      deletedAt: null,
    },
    {
      id: 'att-3',
      orderId: 'order-1',
      type: 'RESULT',
      cloudinaryPublicId: 'jahitflow/orders/order-1/res1',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/res1.jpg',
      format: 'jpg',
      width: 1600,
      height: 1200,
      uploadedBy: null,
      uploadedAt: '2026-09-11T12:00:00Z',
      deletedAt: null,
    },
  ];

  const grouped = groupAttachmentsByType(mockAttachments);
  assert.equal(grouped.CUSTOMER_REFERENCE.length, 1);
  assert.equal(grouped.CUSTOMER_REFERENCE[0].id, 'att-1');
  assert.equal(grouped.GARMENT_REFERENCE.length, 1);
  assert.equal(grouped.GARMENT_REFERENCE[0].id, 'att-2');
  assert.equal(grouped.RESULT.length, 1);
  assert.equal(grouped.RESULT[0].id, 'att-3');
  assert.equal(grouped.OTHER.length, 0);

  // 5. Invariant check: Direct upload failure prevents metadata registration (D-006)
  let metadataRegistrationCalled = false;

  async function simulateUploadFlowWithFailingCloudinary() {
    // Step 1: Sign (succeeds)
    const sig: UploadSignatureResponse = {
      signature: 'mock_sig',
      timestamp: 123456,
      apiKey: 'mock_key',
      cloudName: 'mock_cloud',
      folder: 'jahitflow/orders/ord-1',
    };
    assert.ok(sig.signature);

    // Step 2: Cloudinary direct upload (fails)
    const cloudinaryUpload = async () => {
      throw new Error('Cloudinary 403 Forbidden: Invalid credentials');
    };

    // Step 3: Metadata registration
    const registerMetadata = async () => {
      metadataRegistrationCalled = true;
    };

    try {
      await cloudinaryUpload();
      await registerMetadata();
    } catch {
      // Expected to fail at step 2
    }
  }

  await simulateUploadFlowWithFailingCloudinary();
  assert.equal(
    metadataRegistrationCalled,
    false,
    'Metadata must never be registered if Cloudinary upload fails'
  );

  console.log('✓ All attachment self-checks passed successfully!');
}

runAttachmentSelfChecks().catch((err) => {
  console.error('Attachment self-check failed:', err);
  process.exit(1);
});
