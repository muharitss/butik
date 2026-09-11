import type { CalendarEvent } from '../types/calendar.types.ts';

export interface CalendarDayCell {
  date: Date;
  dateKey: string; // "YYYY-MM-DD"
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Formats a Date object into YYYY-MM-DD string using local calendar values.
 */
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if two dates represent the same calendar day.
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return formatDateKey(d1) === formatDateKey(d2);
}

/**
 * Generates the full 35 or 42 grid cells for a given month and year.
 * Weeks start on Monday (ISO-8601 standard: Mon=0, Sun=6).
 */
export function getMonthDays(year: number, month: number, today: Date = new Date()): CalendarDayCell[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
  const startDayMondayIndex = (firstDayOfMonth.getDay() + 6) % 7;

  const cells: CalendarDayCell[] = [];

  // 1. Leading days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayMondayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const date = new Date(year, month - 1, dayNum);
    cells.push({
      date,
      dateKey: formatDateKey(date),
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
    });
  }

  // 2. Days of current month
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const date = new Date(year, month, dayNum);
    cells.push({
      date,
      dateKey: formatDateKey(date),
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
    });
  }

  // 3. Trailing days from next month to round out the grid to full weeks (35 or 42 cells)
  const totalWeeks = Math.ceil(cells.length / 7);
  const targetCells = Math.max(35, totalWeeks * 7);
  const remaining = targetCells - cells.length;

  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const date = new Date(year, month + 1, dayNum);
    cells.push({
      date,
      dateKey: formatDateKey(date),
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
    });
  }

  return cells;
}

/**
 * Groups a list of calendar events by their YYYY-MM-DD date key.
 */
export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};

  for (const event of events) {
    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) continue;

    const key = formatDateKey(eventDate);
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(event);
  }

  // Sort events within each date key: fittings by time, deadlines
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  return map;
}

/**
 * Month names in English for header display.
 */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function formatFullDate(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatEventTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
