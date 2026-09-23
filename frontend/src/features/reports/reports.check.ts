import assert from 'node:assert/strict';
import {
  getDateRangeFromPreset,
  formatDateToInputString,
  getPresetLabel,
} from './utils/dateRange.utils.ts';
import { hasPermission } from '../../hooks/usePermission.ts';

async function runReportsChecks() {
  console.log('Running reports UI self-checks...');

  // 1. Check formatDateToInputString
  const testDate = new Date(2026, 8, 16); // Sept 16, 2026 (month is 0-indexed)
  assert.equal(formatDateToInputString(testDate), '2026-09-16');

  // 2. Check THIS_MONTH preset calculation
  const thisMonth = getDateRangeFromPreset('THIS_MONTH', testDate);
  assert.equal(thisMonth.from, '2026-09-01');
  assert.equal(thisMonth.to, '2026-09-30');

  // 3. Check LAST_MONTH preset calculation
  const lastMonth = getDateRangeFromPreset('LAST_MONTH', testDate);
  assert.equal(lastMonth.from, '2026-08-01');
  assert.equal(lastMonth.to, '2026-08-31');

  // 4. Check THIS_YEAR preset calculation
  const thisYear = getDateRangeFromPreset('THIS_YEAR', testDate);
  assert.equal(thisYear.from, '2026-01-01');
  assert.equal(thisYear.to, '2026-12-31');

  // 5. Check ALL_TIME preset calculation
  const allTime = getDateRangeFromPreset('ALL_TIME', testDate);
  assert.equal(allTime.from, undefined);
  assert.equal(allTime.to, undefined);

  // 6. Check preset labels
  assert.equal(getPresetLabel('THIS_MONTH'), 'This Month');
  assert.equal(getPresetLabel('LAST_MONTH'), 'Last Month');
  assert.equal(getPresetLabel('THIS_YEAR'), 'This Year');
  assert.equal(getPresetLabel('ALL_TIME'), 'All Time');
  assert.equal(getPresetLabel('CUSTOM'), 'Custom Range');

  // 7. Check RBAC permissions for reports
  assert.equal(hasPermission('owner', 'reports:view'), true, 'Owner must have reports:view permission');
  assert.equal(hasPermission('staff', 'reports:view'), false, 'Staff must not have reports:view permission');
  assert.equal(hasPermission(null, 'reports:view'), false, 'Unauthenticated user must not have reports:view permission');

  console.log('✓ All reports UI self-checks passed successfully!');
}

runReportsChecks().catch((err) => {
  console.error('Reports self-check failed:', err);
  process.exit(1);
});
