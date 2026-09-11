import { apiClient } from '../../../lib/apiClient.ts';
import type {
  CalendarEvent,
  CalendarEventsResponse,
  CalendarEventsMeta
} from '../types/calendar.types.ts';

export async function fetchCalendarEvents(
  from?: string,
  to?: string
): Promise<CalendarEventsResponse> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const response = await apiClient.getEnvelope<CalendarEvent[]>(`/calendar/events${queryStr}`);

  return {
    events: response.data ?? [],
    meta: (response.meta as unknown as CalendarEventsMeta) ?? {
      from: from ?? '',
      to: to ?? '',
      count: response.data?.length ?? 0,
      deadlinesCount: 0,
      fittingsCount: 0
    }
  };
}
