import assert from 'node:assert/strict';
import {
  canCreateRevision,
  canTransitionRevision,
  getRevisionStatusLabel,
  getRevisionBadgeVariant,
  countOpenRevisions,
  hasOpenRevisions,
  formatDateTime,
  formatDate,
} from './constants/revisionRules.ts';
import {
  fetchOrderRevisions,
  createRevision,
  updateRevision,
} from './api/revisions.api.ts';
import type { Revision } from './types/revisions.types.ts';

async function runRevisionSelfChecks() {
  console.log('Running revisions self-checks...');

  // 1. canCreateRevision checks
  assert.equal(canCreateRevision('IN_PROGRESS').allowed, true);
  assert.equal(canCreateRevision('FITTING').allowed, true);
  assert.equal(canCreateRevision('REVISION').allowed, true);
  assert.equal(canCreateRevision('READY').allowed, true);
  assert.equal(canCreateRevision('DRAFT').allowed, true);
  assert.equal(canCreateRevision('CONFIRMED').allowed, true);

  const completedCheck = canCreateRevision('COMPLETED');
  assert.equal(completedCheck.allowed, false);
  assert.match(completedCheck.reason || '', /completed/i);

  const cancelledCheck = canCreateRevision('CANCELLED');
  assert.equal(cancelledCheck.allowed, false);
  assert.match(cancelledCheck.reason || '', /cancelled/i);

  // 2. canTransitionRevision state machine checks
  // From OPEN
  assert.equal(canTransitionRevision('OPEN', 'OPEN'), true);
  assert.equal(canTransitionRevision('OPEN', 'IN_PROGRESS'), true);
  assert.equal(canTransitionRevision('OPEN', 'RESOLVED'), true);
  assert.equal(canTransitionRevision('OPEN', 'CANCELLED'), true);

  // From IN_PROGRESS
  assert.equal(canTransitionRevision('IN_PROGRESS', 'IN_PROGRESS'), true);
  assert.equal(canTransitionRevision('IN_PROGRESS', 'RESOLVED'), true);
  assert.equal(canTransitionRevision('IN_PROGRESS', 'CANCELLED'), true);
  assert.equal(canTransitionRevision('IN_PROGRESS', 'OPEN'), false);

  // Terminal states
  assert.equal(canTransitionRevision('RESOLVED', 'RESOLVED'), true);
  assert.equal(canTransitionRevision('RESOLVED', 'OPEN'), false);
  assert.equal(canTransitionRevision('RESOLVED', 'IN_PROGRESS'), false);
  assert.equal(canTransitionRevision('RESOLVED', 'CANCELLED'), false);

  assert.equal(canTransitionRevision('CANCELLED', 'CANCELLED'), true);
  assert.equal(canTransitionRevision('CANCELLED', 'OPEN'), false);
  assert.equal(canTransitionRevision('CANCELLED', 'IN_PROGRESS'), false);
  assert.equal(canTransitionRevision('CANCELLED', 'RESOLVED'), false);

  // 3. Open revision counter checks
  const mockRevisions: Revision[] = [
    {
      id: 'rev-1',
      orderId: 'ord-1',
      fittingId: 'fit-1',
      issue: 'Waist tight',
      requestedChange: 'Let out 2cm',
      status: 'OPEN',
      notes: null,
      resolvedAt: null,
      createdAt: '2026-09-11T10:00:00.000Z',
      updatedAt: '2026-09-11T10:00:00.000Z',
    },
    {
      id: 'rev-2',
      orderId: 'ord-1',
      fittingId: 'fit-1',
      issue: 'Hem long',
      requestedChange: 'Shorten 1cm',
      status: 'IN_PROGRESS',
      notes: 'Work underway',
      resolvedAt: null,
      createdAt: '2026-09-11T10:05:00.000Z',
      updatedAt: '2026-09-11T10:10:00.000Z',
    },
    {
      id: 'rev-3',
      orderId: 'ord-1',
      fittingId: null,
      issue: 'Sleeve pitch',
      requestedChange: null,
      status: 'RESOLVED',
      notes: 'Completed',
      resolvedAt: '2026-09-11T11:00:00.000Z',
      createdAt: '2026-09-11T09:00:00.000Z',
      updatedAt: '2026-09-11T11:00:00.000Z',
    },
    {
      id: 'rev-4',
      orderId: 'ord-1',
      fittingId: null,
      issue: 'Collar gap',
      requestedChange: null,
      status: 'CANCELLED',
      notes: 'Not needed',
      resolvedAt: null,
      createdAt: '2026-09-11T09:00:00.000Z',
      updatedAt: '2026-09-11T09:30:00.000Z',
    },
  ];

  assert.equal(countOpenRevisions(mockRevisions), 2);
  assert.equal(hasOpenRevisions(mockRevisions), true);
  assert.equal(countOpenRevisions([]), 0);
  assert.equal(hasOpenRevisions([]), false);
  assert.equal(countOpenRevisions(mockRevisions.slice(2)), 0);
  assert.equal(hasOpenRevisions(mockRevisions.slice(2)), false);

  // 4. Status labels and badge variants
  assert.equal(getRevisionStatusLabel('OPEN'), 'Open');
  assert.equal(getRevisionStatusLabel('IN_PROGRESS'), 'In Progress');
  assert.equal(getRevisionStatusLabel('RESOLVED'), 'Resolved');
  assert.equal(getRevisionStatusLabel('CANCELLED'), 'Cancelled');

  assert.equal(getRevisionBadgeVariant('OPEN'), 'secondary');
  assert.equal(getRevisionBadgeVariant('IN_PROGRESS'), 'default');
  assert.equal(getRevisionBadgeVariant('RESOLVED'), 'outline');
  assert.equal(getRevisionBadgeVariant('CANCELLED'), 'destructive');

  // 5. Formatting helpers
  assert.equal(formatDateTime(null), '—');
  assert.equal(formatDate(null), '—');
  const validIso = '2026-09-11T14:30:00.000Z';
  assert.notEqual(formatDateTime(validIso), '—');
  assert.notEqual(formatDate(validIso), '—');

  // 6. API client requests with mock globalThis.fetch
  const originalFetch = globalThis.fetch;
  const mockOrderId = 'a0000000-0000-0000-0000-000000000001';
  const mockRevisionId = 'r0000000-0000-0000-0000-000000000001';

  try {
    // 6a. fetchOrderRevisions
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes(`/api/orders/${mockOrderId}/revisions`));
      assert.equal(init?.method, 'GET');
      return new Response(
        JSON.stringify({
          success: true,
          data: mockRevisions,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const revisions = await fetchOrderRevisions(mockOrderId);
    assert.equal(revisions.length, 4);
    assert.equal(revisions[0].issue, 'Waist tight');

    // 6b. createRevision
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes(`/api/orders/${mockOrderId}/revisions`));
      assert.equal(init?.method, 'POST');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.issue, 'Take in bust seam');
      assert.equal(body.requestedChange, '1.5 cm');

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: mockRevisionId,
            orderId: mockOrderId,
            fittingId: null,
            issue: body.issue,
            requestedChange: body.requestedChange,
            status: 'OPEN',
            notes: null,
            resolvedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const created = await createRevision(mockOrderId, {
      issue: 'Take in bust seam',
      requestedChange: '1.5 cm',
    });
    assert.equal(created.id, mockRevisionId);
    assert.equal(created.status, 'OPEN');

    // 6c. updateRevision
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes(`/api/orders/${mockOrderId}/revisions/${mockRevisionId}`));
      assert.equal(init?.method, 'PATCH');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.status, 'RESOLVED');

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...mockRevisions[0],
            status: 'RESOLVED',
            resolvedAt: new Date().toISOString(),
          },
          meta: {
            remainingOpenRevisions: 0,
            allRevisionsResolved: true,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const updated = await updateRevision(mockOrderId, mockRevisionId, {
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
    });
    assert.equal(updated.status, 'RESOLVED');
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('✔ All revision self-checks passed successfully!');
}

runRevisionSelfChecks().catch((err) => {
  console.error('Self-check failed:', err);
  process.exit(1);
});
