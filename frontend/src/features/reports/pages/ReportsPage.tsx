import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RotateCcw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { usePermission } from '../../../hooks/usePermission.ts';
import type { DateRangePreset, ReportsSummary } from '../types/reports.types.ts';
import { getDateRangeFromPreset } from '../utils/dateRange.utils.ts';
import { fetchReportsSummary } from '../api/reports.api.ts';
import { fetchOrders } from '../../orders/api/orders.api.ts';
import type { Order } from '../../orders/types/orders.types.ts';
import { DateRangePicker } from '../components/DateRangePicker.tsx';
import { SummaryCards } from '../components/SummaryCards.tsx';
import { BreakdownSections } from '../components/BreakdownSections.tsx';

export const ReportsPage: React.FC = () => {
  const canViewReports = usePermission('reports:view');

  const initialRange = getDateRangeFromPreset('THIS_MONTH');
  const [preset, setPreset] = useState<DateRangePreset>('THIS_MONTH');
  const [from, setFrom] = useState<string>(initialRange.from || '');
  const [to, setTo] = useState<string>(initialRange.to || '');

  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!canViewReports) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, ordersRes] = await Promise.all([
        fetchReportsSummary({
          from: from || undefined,
          to: to || undefined,
        }),
        fetchOrders({
          pageSize: 100,
        }),
      ]);
      setSummary(summaryRes);
      setOrders(ordersRes.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  }, [canViewReports, from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePresetChange = (
    newPreset: DateRangePreset,
    newFrom?: string,
    newTo?: string
  ) => {
    setPreset(newPreset);
    setFrom(newFrom || '');
    setTo(newTo || '');
  };

  const handleCustomDateChange = (newFrom: string, newTo: string) => {
    setPreset('CUSTOM');
    setFrom(newFrom);
    setTo(newTo);
  };

  if (!canViewReports) {
    return (
      <div className="p-4 sm:p-6" id="reports-forbidden-view">
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view business reports and financial summaries. Please contact the atelier owner.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="reports-hub-page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
              Reports & Financial Overview
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated order volume, revenue recognition, collection rates, and customer acquisition.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            id="btn-refresh-reports"
          >
            <RotateCcw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" id="reports-error-alert">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadData} className="ml-4 h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Date Range Selector */}
      <DateRangePicker
        preset={preset}
        from={from}
        to={to}
        onPresetChange={handlePresetChange}
        onCustomDateChange={handleCustomDateChange}
      />

      {/* Summary KPI Cards */}
      <SummaryCards summary={summary} loading={loading} />

      {/* Order & Payment Breakdowns */}
      <BreakdownSections orders={orders} loading={loading} from={from} to={to} />
    </div>
  );
};
