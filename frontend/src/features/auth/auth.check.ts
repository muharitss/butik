import assert from 'node:assert/strict';
import { authApi } from './api/auth.api.ts';
import { setOnUnauthorizedCallback, createApiClient } from '../../lib/apiClient.ts';
import { ApiClientError } from '../../types/api.ts';

async function runAuthSelfChecks() {
  console.log('Running auth feature self-checks...');
  const originalFetch = globalThis.fetch;

  try {
    // 1. authApi.login success
    globalThis.fetch = async (input, init) => {
      assert.equal(input, '/api/auth/login');
      assert.equal(init?.method, 'POST');
      assert.equal(
        init?.body,
        JSON.stringify({ email: 'operator@jahitflow.com', password: 'OperatorPass123!' })
      );

      return new Response(
        JSON.stringify({
          data: {
            id: 'user-op-1',
            name: 'Operator',
            role: 'owner',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const loginRes = await authApi.login({
      email: 'operator@jahitflow.com',
      password: 'OperatorPass123!',
    });
    assert.equal(loginRes.id, 'user-op-1');
    assert.equal(loginRes.name, 'Operator');
    assert.equal(loginRes.role, 'owner');

    // 2. authApi.login failure (401 with generic error envelope)
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    let caughtError: ApiClientError | null = null;
    let unauthorizedCallbackFired = false;
    setOnUnauthorizedCallback(() => {
      unauthorizedCallbackFired = true;
    });

    try {
      await authApi.login({
        email: 'wrong@jahitflow.com',
        password: 'bad-password',
      });
      assert.fail('Should have thrown ApiClientError on 401');
    } catch (err) {
      if (err instanceof ApiClientError) {
        caughtError = err;
      }
    }

    assert.ok(caughtError !== null, 'Should catch ApiClientError');
    assert.equal(caughtError.code, 'UNAUTHORIZED');
    assert.equal(caughtError.message, 'Invalid email or password');
    assert.equal(caughtError.statusCode, 401);
    // Crucial: login 401 MUST NOT trigger onUnauthorizedCallback
    assert.equal(
      unauthorizedCallbackFired,
      false,
      'authApi.login should skip auth interceptor to prevent redirect loops'
    );

    // 3. authApi.getMe
    globalThis.fetch = async (input, init) => {
      assert.equal(input, '/api/auth/me');
      assert.equal(init?.method, 'GET');
      return new Response(
        JSON.stringify({
          data: {
            id: 'user-op-1',
            name: 'Operator',
            email: 'operator@jahitflow.com',
            role: 'owner',
            isActive: true,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const meRes = await authApi.getMe();
    assert.equal(meRes.id, 'user-op-1');
    assert.equal(meRes.name, 'Operator');
    assert.equal(meRes.role, 'owner');
    assert.equal(meRes.isActive, true);

    // 4. authApi.logout
    globalThis.fetch = async (input, init) => {
      assert.equal(input, '/api/auth/logout');
      assert.equal(init?.method, 'POST');
      return new Response(
        JSON.stringify({
          data: { loggedOut: true },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const logoutRes = await authApi.logout();
    assert.equal(logoutRes.loggedOut, true);

    // 5. 401 Interceptor on regular API calls
    let interceptorFired = false;
    setOnUnauthorizedCallback(() => {
      interceptorFired = true;
    });

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const testClient = createApiClient('http://test.local/api');
    try {
      await testClient.get('/orders');
      assert.fail('Should fail with 401');
    } catch (err) {
      assert.ok(err instanceof ApiClientError);
      assert.equal(err.statusCode, 401);
    }

    assert.equal(
      interceptorFired,
      true,
      'Standard 401 response on protected endpoint must fire onUnauthorizedCallback'
    );

    // Reset interceptor callback
    setOnUnauthorizedCallback(null);

    console.log('✓ All auth feature self-checks passed successfully!');
  } finally {
    globalThis.fetch = originalFetch;
    setOnUnauthorizedCallback(null);
  }
}

runAuthSelfChecks().catch((err) => {
  console.error('❌ Auth self-checks failed:', err);
  process.exit(1);
});
