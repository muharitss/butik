import assert from 'node:assert/strict';
import {
  canScheduleFitting,
  getFittingStatusLabel,
  getFittingBadgeVariant,
  getFittingResultLabel,
  getFittingResultBadgeVariant,
  formatDateTime,
  formatDate,
} from './constants/fittingRules.ts';
import {
  fetchOrderFittings,
  scheduleFitting,
  updateFitting,
} from './api/fittings.api.ts';
import type { Fitting } from './types/fittings.types.ts';

async function runFittingSelfChecks() {
  console.log('Running fittings self-checks...');

  // 1. canScheduleFitting business rule checks
  assert.equal(canScheduleFitting('IN_PROGRESS').allowed, true);
  assert.equal(canScheduleFitting('FITTING').allowed, true);
  assert.equal(canScheduleFitting('REVISION').allowed, true);

  const draftCheck = canScheduleFitting('DRAFT');
  assert.equal(draftCheck.allowed, false);
  assert.match(draftCheck.reason || '', /Production must be started/i);

  const confirmedCheck = canScheduleFitting('CONFIRMED');
  assert.equal(confirmedCheck.allowed, false);
  assert.match(confirmedCheck.reason || '', /Production must be started/i);

  const readyCheck = canScheduleFitting('READY');
  assert.equal(readyCheck.allowed, false);
  assert.match(readyCheck.reason || '', /Cannot schedule fittings/i);

  const completedCheck = canScheduleFitting('COMPLETED');
  assert.equal(completedCheck.allowed, false);
  assert.match(completedCheck.reason || '', /Cannot schedule fittings/i);

  const cancelledCheck = canScheduleFitting('CANCELLED');
  assert.equal(cancelledCheck.allowed, false);
  assert.match(cancelledCheck.reason || '', /Cannot schedule fittings/i);

  // 2. Status / result labels & badge variants
  assert.equal(getFittingStatusLabel('SCHEDULED'), 'Scheduled');
  assert.equal(getFittingStatusLabel('DONE'), 'Completed');
  assert.equal(getFittingStatusLabel('CANCELLED'), 'Cancelled');

  assert.equal(getFittingBadgeVariant('DONE'), 'default');
  assert.equal(getFittingBadgeVariant('SCHEDULED'), 'secondary');
  assert.equal(getFittingBadgeVariant('CANCELLED'), 'destructive');

  assert.equal(getFittingResultLabel('APPROVED'), 'Approved');
  assert.equal(getFittingResultLabel('NEEDS_REVISION'), 'Needs Revision');
  assert.equal(getFittingResultLabel(null), 'Pending Outcome');

  assert.equal(getFittingResultBadgeVariant('APPROVED'), 'default');
  assert.equal(getFittingResultBadgeVariant('NEEDS_REVISION'), 'destructive');
  assert.equal(getFittingResultBadgeVariant(null), 'outline');

  // 3. Formatting helpers
  assert.equal(formatDateTime(null), '—');
  assert.equal(formatDate(null), '—');
  const validIso = '2026-09-11T14:30:00.000Z';
  assert.notEqual(formatDateTime(validIso), '—');
  assert.notEqual(formatDate(validIso), '—');

  // 4. API client requests with mock globalThis.fetch
  const originalFetch = globalThis.fetch;
  const mockOrderId = 'b0000000-0000-0000-0000-000000000001';
  const mockFittingId = 'c0000000-0000-0000-0000-000000000001';

  try {
    // 4a. fetchOrderFittings
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes(`/api/orders/${mockOrderId}/fittings`));
      assert.equal(init?.method, 'GET');

      const mockResponse: { data: Fitting[] } = {
        data: [
          {
            id: mockFittingId,
            orderId: mockOrderId,
            fittingNumber: 1,
            status: 'SCHEDULED',
            scheduledAt: validIso,
            occurredAt: null,
            result: null,
            notes: 'First fitting session',
            nextAction: null,
            createdAt: validIso,
            updatedAt: validIso,
          },
        ],
      };

      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const fittings = await fetchOrderFittings(mockOrderId);
    assert.equal(fittings.length, 1);
    assert.equal(fittings[0].id, mockFittingId);
    assert.equal(fittings[0].fittingNumber, 1);
    assert.equal(fittings[0].status, 'SCHEDULED');

    // 4b. scheduleFitting
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes(`/api/orders/${mockOrderId}/fittings`));
      assert.equal(init?.method, 'POST');

      const body = JSON.parse(String(init?.body));
      assert.equal(body.notes, 'Check shoulder width');

      const mockCreated: { data: Fitting } = {
        data: {
          id: 'c0000000-0000-0000-0000-000000000002',
          orderId: mockOrderId,
          fittingNumber: 2,
          status: 'SCHEDULED',
          scheduledAt: validIso,
          occurredAt: null,
          result: null,
          notes: body.notes,
          nextAction: null,
          createdAt: validIso,
          updatedAt: validIso,
        },
      };

      return new Response(JSON.stringify(mockCreated), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const scheduled = await scheduleFitting(mockOrderId, {
      notes: 'Check shoulder width',
    });
    assert.equal(scheduled.fittingNumber, 2);
    assert.equal(scheduled.status, 'SCHEDULED');
    assert.equal(scheduled.notes, 'Check shoulder width');

    // 4c. updateFitting
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes(`/api/orders/${mockOrderId}/fittings/${mockFittingId}`));
      assert.equal(init?.method, 'PATCH');

      const body = JSON.parse(String(init?.body));
      assert.equal(body.status, 'DONE');
      assert.equal(body.result, 'NEEDS_REVISION');

      const mockUpdated: { data: Fitting } = {
        data: {
          id: mockFittingId,
          orderId: mockOrderId,
          fittingNumber: 1,
          status: 'DONE',
          scheduledAt: validIso,
          occurredAt: validIso,
          result: 'NEEDS_REVISION',
          notes: 'Waist too loose',
          nextAction: 'Take in 2cm',
          createdAt: validIso,
          updatedAt: validIso,
        },
      };

      return new Response(JSON.stringify(mockUpdated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const updated = await updateFitting(mockOrderId, mockFittingId, {
      status: 'DONE',
      result: 'NEEDS_REVISION',
      occurredAt: validIso,
      notes: 'Waist too loose',
      nextAction: 'Take in 2cm',
    });
    assert.equal(updated.status, 'DONE');
    assert.equal(updated.result, 'NEEDS_REVISION');
    assert.equal(updated.nextAction, 'Take in 2cm');
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('✔ All fitting self-checks passed successfully!');
}

runFittingSelfChecks().catch((err) => {
  console.error('Fitting self-check failed:', err);
  process.exit(1);
});
