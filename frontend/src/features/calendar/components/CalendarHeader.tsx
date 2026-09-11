import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar as CalendarIcon,
  List,
  Clock,
  Ruler,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { formatMonthYear } from '../lib/calendar.utils.ts';
import type { CalendarFilterType, CalendarViewMode } from '../types/calendar.types.ts';

interface CalendarHeaderProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  filter: CalendarFilterType;
  onFilterChange: (filter: CalendarFilterType) => void;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  deadlinesCount: number;
  fittingsCount: number;
  loading: boolean;
  onRefresh: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onToday,
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  deadlinesCount,
  fittingsCount,
  loading,
  onRefresh,
}) => {
  const totalCount = deadlinesCount + fittingsCount;

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6" id="calendar-header">
      {/* Top row: Title and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
              Production Calendar
            </h1>
            <Badge variant="secondary" className="text-xs">
              {totalCount} {totalCount === 1 ? 'Event' : 'Events'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Visual timeline of order deadlines and scheduled fitting appointments.
          </p>
        </div>

        {/* Action / View Mode / Refresh buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-secondary p-1 rounded-lg border border-border text-xs">
            <button
              type="button"
              id="view-month-btn"
              onClick={() => onViewModeChange('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Month
            </button>
            <button
              type="button"
              id="view-list-btn"
              onClick={() => onViewModeChange('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 text-xs"
            id="btn-refresh-calendar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bottom row: Month navigation and filter pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Month Navigator */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrevMonth}
            className="h-8 w-8"
            id="btn-prev-month"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="h-8 text-xs font-medium px-3"
            id="btn-today"
          >
            Today
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onNextMonth}
            className="h-8 w-8"
            id="btn-next-month"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="text-lg font-heading font-semibold text-foreground ml-2" id="calendar-current-month">
            {formatMonthYear(year, month)}
          </span>
        </div>

        {/* Event Type Filter Pills */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border text-xs">
          <button
            type="button"
            id="filter-all"
            onClick={() => onFilterChange('ALL')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'ALL'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            id="filter-deadlines"
            onClick={() => onFilterChange('DEADLINES')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'DEADLINES'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3 w-3 text-primary" />
            Deadlines ({deadlinesCount})
          </button>
          <button
            type="button"
            id="filter-fittings"
            onClick={() => onFilterChange('FITTINGS')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === 'FITTINGS'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Ruler className="h-3 w-3 text-accent-foreground" />
            Fittings ({fittingsCount})
          </button>
        </div>
      </div>
    </div>
  );
};
