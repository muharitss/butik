import React from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Clock, Ruler, ArrowRight, CalendarX2 } from 'lucide-react';
import { formatFullDate, formatEventTime } from '../lib/calendar.utils.ts';
import type { CalendarEvent, CalendarFilterType } from '../types/calendar.types.ts';

interface CalendarListViewProps {
  events: CalendarEvent[];
  filter: CalendarFilterType;
  onSelectEvent: (event: CalendarEvent) => void;
}

export const CalendarListView: React.FC<CalendarListViewProps> = ({
  events,
  filter,
  onSelectEvent,
}) => {
  const filteredEvents = events.filter((ev) => {
    if (filter === 'DEADLINES') return ev.type === 'deadline';
    if (filter === 'FITTINGS') return ev.type === 'fitting';
    return true;
  });

  // Group filtered events by date
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const ev of filteredEvents) {
    const d = new Date(ev.date);
    const dateKey = !isNaN(d.getTime())
      ? d.toISOString().split('T')[0]
      : 'other';
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(ev);
  }

  const sortedDates = Object.keys(grouped).sort();

  if (filteredEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-border rounded-xl bg-card text-center">
        <CalendarX2 className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold text-foreground">No events found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          There are no {filter !== 'ALL' ? filter.toLowerCase() : ''} scheduled for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" id="calendar-list-view">
      {sortedDates.map((dateKey) => {
        const dayEvents = grouped[dateKey];
        const displayDate = dayEvents[0] ? formatFullDate(dayEvents[0].date) : dateKey;

        return (
          <div key={dateKey} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 border-b border-border pb-1.5">
              <span className="text-sm font-heading font-semibold text-foreground">
                {displayDate}
              </span>
              <span className="text-xs text-muted-foreground">
                ({dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'})
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {dayEvents.map((event) => {
                const isDeadline = event.type === 'deadline';
                const time = formatEventTime(event.date);

                return (
                  <div
                    key={event.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-md shrink-0 mt-0.5 ${
                          isDeadline
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {isDeadline ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <Ruler className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/orders/${event.orderId}`}
                            className="font-semibold text-sm hover:underline text-foreground"
                          >
                            {event.orderNumber}
                          </Link>
                          <Badge variant={isDeadline ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                            {isDeadline ? 'Order Deadline' : `Fitting #${event.fittingNumber}`}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {event.status}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {event.customerName}
                          </span>
                          {event.customerPhone && (
                            <>
                              <span>•</span>
                              <span>{event.customerPhone}</span>
                            </>
                          )}
                          {time && (
                            <>
                              <span>•</span>
                              <span>Scheduled: {time}</span>
                            </>
                          )}
                        </div>

                        {event.notes && (
                          <p className="text-xs text-muted-foreground/90 italic mt-0.5">
                            "{event.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectEvent(event)}
                        className="text-xs"
                      >
                        Details
                      </Button>
                      <Link
                        to={`/orders/${event.orderId}`}
                        className={buttonVariants({
                          variant: 'default',
                          size: 'sm',
                          className: 'text-xs flex items-center gap-1',
                        })}
                      >
                        View Order
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
