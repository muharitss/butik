import assert from 'node:assert/strict';
import {
  getMonthDays,
  groupEventsByDate,
  formatDateKey,
  formatMonthYear,
} from './lib/calendar.utils.ts';
import type { CalendarEvent } from './types/calendar.types.ts';

async function runCalendarChecks() {
  console.log('Running Calendar self-checks...');

  // 1. Check formatDateKey
  const testDate = new Date(2026, 8, 15); // Sep 15, 2026
  assert.equal(formatDateKey(testDate), '2026-09-15');

  // 2. Check formatMonthYear
  assert.equal(formatMonthYear(2026, 8), 'September 2026');

  // 3. Check getMonthDays for September 2026 (Sep 1, 2026 is Tuesday)
  const sepDays = getMonthDays(2026, 8, new Date(2026, 8, 15));
  assert.equal(sepDays.length % 7, 0, 'Grid cell count must be a multiple of 7');
  assert.ok(sepDays.length >= 35, 'Grid cell count must be at least 35');

  // First cell should be Monday, Aug 31, 2026 (previous month)
  assert.equal(sepDays[0].dayNumber, 31);
  assert.equal(sepDays[0].isCurrentMonth, false);

  // Second cell should be Tuesday, Sep 1, 2026 (current month)
  assert.equal(sepDays[1].dayNumber, 1);
  assert.equal(sepDays[1].isCurrentMonth, true);

  // Exactly 30 days should belong to current month
  const currentMonthCells = sepDays.filter((c) => c.isCurrentMonth);
  assert.equal(currentMonthCells.length, 30);

  // Check today identification
  const todayCell = sepDays.find((c) => c.isToday);
  assert.ok(todayCell, 'Today cell must be found');
  assert.equal(todayCell.dayNumber, 15);

  // 4. Leap year check: February 2024 has 29 days, February 2025 has 28 days
  const feb2024 = getMonthDays(2024, 1);
  const feb2024Current = feb2024.filter((c) => c.isCurrentMonth);
  assert.equal(feb2024Current.length, 29, 'Feb 2024 leap year must have 29 days');

  const feb2025 = getMonthDays(2025, 1);
  const feb2025Current = feb2025.filter((c) => c.isCurrentMonth);
  assert.equal(feb2025Current.length, 28, 'Feb 2025 must have 28 days');

  // 5. Check groupEventsByDate
  const dFitting = new Date(2026, 8, 15, 10, 0, 0); // 10:00 local
  const dDeadline = new Date(2026, 8, 15, 16, 0, 0); // 16:00 local
  const dOther = new Date(2026, 8, 20, 14, 0, 0); // Sep 20 local

  const sampleEvents: CalendarEvent[] = [
    {
      id: 'deadline-1',
      type: 'deadline',
      date: dDeadline.toISOString(),
      title: 'JF-2026-001 Deadline',
      status: 'IN_PROGRESS',
      orderId: 'ord-1',
      orderNumber: 'JF-2026-001',
      customerId: 'cust-1',
      customerName: 'Customer A',
      customerPhone: '081234567890',
    },
    {
      id: 'fitting-1',
      type: 'fitting',
      date: dFitting.toISOString(),
      title: 'JF-2026-001 Fitting #1',
      status: 'SCHEDULED',
      orderId: 'ord-1',
      orderNumber: 'JF-2026-001',
      customerId: 'cust-1',
      customerName: 'Customer A',
      customerPhone: '081234567890',
      fittingNumber: 1,
    },
    {
      id: 'deadline-2',
      type: 'deadline',
      date: dOther.toISOString(),
      title: 'JF-2026-002 Deadline',
      status: 'CONFIRMED',
      orderId: 'ord-2',
      orderNumber: 'JF-2026-002',
      customerId: 'cust-2',
      customerName: 'Customer B',
      customerPhone: null,
    },
  ];

  const grouped = groupEventsByDate(sampleEvents);
  const sep15Key = formatDateKey(dFitting);
  const sep20Key = formatDateKey(dOther);

  assert.ok(grouped[sep15Key], 'Sep 15 group must exist');
  assert.equal(grouped[sep15Key].length, 2);
  // Earlier fitting (10:00) should be sorted before later deadline (16:00)
  assert.equal(grouped[sep15Key][0].id, 'fitting-1');
  assert.equal(grouped[sep15Key][1].id, 'deadline-1');

  assert.ok(grouped[sep20Key], 'Sep 20 group must exist');
  assert.equal(grouped[sep20Key].length, 1);

  console.log('✓ All Calendar self-checks passed successfully!');
}

runCalendarChecks().catch((err) => {
  console.error('Calendar self-check failed:', err);
  process.exit(1);
});
