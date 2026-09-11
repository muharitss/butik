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
  PackageCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import type { DashboardOrderSummary } from '../types/dashboard.types.ts';
import {
  formatCurrency,
  getPaymentStatusLabel,
  getPaymentBadgeVariant,
} from '@/features/orders/constants/orderRules.ts';

interface ReadyOrdersSectionProps {
  orders: DashboardOrderSummary[];
}

export const ReadyOrdersSection: React.FC<ReadyOrdersSectionProps> = ({ orders }) => {
  return (
    <Card id="section-ready-orders">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
              <PackageCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Ready for Handover
              </CardTitle>
              <CardDescription>
                Finished garments ready for customer pickup
              </CardDescription>
            </div>
          </div>
          <Link
            to="/orders?status=READY"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            View All Ready <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <PackageCheck className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">No orders currently awaiting pickup.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Remaining Balance</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="w-[80px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} id={`row-ready-${order.id}`}>
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
                  <TableCell>{formatCurrency(order.total)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(order.remainingBalance)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>
                      {getPaymentStatusLabel(order.paymentStatus)}
                    </Badge>
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
