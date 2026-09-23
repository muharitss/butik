import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter } from 'lucide-react';
import type { DateRangePreset } from '../types/reports.types.ts';
import { getDateRangeFromPreset, getPresetLabel } from '../utils/dateRange.utils.ts';

interface DateRangePickerProps {
  preset: DateRangePreset;
  from: string;
  to: string;
  onPresetChange: (preset: DateRangePreset, newFrom?: string, newTo?: string) => void;
  onCustomDateChange: (from: string, to: string) => void;
}

const PRESETS: DateRangePreset[] = ['THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR', 'ALL_TIME'];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  preset,
  from,
  to,
  onPresetChange,
  onCustomDateChange,
}) => {
  const handlePresetClick = (p: DateRangePreset) => {
    if (p === 'ALL_TIME') {
      onPresetChange('ALL_TIME', '', '');
    } else {
      const range = getDateRangeFromPreset(p);
      onPresetChange(p, range.from || '', range.to || '');
    }
  };

  const handleCustomFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCustomDateChange(e.target.value, to);
  };

  const handleCustomToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCustomDateChange(from, e.target.value);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
      {/* Presets Button Group */}
      <div className="flex items-center flex-wrap gap-1.5" id="date-presets-group">
        <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
          <Filter className="size-3.5" />
          Period:
        </span>
        {PRESETS.map((p) => {
          const isActive = preset === p;
          return (
            <Button
              key={p}
              type="button"
              id={`btn-preset-${p.toLowerCase()}`}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8"
              onClick={() => handlePresetClick(p)}
            >
              {getPresetLabel(p)}
            </Button>
          );
        })}
        <Button
          type="button"
          id="btn-preset-custom"
          variant={preset === 'CUSTOM' ? 'default' : 'outline'}
          size="sm"
          className="text-xs h-8"
          onClick={() => onPresetChange('CUSTOM', from, to)}
        >
          Custom
        </Button>
      </div>

      {/* Date Pickers (visible if custom or for context) */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="date-from-input" className="text-xs text-muted-foreground">
            From:
          </Label>
          <Input
            id="date-from-input"
            type="date"
            value={from}
            onChange={handleCustomFromChange}
            className="h-8 text-xs w-36 bg-background"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="date-to-input" className="text-xs text-muted-foreground">
            To:
          </Label>
          <Input
            id="date-to-input"
            type="date"
            value={to}
            onChange={handleCustomToChange}
            className="h-8 text-xs w-36 bg-background"
          />
        </div>
      </div>
    </div>
  );
};
