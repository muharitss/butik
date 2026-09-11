import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { buttonVariants } from '@/components/ui/button.tsx';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table.tsx';
import {
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import type { DashboardOrderSummary } from '../types/dashboard.types.ts';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusBadgeVariant,
} from '@/features/orders/constants/orderRules.ts';

export function getDeadlineRelative(isoString?: string | null): {
  text: string;
  isPast: boolean;
  days: number;
} {
  if (!isoString) return { text: '—', isPast: false, days: 0 };
  const target = new Date(isoString).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return { text: `${overdueDays}d overdue`, isPast: true, days: diffDays };
  }
  if (diffDays === 0) {
    return { text: 'Due today', isPast: false, days: 0 };
  }
  return { text: `Due in ${diffDays}d`, isPast: false, days: diffDays };
}

interface UrgentDeadlinesSectionProps {
  overdueOrders: DashboardOrderSummary[];
  dueSoonOrders: DashboardOrderSummary[];
}

export const UrgentDeadlinesSection: React.FC<UrgentDeadlinesSectionProps> = ({
  overdueOrders,
  dueSoonOrders,
}) => {
  const combined = [...overdueOrders, ...dueSoonOrders];

  return (
    <Card id="section-urgent-deadlines">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
              {overdueOrders.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Urgent Deadlines & Due Soon
              </CardTitle>
              <CardDescription>
                Orders requiring immediate operator attention or upcoming delivery
              </CardDescription>
            </div>
          </div>
          <Link to="/orders" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            All Orders <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {combined.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">All orders are comfortably on schedule!</p>
            <p className="text-xs">No orders are currently overdue or due within this window.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Target Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-[80px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combined.map((order) => {
                const relative = getDeadlineRelative(order.deadlineAt);
                return (
                  <TableRow key={order.id} id={`row-urgent-${order.id}`}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/orders/${order.id}`}
                        className="hover:underline flex items-center gap-1 font-semibold text-foreground"
                      >
                        {order.orderNumber}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.customerName}</div>
                      {order.customerPhone && (
                        <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{formatDate(order.deadlineAt)}</span>
                        <Badge
                          variant={relative.isPast ? 'destructive' : 'secondary'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {relative.text}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.remainingBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className={buttonVariants({ variant: 'ghost', size: 'xs' })}
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
