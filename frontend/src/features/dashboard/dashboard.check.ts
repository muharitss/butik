import assert from 'node:assert/strict';
import { getDeadlineRelative } from './components/DashboardLists.tsx';

async function runDashboardChecks() {
  console.log('Running dashboard self-checks...');

  // 1. Check getDeadlineRelative with null/undefined
  const emptyCheck = getDeadlineRelative(null);
  assert.equal(emptyCheck.text, '—');
  assert.equal(emptyCheck.isPast, false);

  const undefinedCheck = getDeadlineRelative(undefined);
  assert.equal(undefinedCheck.text, '—');
  assert.equal(undefinedCheck.isPast, false);

  // 2. Check overdue deadlines (past date)
  const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 1000).toISOString();
  const pastCheck = getDeadlineRelative(pastDate);
  assert.equal(pastCheck.isPast, true);
  assert.match(pastCheck.text, /overdue/i);

  // 3. Check future deadlines
  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const futureCheck = getDeadlineRelative(futureDate);
  assert.equal(futureCheck.isPast, false);
  assert.match(futureCheck.text, /Due in \d+d/i);

  console.log('✓ All dashboard self-checks passed successfully!');
}

runDashboardChecks().catch((err) => {
  console.error('Dashboard self-check failed:', err);
  process.exit(1);
});
