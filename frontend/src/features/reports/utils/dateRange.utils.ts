import type { DateRangePreset } from '../types/reports.types.ts';

/**
 * Formats a Date object to YYYY-MM-DD string in local date or ISO format.
 */
export function formatDateToInputString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolves start/end dates (YYYY-MM-DD) for a given preset.
 */
export function getDateRangeFromPreset(
  preset: DateRangePreset,
  referenceDate: Date = new Date()
): { from?: string; to?: string } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed

  switch (preset) {
    case 'THIS_MONTH': {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        from: formatDateToInputString(firstDay),
        to: formatDateToInputString(lastDay),
      };
    }
    case 'LAST_MONTH': {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      return {
        from: formatDateToInputString(firstDay),
        to: formatDateToInputString(lastDay),
      };
    }
    case 'THIS_YEAR': {
      const firstDay = new Date(year, 0, 1);
      const lastDay = new Date(year, 11, 31);
      return {
        from: formatDateToInputString(firstDay),
        to: formatDateToInputString(lastDay),
      };
    }
    case 'ALL_TIME':
    default:
      return {
        from: undefined,
        to: undefined,
      };
  }
}

export function getPresetLabel(preset: DateRangePreset): string {
  switch (preset) {
    case 'THIS_MONTH':
      return 'This Month';
    case 'LAST_MONTH':
      return 'Last Month';
    case 'THIS_YEAR':
      return 'This Year';
    case 'ALL_TIME':
      return 'All Time';
    case 'CUSTOM':
      return 'Custom Range';
    default:
      return preset;
  }
}
