import assert from 'node:assert/strict';
import {
  fetchOrders,
  fetchOrder,
  createOrder,
  updateOrder,
  replaceOrderItems,
  transitionOrder,
  resnapshotOrder,
} from './api/orders.api.ts';
import {
  ALLOWED_TRANSITIONS,
  transitionRequiresReason,
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusBadgeVariant,
} from './constants/orderRules.ts';

async function runOrdersSelfChecks() {
  const originalFetch = globalThis.fetch;

  try {
    // 1. fetchOrders with query and pagination
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes('/api/orders'));
      assert.ok(url.includes('q=ORD-2026'));
      assert.ok(url.includes('status=CONFIRMED'));
      assert.ok(url.includes('page=2'));
      assert.ok(url.includes('pageSize=10'));
      assert.equal(init?.method, 'GET');

      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'ord-123',
              orderNumber: 'ORD-2026-0001',
              customerId: 'cust-1',
              status: 'CONFIRMED',
              total: 500000,
            },
          ],
          meta: { page: 2, pageSize: 10, totalItems: 15, totalPages: 2 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const listRes = await fetchOrders({
      q: 'ORD-2026',
      status: 'CONFIRMED',
      page: 2,
      pageSize: 10,
    });
    assert.equal(listRes.orders.length, 1);
    assert.equal(listRes.orders[0].orderNumber, 'ORD-2026-0001');
    assert.equal(listRes.meta.page, 2);
    assert.equal(listRes.meta.totalPages, 2);
    assert.equal(listRes.meta.totalItems, 15);

    // 2. fetchOrder by ID
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/orders/ord-123');
      assert.equal(init?.method, 'GET');

      return new Response(
        JSON.stringify({
          data: {
            id: 'ord-123',
            orderNumber: 'ORD-2026-0001',
            customerId: 'cust-1',
            status: 'CONFIRMED',
            deadlineAt: '2026-10-15T10:00:00.000Z',
            total: 500000,
            items: [],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const singleOrder = await fetchOrder('ord-123');
    assert.equal(singleOrder.id, 'ord-123');
    assert.equal(singleOrder.orderNumber, 'ORD-2026-0001');
    assert.equal(singleOrder.status, 'CONFIRMED');

    // 3. createOrder
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/orders');
      assert.equal(init?.method, 'POST');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.customerId, 'cust-1');
      assert.equal(body.items.length, 1);
      assert.equal(body.items[0].quantity, 2);
      assert.equal(body.items[0].unitPrice, 150000);

      return new Response(
        JSON.stringify({
          data: {
            id: 'ord-new',
            orderNumber: 'ORD-2026-0002',
            customerId: 'cust-1',
            status: 'DRAFT',
            total: 300000,
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const created = await createOrder({
      customerId: 'cust-1',
      deadlineAt: '2026-10-20T17:00:00.000Z',
      items: [
        {
          garmentTypeId: 'garment-1',
          quantity: 2,
          unitPrice: 150000,
          notes: 'Standard fit',
        },
      ],
    });
    assert.equal(created.id, 'ord-new');
    assert.equal(created.status, 'DRAFT');

    // 4. transitionOrder
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/orders/ord-new/transition');
      assert.equal(init?.method, 'POST');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.toStatus, 'CONFIRMED');

      return new Response(
        JSON.stringify({
          data: {
            id: 'ord-new',
            orderNumber: 'ORD-2026-0002',
            customerId: 'cust-1',
            status: 'CONFIRMED',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const transitioned = await transitionOrder('ord-new', { toStatus: 'CONFIRMED' });
    assert.equal(transitioned.status, 'CONFIRMED');

    // 5. updateOrder
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/orders/ord-new');
      assert.equal(init?.method, 'PATCH');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.additionalCost, 50000);

      return new Response(
        JSON.stringify({
          data: {
            id: 'ord-new',
            additionalCost: 50000,
            total: 350000,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const updated = await updateOrder('ord-new', { additionalCost: 50000 });
    assert.equal(updated.additionalCost, 50000);

    // 6. replaceOrderItems
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/orders/ord-new/items');
      assert.equal(init?.method, 'PATCH');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.items.length, 1);
      assert.equal(body.items[0].quantity, 3);

      return new Response(
        JSON.stringify({
          data: {
            id: 'ord-new',
            items: [{ id: 'item-1', quantity: 3, unitPrice: 150000, subtotal: 450000 }],
            total: 450000,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const replaced = await replaceOrderItems('ord-new', [
      { garmentTypeId: 'garment-1', quantity: 3, unitPrice: 150000 },
    ]);
    assert.equal(replaced.items?.length, 1);
    assert.equal(replaced.items?.[0].quantity, 3);

    // 7. resnapshotOrder
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/orders/ord-new/resnapshot');
      assert.equal(init?.method, 'POST');

      return new Response(
        JSON.stringify({
          data: {
            id: 'ord-new',
            measurementSnapshot: {
              id: 'snap-2',
              values: [{ fieldKey: 'lingkar_dada', value: 96, unit: 'cm' }],
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const resnapshotted = await resnapshotOrder('ord-new');
    assert.equal(resnapshotted.measurementSnapshot?.values[0].fieldKey, 'lingkar_dada');

    // 8. State Machine & Rules Validation
    assert.deepEqual(ALLOWED_TRANSITIONS['DRAFT'], ['CONFIRMED', 'CANCELLED']);
    assert.deepEqual(ALLOWED_TRANSITIONS['CONFIRMED'], ['IN_PROGRESS', 'CANCELLED']);
    assert.deepEqual(ALLOWED_TRANSITIONS['IN_PROGRESS'], ['FITTING', 'READY', 'CANCELLED']);
    assert.deepEqual(ALLOWED_TRANSITIONS['FITTING'], ['REVISION', 'READY', 'CANCELLED']);
    assert.deepEqual(ALLOWED_TRANSITIONS['REVISION'], ['FITTING', 'CANCELLED']);
    assert.deepEqual(ALLOWED_TRANSITIONS['READY'], ['COMPLETED', 'REVISION']);
    assert.deepEqual(ALLOWED_TRANSITIONS['COMPLETED'], []);
    assert.deepEqual(ALLOWED_TRANSITIONS['CANCELLED'], []);

    // Reason requirement
    assert.equal(transitionRequiresReason('CANCELLED', 'DRAFT'), true);
    assert.equal(transitionRequiresReason('CANCELLED', 'CONFIRMED'), true);
    assert.equal(transitionRequiresReason('REVISION', 'READY'), true);
    assert.equal(transitionRequiresReason('CONFIRMED', 'DRAFT'), false);
    assert.equal(transitionRequiresReason('IN_PROGRESS', 'CONFIRMED'), false);

    // Formatting helpers
    assert.ok(formatCurrency(250000).includes('250.000'));
    assert.ok(formatDate('2026-10-15T10:00:00.000Z').length > 0);
    assert.ok(formatDateTime('2026-10-15T10:00:00.000Z').length > 0);
    assert.equal(getStatusLabel('DRAFT'), 'Draft');
    assert.equal(getStatusLabel('READY'), 'Ready for Pickup');
    assert.equal(getStatusBadgeVariant('DRAFT'), 'outline');
    assert.equal(getStatusBadgeVariant('CANCELLED'), 'destructive');

    console.log('✔ All order UI self-checks passed successfully.');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runOrdersSelfChecks().catch((err) => {
  console.error('❌ Orders self-checks failed:', err);
  process.exit(1);
});
