import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  ClipboardList,
  UserPlus,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { ReportsSummary } from '../types/reports.types.ts';
import { formatCurrency } from '../../orders/constants/orderRules.ts';

interface SummaryCardsProps {
  summary: ReportsSummary | null;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading }) => {
  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="reports-kpi-skeleton">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="size-8 bg-muted rounded-md" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isOutstandingPositive = Number(summary?.outstandingBalance || 0) > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="reports-kpi-cards">
      {/* 1. Total Revenue (Completed Orders) */}
      <Card id="kpi-total-revenue">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Revenue
          </CardTitle>
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            <TrendingUp className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight" id="kpi-value-revenue">
            {formatCurrency(summary?.totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
            <span>{summary?.completedOrders ?? 0} completed orders</span>
          </p>
        </CardContent>
      </Card>

      {/* 2. Collected Payments */}
      <Card id="kpi-total-collected">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Collected
          </CardTitle>
          <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
            <CreditCard className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight" id="kpi-value-collected">
            {formatCurrency(summary?.totalCollected)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Payments recorded in period
          </p>
        </CardContent>
      </Card>

      {/* 3. Outstanding Receivables */}
      <Card
        id="kpi-outstanding-balance"
        className={isOutstandingPositive ? 'border-amber-500/30' : ''}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Outstanding Balance
          </CardTitle>
          <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
            <AlertCircle className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight" id="kpi-value-outstanding">
            {formatCurrency(summary?.outstandingBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Global unpaid orders balance
          </p>
        </CardContent>
      </Card>

      {/* 4. Total Orders Placed */}
      <Card id="kpi-total-orders">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Orders in Period
          </CardTitle>
          <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
            <ClipboardList className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight" id="kpi-value-orders">
            {summary?.totalOrders ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
            <span>{summary?.completedOrders ?? 0} completed</span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <XCircle className="size-3 text-destructive shrink-0" />
              {summary?.cancelledOrders ?? 0} cancelled
            </span>
          </p>
        </CardContent>
      </Card>

      {/* 5. New Customers */}
      <Card id="kpi-new-customers">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            New Customers
          </CardTitle>
          <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
            <UserPlus className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight" id="kpi-value-customers">
            {summary?.newCustomers ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registered during period
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
