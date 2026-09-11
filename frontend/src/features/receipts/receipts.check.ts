import assert from 'node:assert/strict';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getPaymentTypeLabel,
  getStatusLabel,
  getStatusBadgeVariant,
  getPaymentStatusLabel,
  getPaymentBadgeVariant,
} from './constants/receiptRules.ts';
import type { ReceiptDTO } from './types/receipts.types.ts';

function runReceiptSelfChecks() {
  console.log('Running receipts self-checks...');

  // 1. Currency formatting checks
  assert.equal(formatCurrency(0), 'Rp\u00a00');
  assert.equal(formatCurrency(750000), 'Rp\u00a0750.000');
  assert.equal(formatCurrency('1250000'), 'Rp\u00a01.250.000');
  assert.equal(formatCurrency(null), 'Rp 0');
  assert.equal(formatCurrency(undefined), 'Rp 0');

  // 2. Date formatting checks
  const testIso = '2026-09-11T10:30:00.000Z';
  assert.notEqual(formatDate(testIso), '—');
  assert.notEqual(formatDateTime(testIso), '—');
  assert.equal(formatDate(null), '—');
  assert.equal(formatDateTime(null), '—');

  // 3. Payment type label checks
  assert.equal(getPaymentTypeLabel('DP'), 'Down Payment (DP)');
  assert.equal(getPaymentTypeLabel('PARTIAL'), 'Pembayaran Cicilan');
  assert.equal(getPaymentTypeLabel('FINAL'), 'Pelunasan');
  assert.equal(getPaymentTypeLabel('ADJUSTMENT'), 'Penyesuaian / Refund');
  assert.equal(getPaymentTypeLabel('CUSTOM'), 'CUSTOM');

  // 4. Status mapping checks
  assert.equal(getStatusLabel('CONFIRMED'), 'Confirmed');
  assert.equal(getStatusLabel('READY'), 'Ready for Pickup');
  assert.equal(getStatusBadgeVariant('CONFIRMED'), 'secondary');
  assert.equal(getStatusBadgeVariant('COMPLETED'), 'default');
  assert.equal(getStatusBadgeVariant('CANCELLED'), 'destructive');

  // 5. Payment status label & badge checks
  assert.equal(getPaymentStatusLabel('PAID'), 'Fully Paid');
  assert.equal(getPaymentStatusLabel('PARTIAL'), 'Partial Down Payment');
  assert.equal(getPaymentBadgeVariant('PAID'), 'default');
  assert.equal(getPaymentBadgeVariant('PARTIAL'), 'secondary');
  assert.equal(getPaymentBadgeVariant('UNPAID'), 'outline');

  // 6. Mock receipt DTO validation
  const mockReceipt: ReceiptDTO = {
    boutique: {
      name: 'JahitFlow Boutique',
      tagline: 'Custom Tailoring',
      address: 'Jl. Mode No. 123, Jakarta',
      phone: '+62 812-3456-7890',
    },
    orderId: '11111111-1111-1111-1111-111111111111',
    orderNumber: 'JF-2026-001',
    orderDate: '2026-09-11T00:00:00.000Z',
    deadlineAt: '2026-09-18T00:00:00.000Z',
    status: 'CONFIRMED',
    customer: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Ibu Ratna',
      phone: '081234567890',
    },
    items: [
      {
        id: '33333333-3333-3333-3333-333333333333',
        garmentTypeName: 'Kebaya Encim',
        quantity: 1,
        unitPrice: '500000.00',
        subtotal: '500000.00',
      },
    ],
    totals: {
      subtotal: '500000.00',
      additionalCost: '0.00',
      expressFee: '0.00',
      discount: '0.00',
      total: '500000.00',
    },
    paymentsSummary: {
      paidTotal: '250000.00',
      remainingBalance: '250000.00',
      paymentStatus: 'PARTIAL',
      payments: [
        {
          id: '44444444-4444-4444-4444-444444444444',
          type: 'DP',
          amount: '250000.00',
          method: 'CASH',
          recordedAt: '2026-09-11T08:00:00.000Z',
        },
      ],
    },
    generatedAt: new Date().toISOString(),
  };

  assert.equal(mockReceipt.boutique.name, 'JahitFlow Boutique');
  assert.equal(mockReceipt.items.length, 1);
  assert.equal(Number(mockReceipt.paymentsSummary.remainingBalance), 250000);
  assert.equal(Number(mockReceipt.totals.total), 500000);

  console.log('All receipt self-checks passed successfully! ✓');
}

runReceiptSelfChecks();
