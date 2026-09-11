import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../orders/constants/orderRules.ts';

export interface PaymentsMetrics {
  totalValuation: number;
  totalCollected: number;
  totalOutstanding: number;
  unsettledOrdersCount: number;
  collectionRate: number;
}

interface PaymentsMetricsGridProps {
  metrics: PaymentsMetrics;
  totalOrdersCount: number;
}

export const PaymentsMetricsGrid: React.FC<PaymentsMetricsGridProps> = ({
  metrics,
  totalOrdersCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="ledger-metrics-grid">
      {/* Metric 1: Outstanding Receivables */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            Outstanding Receivables
          </CardTitle>
          <AlertCircle className="size-4 text-destructive" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-xl font-bold text-destructive">
            {formatCurrency(metrics.totalOutstanding)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Across <strong className="text-foreground">{metrics.unsettledOrdersCount}</strong> active order(s)
          </p>
        </CardContent>
      </Card>

      {/* Metric 2: Total Collected */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            Collected to Date
          </CardTitle>
          <CheckCircle2 className="size-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-xl font-bold text-primary">
            {formatCurrency(metrics.totalCollected)}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${metrics.collectionRate}%` }}
              />
            </div>
            <span className="font-mono shrink-0">{metrics.collectionRate}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Metric 3: Total Portfolio Valuation */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            Total Valuation
          </CardTitle>
          <DollarSign className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-xl font-bold text-foreground">
            {formatCurrency(metrics.totalValuation)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Gross order value across portfolio
          </p>
        </CardContent>
      </Card>

      {/* Metric 4: Settlement Ratio */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            Pending Settlements
          </CardTitle>
          <Clock className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-xl font-bold text-foreground">
            {metrics.unsettledOrdersCount} / {totalOrdersCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Orders requiring balance clearing
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
