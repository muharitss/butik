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
  CreditCard,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import type { DashboardOrderSummary } from '../types/dashboard.types.ts';
import {
  formatCurrency,
  getStatusLabel,
  getStatusBadgeVariant,
} from '@/features/orders/constants/orderRules.ts';

interface UnpaidOrdersSectionProps {
  orders: DashboardOrderSummary[];
}

export const UnpaidOrdersSection: React.FC<UnpaidOrdersSectionProps> = ({ orders }) => {
  return (
    <Card id="section-unpaid-orders">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Pending Settlements & Balances
              </CardTitle>
              <CardDescription>
                Active orders with unpaid balance or pending down payment
              </CardDescription>
            </div>
          </div>
          <Link to="/payments" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Payments Ledger <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Zero outstanding balances!</p>
            <p className="text-xs">All active orders are fully settled.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead className="text-right font-semibold">Remaining Balance</TableHead>
                <TableHead className="w-[80px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} id={`row-unpaid-${order.id}`}>
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
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(order.total)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency(order.paidTotal)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground">
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
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
