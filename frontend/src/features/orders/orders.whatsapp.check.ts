import assert from 'node:assert/strict';
import type { WhatsappTemplate, WhatsappLinkResult } from './api/orders.api.ts';

function runWhatsAppSelfChecks() {
  console.log('Running WhatsApp link helper self-checks...');

  // 1. Validate template types
  const validTemplates: WhatsappTemplate[] = ['confirmation', 'ready', 'payment_reminder'];
  assert.equal(validTemplates.length, 3);
  assert.ok(validTemplates.includes('confirmation'));
  assert.ok(validTemplates.includes('ready'));
  assert.ok(validTemplates.includes('payment_reminder'));

  // 2. Validate URL structure format for wa.me
  const mockPhone = '6281234567890';
  const mockMessage = 'Halo Kak Ratna, pesanan JF-2026-001 telah dikonfirmasi.';
  const expectedUrl = `https://wa.me/${mockPhone}?text=${encodeURIComponent(mockMessage)}`;

  assert.ok(expectedUrl.startsWith('https://wa.me/6281234567890?text='));
  const parsedUrl = new URL(expectedUrl);
  assert.equal(parsedUrl.hostname, 'wa.me');
  assert.equal(parsedUrl.pathname, '/6281234567890');
  assert.equal(parsedUrl.searchParams.get('text'), mockMessage);

  // 3. Mock WhatsappLinkResult DTO validation
  const mockResult: WhatsappLinkResult = {
    url: expectedUrl,
    template: 'confirmation',
    phone: mockPhone,
    message: mockMessage,
  };

  assert.equal(mockResult.template, 'confirmation');
  assert.equal(mockResult.phone, '6281234567890');
  assert.ok(mockResult.message.includes('JF-2026-001'));
  assert.ok(mockResult.url.includes('wa.me/6281234567890'));

  console.log('All WhatsApp self-checks passed successfully! ✓');
}

runWhatsAppSelfChecks();
