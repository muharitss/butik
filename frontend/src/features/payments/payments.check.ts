import assert from 'node:assert/strict';
import {
  calculatePaymentPreview,
  getPaymentTypeLabel,
  getPaymentTypeBadgeVariant,
} from './constants/paymentRules.ts';
import {
  fetchOrderPayments,
  createOrderPayment,
} from './api/payments.api.ts';
import type { Payment } from './types/payments.types.ts';

async function runPaymentSelfChecks() {
  console.log('Running payments self-checks...');

  // 1. calculatePaymentPreview logic checks
  const orderTotal = 500000;

  // Case 1: Initial DP
  const dpPreview = calculatePaymentPreview({
    orderTotal,
    currentPaidTotal: 0,
    type: 'DP',
    amount: 250000,
  });
  assert.equal(dpPreview.isValid, true);
  assert.equal(dpPreview.numericAmount, 250000);
  assert.equal(dpPreview.resultingPaidTotal, 250000);
  assert.equal(dpPreview.resultingRemainingBalance, 250000);
  assert.equal(dpPreview.wouldOverpay, false);
  assert.equal(dpPreview.resultingStatus, 'PARTIAL');

  // Case 2: Zero or negative non-adjustment rejected
  const zeroPreview = calculatePaymentPreview({
    orderTotal,
    currentPaidTotal: 0,
    type: 'DP',
    amount: 0,
  });
  assert.equal(zeroPreview.isValid, false);
  assert.match(zeroPreview.validationError || '', /greater than zero/i);

  const negNonAdjPreview = calculatePaymentPreview({
    orderTotal,
    currentPaidTotal: 250000,
    type: 'PARTIAL',
    amount: -50000,
  });
  assert.equal(negNonAdjPreview.isValid, false);
  assert.match(negNonAdjPreview.validationError || '', /greater than zero/i);

  // Case 3: Overpayment rejected for non-adjustment
  const overpayPreview = calculatePaymentPreview({
    orderTotal,
    currentPaidTotal: 250000,
    type: 'PARTIAL',
    amount: 300000, // Remaining is 250,000, so 300,000 would overpay
  });
  assert.equal(overpayPreview.isValid, false);
  assert.equal(overpayPreview.wouldOverpay, true);
  assert.match(overpayPreview.validationError || '', /exceeds remaining balance/i);

  // Case 4: Final exact settlement reaching PAID
  const finalPreview = calculatePaymentPreview({
    orderTotal,
    currentPaidTotal: 250000,
    type: 'FINAL',
    amount: 250000,
  });
  assert.equal(finalPreview.isValid, true);
  assert.equal(finalPreview.resultingPaidTotal, 500000);
  assert.equal(finalPreview.resultingRemainingBalance, 0);
  assert.equal(finalPreview.resultingStatus, 'PAID');

  // Case 5: ADJUSTMENT requires note and non-zero amount
  const adjNoNote = calculatePaymentPreview({
    orderTotal,
    currentPaidTotal: 500000,
    type: 'ADJUSTMENT',
    amount: -50000,
    note: '',
  });
  assert.equal(adjNoNote.isValid, false);
  assert.match(adjNoNote.validationError || '', /note/i);

  const adjZeroAmount = calculatePaymentPreview({
    orderTotal,
    currentPaidTotal: 500000,
    type: 'ADJUSTMENT',
    amount: 0,
    note: 'Customer requested refund',
  });
  assert.equal(adjZeroAmount.isValid, false);
  assert.match(adjZeroAmount.validationError || '', /cannot be zero/i);

  // Case 6: ADJUSTMENT refund reduces paid total and updates status
  const adjRefund = calculatePaymentPreview({
    orderTotal,
    currentPaidTotal: 500000,
    type: 'ADJUSTMENT',
    amount: -100000,
    note: 'Partial deposit return due to scope change',
  });
  assert.equal(adjRefund.isValid, true);
  assert.equal(adjRefund.numericAmount, -100000);
  assert.equal(adjRefund.resultingPaidTotal, 400000);
  assert.equal(adjRefund.resultingRemainingBalance, 100000);
  assert.equal(adjRefund.resultingStatus, 'PARTIAL');

  // 2. Format / UI helper checks
  assert.equal(getPaymentTypeLabel('DP'), 'Down Payment (DP)');
  assert.equal(getPaymentTypeLabel('ADJUSTMENT'), 'Adjustment / Refund');
  assert.equal(getPaymentTypeBadgeVariant('FINAL'), 'default');
  assert.equal(getPaymentTypeBadgeVariant('ADJUSTMENT'), 'destructive');

  // 3. API client fetch & create payment checks with mock globalThis.fetch
  const originalFetch = globalThis.fetch;
  const mockOrderId = 'a0000000-0000-0000-0000-000000000001';

  try {
    // 3a. fetchOrderPayments
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes(`/api/orders/${mockOrderId}/payments`));
      assert.equal(init?.method, 'GET');

      const mockResponse: { data: Payment[] } = {
        data: [
          {
            id: 'pay-1',
            orderId: mockOrderId,
            type: 'DP',
            amount: 250000,
            method: 'Bank Transfer',
            note: 'Initial deposit',
            reversedPaymentId: null,
            recordedBy: 'usr-1',
            recordedAt: new Date().toISOString(),
          },
        ],
      };

      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const payments = await fetchOrderPayments(mockOrderId);
    assert.equal(payments.length, 1);
    assert.equal(payments[0].id, 'pay-1');
    assert.equal(payments[0].type, 'DP');
    assert.equal(payments[0].amount, 250000);

    // 3b. createOrderPayment
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes(`/api/orders/${mockOrderId}/payments`));
      assert.equal(init?.method, 'POST');

      const body = JSON.parse(String(init?.body));
      assert.equal(body.type, 'FINAL');
      assert.equal(body.amount, 250000);
      assert.equal(body.method, 'QRIS');

      const mockCreated: { data: Payment } = {
        data: {
          id: 'pay-2',
          orderId: mockOrderId,
          type: 'FINAL',
          amount: 250000,
          method: 'QRIS',
          note: null,
          reversedPaymentId: null,
          recordedBy: 'usr-1',
          recordedAt: new Date().toISOString(),
        },
      };

      return new Response(JSON.stringify(mockCreated), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const created = await createOrderPayment(mockOrderId, {
      type: 'FINAL',
      amount: 250000,
      method: 'QRIS',
    });
    assert.equal(created.id, 'pay-2');
    assert.equal(created.type, 'FINAL');
    assert.equal(created.amount, 250000);
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('✔ All payment self-checks passed successfully!');
}

runPaymentSelfChecks().catch((err) => {
  console.error('Payment self-check failed:', err);
  process.exit(1);
});
