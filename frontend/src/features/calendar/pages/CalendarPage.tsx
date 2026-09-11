import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert.tsx';
import { AlertCircle } from 'lucide-react';
import { fetchCalendarEvents } from '../api/calendar.api.ts';
import { CalendarHeader } from '../components/CalendarHeader.tsx';
import { CalendarMonthGrid } from '../components/CalendarMonthGrid.tsx';
import { CalendarListView } from '../components/CalendarListView.tsx';
import { CalendarEventDetailDialog } from '../components/CalendarEventDetailDialog.tsx';
import { groupEventsByDate } from '../lib/calendar.utils.ts';
import type {
  CalendarEvent,
  CalendarFilterType,
  CalendarViewMode,
} from '../types/calendar.types.ts';

export const CalendarPage: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth());

  const [filter, setFilter] = useState<CalendarFilterType>('ALL');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected event for detail dialog
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Calculate boundary in UTC for the target month
      const from = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
      const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();

      const res = await fetchCalendarEvents(from, to);
      setEvents(res.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handlePrevMonth = () => {
    setMonth((prev) => {
      if (prev === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setMonth((prev) => {
      if (prev === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  // Group events by date key for month grid lookup
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  // Event counts for header badges
  const deadlinesCount = useMemo(
    () => events.filter((e) => e.type === 'deadline').length,
    [events]
  );
  const fittingsCount = useMemo(
    () => events.filter((e) => e.type === 'fitting').length,
    [events]
  );

  return (
    <div className="space-y-6" id="calendar-page">
      <CalendarHeader
        year={year}
        month={month}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        filter={filter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        deadlinesCount={deadlinesCount}
        fittingsCount={fittingsCount}
        loading={loading}
        onRefresh={loadEvents}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Calendar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {viewMode === 'month' ? (
        <CalendarMonthGrid
          year={year}
          month={month}
          eventsByDate={eventsByDate}
          filter={filter}
          onSelectEvent={handleSelectEvent}
        />
      ) : (
        <CalendarListView
          events={events}
          filter={filter}
          onSelectEvent={handleSelectEvent}
        />
      )}

      <CalendarEventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};
