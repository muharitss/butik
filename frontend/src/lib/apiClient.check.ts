import assert from 'node:assert/strict';
import { createApiClient } from './apiClient.ts';
import { ApiClientError } from '../types/api.ts';

async function runSelfChecks() {
  const originalFetch = globalThis.fetch;

  try {
    // 1. Success test: unwraps { data: ... }
    globalThis.fetch = async (input, init) => {
      assert.equal(input, 'http://test.local/api/health');
      assert.equal(init?.method, 'GET');
      return new Response(JSON.stringify({ data: { status: 'ok' }, meta: { timestamp: 12345 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = createApiClient('http://test.local/api');
    const result = await client.get<{ status: string }>('/health');
    assert.deepEqual(result, { status: 'ok' }, 'Should unwrap { data } envelope');

    // 2. Post test: sends JSON body and unwraps { data: ... }
    globalThis.fetch = async (input, init) => {
      assert.equal(input, 'http://test.local/api/customers');
      assert.equal(init?.method, 'POST');
      assert.equal(init?.body, JSON.stringify({ name: 'Jane Doe' }));
      return new Response(JSON.stringify({ data: { id: 'cust-1', name: 'Jane Doe' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const postResult = await client.post<{ id: string; name: string }>('/customers', {
      name: 'Jane Doe',
    });
    assert.equal(postResult.id, 'cust-1', 'Should return created resource data');

    // 3. Error response test: throws ApiClientError with code and message
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Customer name is required',
            details: [{ field: 'name', message: 'required' }],
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    let caughtError: ApiClientError | null = null;
    try {
      await client.post('/customers', {});
    } catch (err) {
      if (err instanceof ApiClientError) {
        caughtError = err;
      }
    }

    assert.ok(caughtError !== null, 'Should throw ApiClientError');
    assert.equal(caughtError.code, 'VALIDATION_ERROR');
    assert.equal(caughtError.message, 'Customer name is required');
    assert.equal(caughtError.statusCode, 400);
    assert.equal((caughtError.details as Array<{ field: string }>)[0]?.field, 'name');

    // 4. HTTP error without envelope
    globalThis.fetch = async () => {
      return new Response('Gateway Timeout', { status: 504 });
    };

    try {
      await client.get('/down');
      assert.fail('Should have thrown on 504');
    } catch (err) {
      assert.ok(err instanceof ApiClientError);
      assert.equal(err.code, 'HTTP_ERROR');
      assert.equal(err.statusCode, 504);
    }

    // 5. Network failure
    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };

    try {
      await client.get('/unreachable');
      assert.fail('Should have thrown on network failure');
    } catch (err) {
      assert.ok(err instanceof ApiClientError);
      assert.equal(err.code, 'NETWORK_ERROR');
      assert.equal(err.statusCode, 0);
    }

    console.log('✓ All apiClient self-checks passed successfully!');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runSelfChecks().catch((err) => {
  console.error('Self check failed:', err);
  process.exit(1);
});
