import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { ClipboardList, Clock, AlertTriangle, PackageCheck, Wallet } from 'lucide-react';
import type { DashboardMetrics as MetricsType } from '../types/dashboard.types.ts';
import { formatCurrency, getStatusLabel } from '@/features/orders/constants/orderRules.ts';

interface DashboardMetricsProps {
  metrics: MetricsType;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ metrics }) => {
  const isOverdue = metrics.overdueCount > 0;

  // Render a compact summary of statuses for active orders tooltip/subtitle
  const statusSummary = Object.entries(metrics.activeOrdersByStatus)
    .map(([status, count]) => `${getStatusLabel(status)}: ${count}`)
    .join(' • ');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Active Orders */}
      <Card id="metric-card-active-orders">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Orders
          </CardTitle>
          <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
            <ClipboardList className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{metrics.activeOrdersCount}</div>
          <p className="text-xs text-muted-foreground mt-1 truncate" title={statusSummary || 'In production'}>
            {statusSummary || 'No active orders in progress'}
          </p>
        </CardContent>
      </Card>

      {/* 2. Due Soon */}
      <Card id="metric-card-due-soon">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Due Soon
          </CardTitle>
          <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
            <Clock className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{metrics.dueSoonCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Deadlines in next {metrics.dueSoonDays} days
          </p>
        </CardContent>
      </Card>

      {/* 3. Overdue Orders */}
      <Card
        id="metric-card-overdue"
        className={isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overdue
          </CardTitle>
          <div className={`p-2 rounded-md ${isOverdue ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'}`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold tracking-tight ${isOverdue ? 'text-destructive' : ''}`}>
              {metrics.overdueCount}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                Needs Attention
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isOverdue ? 'Orders past target deadline' : 'Zero overdue orders'}
          </p>
        </CardContent>
      </Card>

      {/* 4. Ready for Pickup */}
      <Card id="metric-card-ready">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ready for Pickup
          </CardTitle>
          <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
            <PackageCheck className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{metrics.readyForPickupCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Awaiting client collection
          </p>
        </CardContent>
      </Card>

      {/* 5. Outstanding Balance */}
      <Card id="metric-card-balance">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pending Balance
          </CardTitle>
          <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
            <Wallet className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight truncate" title={formatCurrency(metrics.totalOutstandingBalance)}>
            {formatCurrency(metrics.totalOutstandingBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.unpaidOrPartialCount} orders pending payment
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
