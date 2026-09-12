import assert from 'node:assert/strict';
import { hasPermission, PERMISSIONS } from '../../hooks/usePermission.ts';

async function runRbacSelfChecks() {
  console.log('Running RBAC permissions feature self-checks...');

  // 1. Owner-only sensitive permissions
  const ownerOnly = [
    'customers:delete',
    'garments:manage',
    'audit:view',
    'users:manage',
    'settings:manage',
    'reports:view',
    'materials:manage',
  ] as const;

  for (const perm of ownerOnly) {
    assert.equal(
      hasPermission('owner', perm),
      true,
      `Owner should have permission: ${perm}`
    );
    assert.equal(
      hasPermission('staff', perm),
      false,
      `Staff must NOT have permission: ${perm}`
    );
  }

  // 2. Staff-accessible permissions (both owner and staff)
  const staffAllowed = [
    'customers:read',
    'customers:create',
    'customers:update',
    'orders:read',
    'orders:create',
    'orders:update',
    'payments:record',
    'fittings:record',
    'revisions:record',
    'attachments:upload',
  ] as const;

  for (const perm of staffAllowed) {
    assert.equal(
      hasPermission('owner', perm),
      true,
      `Owner should have permission: ${perm}`
    );
    assert.equal(
      hasPermission('staff', perm),
      true,
      `Staff should have permission: ${perm}`
    );
  }

  // 3. Unauthenticated / unknown role / unknown permission guard checks
  assert.equal(hasPermission(null, 'customers:delete'), false);
  assert.equal(hasPermission(undefined, 'customers:delete'), false);
  assert.equal(hasPermission('', 'customers:delete'), false);
  assert.equal(hasPermission('guest', 'customers:read'), false);
  assert.equal(hasPermission('staff', 'unknown:permission'), false);

  // 4. Verify all defined keys in PERMISSIONS are accounted for
  const allKeys = Object.keys(PERMISSIONS);
  assert.ok(allKeys.length >= 17, 'PERMISSIONS should contain all required permissions');

  console.log('✓ All RBAC permissions feature self-checks passed successfully!');
}

runRbacSelfChecks().catch((err) => {
  console.error('❌ RBAC self-checks failed:', err);
  process.exit(1);
});
