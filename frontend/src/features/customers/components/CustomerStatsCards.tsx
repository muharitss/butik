import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DollarSign,
  ShoppingBag,
  AlertCircle,
  Ruler,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import type { Customer } from '../types/customers.types.ts';
import { formatCurrency, formatDate } from '../../orders/constants/orderRules.ts';

export interface CustomerStatsCardsProps {
  customer: Customer;
}

export const CustomerStatsCards: React.FC<CustomerStatsCardsProps> = ({ customer }) => {
  const totalSpending = Number(customer.totalSpending ?? 0);
  const outstandingBalance = Number(customer.outstandingBalance ?? 0);
  const orderCount = customer.orderCount ?? customer.orders?.length ?? 0;
  const measurementVersionCount = customer.measurementVersionCount ?? 0;

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      id="customer-crm-stats-cards"
    >
      {/* 1. Lifetime Spending */}
      <Card className="border border-border shadow-xs hover:border-primary/40 transition-colors bg-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-primary" /> Lifetime Spending
            </span>
            <div className="text-xl font-heading font-bold text-foreground font-mono">
              {formatCurrency(totalSpending)}
            </div>
            <p className="text-[11px] text-muted-foreground">Excludes cancelled orders</p>
          </div>
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Orders */}
      <Card className="border border-border shadow-xs hover:border-primary/40 transition-colors bg-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ShoppingBag className="size-3.5 text-primary" /> Total Orders
            </span>
            <div className="text-xl font-heading font-bold text-foreground font-mono">
              {orderCount}
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
              {customer.lastOrderAt ? `Last: ${formatDate(customer.lastOrderAt)}` : 'No orders recorded'}
            </p>
          </div>
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShoppingBag className="size-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Outstanding Balance */}
      <Card
        className={`border shadow-xs transition-colors bg-card ${
          outstandingBalance > 0
            ? 'border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/10'
            : 'border-border hover:border-primary/40'
        }`}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span
              className={`text-xs font-medium flex items-center gap-1.5 ${
                outstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'
              }`}
            >
              {outstandingBalance > 0 ? (
                <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              )}{' '}
              Outstanding Due
            </span>
            <div
              className={`text-xl font-heading font-bold font-mono ${
                outstandingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
              }`}
            >
              {formatCurrency(outstandingBalance)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {outstandingBalance > 0 ? 'Due on active orders' : 'All active orders settled'}
            </p>
          </div>
          <div
            className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
              outstandingBalance > 0
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {outstandingBalance > 0 ? <AlertCircle className="size-5" /> : <CheckCircle2 className="size-5" />}
          </div>
        </CardContent>
      </Card>

      {/* 4. Measurement Versions */}
      <Card className="border border-border shadow-xs hover:border-primary/40 transition-colors bg-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Ruler className="size-3.5 text-primary" /> Body Measurements
            </span>
            <div className="text-xl font-heading font-bold text-foreground font-mono">
              {measurementVersionCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {measurementVersionCount === 1 ? '1 profile version' : `${measurementVersionCount} profile versions`}
            </p>
          </div>
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Ruler className="size-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
