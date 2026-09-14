import assert from 'node:assert/strict';
import {
  fetchCustomers,
  fetchCustomer,
  fetchCustomerPayments,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './api/customers.api.ts';

async function runCustomerSelfChecks() {
  const originalFetch = globalThis.fetch;

  try {
    // 1. fetchCustomers with query and pagination
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes('/api/customers?q=Siti&page=2&pageSize=10'));
      assert.equal(init?.method, 'GET');
      return new Response(
        JSON.stringify({
          data: [{ id: 'cust-1', name: 'Siti Rahmawati' }],
          meta: { page: 2, pageSize: 10, totalItems: 25, totalPages: 3 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const listRes = await fetchCustomers({ q: 'Siti', page: 2, pageSize: 10 });
    assert.equal(listRes.customers.length, 1);
    assert.equal(listRes.customers[0].name, 'Siti Rahmawati');
    assert.equal(listRes.meta.page, 2);
    assert.equal(listRes.meta.totalPages, 3);
    assert.equal(listRes.meta.totalItems, 25);

    // 2. fetchCustomer by ID with CRM aggregates
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/customers/cust-1');
      assert.equal(init?.method, 'GET');
      return new Response(
        JSON.stringify({
          data: {
            id: 'cust-1',
            name: 'Siti Rahmawati',
            phone: '081234567890',
            email: 'siti@example.com',
            address: 'Jakarta',
            notes: 'VIP customer',
            orderCount: 3,
            totalSpending: '1500000.00',
            outstandingBalance: '300000.00',
            lastOrderAt: '2026-09-12T10:00:00.000Z',
            measurementVersionCount: 2,
            createdAt: '2026-09-10T12:00:00.000Z',
            updatedAt: '2026-09-10T12:00:00.000Z',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const singleRes = await fetchCustomer('cust-1');
    assert.equal(singleRes.id, 'cust-1');
    assert.equal(singleRes.name, 'Siti Rahmawati');
    assert.equal(singleRes.phone, '081234567890');
    assert.equal(singleRes.orderCount, 3);
    assert.equal(singleRes.totalSpending, '1500000.00');
    assert.equal(singleRes.outstandingBalance, '300000.00');
    assert.equal(singleRes.measurementVersionCount, 2);

    // 3. fetchCustomerPayments
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.ok(url.includes('/api/customers/cust-1/payments?page=1&pageSize=10'));
      assert.equal(init?.method, 'GET');
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'pay-1',
              orderId: 'order-1',
              orderNumber: 'JF-2026-0001',
              type: 'DP',
              amount: '500000',
              method: 'Bank Transfer',
              note: 'Down payment',
              recordedAt: '2026-09-11T14:00:00.000Z',
            },
          ],
          meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const paymentsRes = await fetchCustomerPayments('cust-1', { page: 1, pageSize: 10 });
    assert.equal(paymentsRes.payments.length, 1);
    assert.equal(paymentsRes.payments[0].orderNumber, 'JF-2026-0001');
    assert.equal(paymentsRes.payments[0].amount, '500000');
    assert.equal(paymentsRes.meta.totalItems, 1);

    // 4. createCustomer with possibleDuplicate meta
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/customers');
      assert.equal(init?.method, 'POST');
      assert.deepEqual(JSON.parse(String(init?.body)), {
        name: 'Siti Baru',
        phone: '081234567890',
        email: null,
        address: null,
        notes: null,
      });
      return new Response(
        JSON.stringify({
          data: { id: 'cust-2', name: 'Siti Baru', phone: '081234567890' },
          meta: {
            possibleDuplicate: { id: 'cust-1', name: 'Siti Rahmawati' },
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const createRes = await createCustomer({
      name: 'Siti Baru',
      phone: '081234567890',
      email: null,
      address: null,
      notes: null,
    });
    assert.equal(createRes.customer.id, 'cust-2');
    assert.equal(createRes.possibleDuplicate?.id, 'cust-1');
    assert.equal(createRes.possibleDuplicate?.name, 'Siti Rahmawati');

    // 5. updateCustomer
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/customers/cust-1');
      assert.equal(init?.method, 'PATCH');
      assert.deepEqual(JSON.parse(String(init?.body)), { notes: 'Updated note' });
      return new Response(
        JSON.stringify({
          data: { id: 'cust-1', name: 'Siti Rahmawati', notes: 'Updated note' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const updateRes = await updateCustomer('cust-1', { notes: 'Updated note' });
    assert.equal(updateRes.notes, 'Updated note');

    // 6. deleteCustomer
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), '/api/customers/cust-1');
      assert.equal(init?.method, 'DELETE');
      return new Response(
        JSON.stringify({
          data: { id: 'cust-1', deleted: true },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const deleteRes = await deleteCustomer('cust-1');
    assert.equal(deleteRes.id, 'cust-1');
    assert.equal(deleteRes.deleted, true);

    console.log('✓ All Customer feature self-checks passed successfully!');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runCustomerSelfChecks().catch((err) => {
  console.error('Customer self-check failed:', err);
  process.exit(1);
});
