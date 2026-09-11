import React from 'react';
import { Clock, Ruler } from 'lucide-react';
import {
  getMonthDays,
  DAY_NAMES,
  formatEventTime,
  type CalendarDayCell,
} from '../lib/calendar.utils.ts';
import type { CalendarEvent, CalendarFilterType } from '../types/calendar.types.ts';

interface CalendarMonthGridProps {
  year: number;
  month: number;
  eventsByDate: Record<string, CalendarEvent[]>;
  filter: CalendarFilterType;
  onSelectEvent: (event: CalendarEvent) => void;
}

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  year,
  month,
  eventsByDate,
  filter,
  onSelectEvent,
}) => {
  const days = getMonthDays(year, month);

  return (
    <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-xs" id="calendar-month-grid">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center py-2.5 text-xs font-semibold text-muted-foreground">
        {DAY_NAMES.map((day) => (
          <div key={day} className="tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border">
        {days.map((cell: CalendarDayCell) => {
          const allDayEvents = eventsByDate[cell.dateKey] || [];
          const filteredEvents = allDayEvents.filter((ev) => {
            if (filter === 'DEADLINES') return ev.type === 'deadline';
            if (filter === 'FITTINGS') return ev.type === 'fitting';
            return true;
          });

          const maxVisible = 3;
          const visibleEvents = filteredEvents.slice(0, maxVisible);
          const hiddenCount = filteredEvents.length - maxVisible;

          return (
            <div
              key={cell.dateKey}
              data-date={cell.dateKey}
              className={`min-h-[105px] md:min-h-[125px] p-1.5 md:p-2 flex flex-col gap-1 transition-colors ${
                cell.isCurrentMonth
                  ? 'bg-card'
                  : 'bg-muted/15 text-muted-foreground/60'
              } ${cell.isToday ? 'bg-accent/15' : ''}`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium inline-flex items-center justify-center ${
                    cell.isToday
                      ? 'h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold shadow-xs'
                      : cell.isCurrentMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground/50'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {filteredEvents.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium sm:hidden">
                    {filteredEvents.length} ev
                  </span>
                )}
              </div>

              {/* Event chips */}
              <div className="flex flex-col gap-1 mt-0.5 overflow-hidden">
                {visibleEvents.map((event) => {
                  const isDeadline = event.type === 'deadline';
                  const time = formatEventTime(event.date);

                  return (
                    <button
                      key={event.id}
                      type="button"
                      id={`event-chip-${event.id}`}
                      onClick={() => onSelectEvent(event)}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 border transition-all cursor-pointer ${
                        isDeadline
                          ? 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/25'
                          : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border'
                      }`}
                      title={`${isDeadline ? 'Deadline' : 'Fitting'}: ${event.orderNumber} - ${event.customerName} (${event.status})`}
                    >
                      {isDeadline ? (
                        <Clock className="h-3 w-3 shrink-0 text-primary" />
                      ) : (
                        <Ruler className="h-3 w-3 shrink-0 text-accent-foreground" />
                      )}
                      <span className="truncate">
                        <strong className="font-semibold">{event.orderNumber}</strong>{' '}
                        {isDeadline ? (
                          <span>({event.customerName})</span>
                        ) : (
                          <span>Fit #{event.fittingNumber}</span>
                        )}
                      </span>
                      {time && (
                        <span className="ml-auto text-[9px] opacity-75 shrink-0 hidden lg:inline">
                          {time}
                        </span>
                      )}
                    </button>
                  );
                })}

                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectEvent(filteredEvents[maxVisible])}
                    className="text-[10px] text-muted-foreground hover:text-foreground font-medium text-left px-1.5 py-0.5 hover:underline cursor-pointer"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
