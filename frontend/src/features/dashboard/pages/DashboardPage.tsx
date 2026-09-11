import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button.tsx';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert.tsx';
import {
  RefreshCw,
  Plus,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { fetchDashboardSummary } from '../api/dashboard.api.ts';
import type { DashboardSummaryResponse } from '../types/dashboard.types.ts';
import { DashboardMetrics } from '../components/DashboardMetrics.tsx';
import {
  UrgentDeadlinesSection,
  UpcomingFittingsSection,
  ReadyOrdersSection,
  UnpaidOrdersSection,
  RecentOrdersSection,
} from '../components/DashboardLists.tsx';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Configurable dueSoonDays window (default 7 days per requirements)
  const [dueSoonDays, setDueSoonDays] = useState<number>(7);
  const [fittingsDays] = useState<number>(7);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchDashboardSummary({
        dueSoonDays,
        fittingsDays,
        recentLimit: 5,
      });
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  }, [dueSoonDays, fittingsDays]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full" id="dashboard-page">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
              Atelier Dashboard
            </h1>
            <Badge variant="secondary" className="text-xs">
              Live
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time business status of production, fittings, deliveries, and settlements.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Due Soon Window Selector */}
          <div className="flex items-center bg-secondary p-1 rounded-lg border border-border text-xs">
            <span className="px-2 text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" /> Due Soon:
            </span>
            {[3, 7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                id={`btn-due-window-${days}`}
                onClick={() => setDueSoonDays(days)}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                  dueSoonDays === days
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            id="btn-refresh-dashboard"
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* New Order CTA */}
          <Link
            to="/orders/new"
            id="btn-dashboard-new-order"
            className={buttonVariants({ size: 'sm' })}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive" id="dashboard-error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadDashboard}>
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state skeleton */}
      {loading && !data && (
        <div className="space-y-6 animate-pulse" id="dashboard-loading-skeleton">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-muted/60" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 rounded-xl bg-muted/50" />
            <div className="h-64 rounded-xl bg-muted/50" />
          </div>
        </div>
      )}

      {/* Content when loaded */}
      {data && (
        <div className="space-y-6">
          {/* Top KPI Metrics Cards */}
          <DashboardMetrics metrics={data.metrics} />

          {/* Actionable Content Lists */}
          <div className="grid grid-cols-1 gap-6">
            {/* 1. Urgent Attention (Overdue + Due Soon) */}
            <UrgentDeadlinesSection
              overdueOrders={data.overdueOrders}
              dueSoonOrders={data.dueSoonOrders}
            />

            {/* 2. Side-by-side: Upcoming Fittings & Ready Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UpcomingFittingsSection
                fittings={data.upcomingFittings}
                daysWindow={data.metrics.upcomingFittingsDays}
              />
              <ReadyOrdersSection orders={data.readyOrders} />
            </div>

            {/* 3. Side-by-side: Unpaid Balances & Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UnpaidOrdersSection orders={data.unpaidOrders} />
              <RecentOrdersSection orders={data.recentOrders} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
