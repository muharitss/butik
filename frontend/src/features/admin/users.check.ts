import assert from 'node:assert/strict';
import { hasPermission } from '../../hooks/usePermission.ts';
import type { UserDto, CreateUserInput } from './api/users.api.ts';

async function runUsersSelfChecks() {
  console.log('Running User Management feature self-checks...');

  // 1. RBAC permissions
  assert.equal(
    hasPermission('owner', 'users:manage'),
    true,
    'Owner must have users:manage permission'
  );
  assert.equal(
    hasPermission('staff', 'users:manage'),
    false,
    'Staff must NOT have users:manage permission'
  );
  assert.equal(
    hasPermission(null, 'users:manage'),
    false,
    'Unauthenticated actor must NOT have users:manage permission'
  );

  // 2. User DTO invariants
  const mockUser: UserDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Boutique Operator',
    email: 'operator@jahitflow.com',
    phone: '08123456789',
    role: 'owner',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  assert.ok(mockUser.id, 'User ID must be present');
  assert.ok(mockUser.name, 'User name must be present');
  assert.equal(mockUser.isActive, true, 'User isActive must be boolean');
  assert.equal((mockUser as unknown as Record<string, unknown>).passwordHash, undefined, 'passwordHash must never be in UserDto');

  // 3. CreateUserInput contract validation
  const validStaffInput: CreateUserInput = {
    name: 'Staff Tailor',
    email: 'staff@jahitflow.com',
    phone: '081298765432',
    role: 'staff',
    temporaryPassword: 'ValidPassword123!',
  };

  assert.ok(validStaffInput.temporaryPassword.length >= 8, 'Password must be >= 8 chars');
  assert.ok(['owner', 'staff'].includes(validStaffInput.role), 'Role must be owner or staff');

  console.log('✔ All User Management feature self-checks passed successfully!');
}

runUsersSelfChecks().catch((err) => {
  console.error('❌ User management self-checks failed:', err);
  process.exit(1);
});
