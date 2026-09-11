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
  History,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import type { DashboardOrderSummary } from '../types/dashboard.types.ts';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusBadgeVariant,
  getPaymentStatusLabel,
  getPaymentBadgeVariant,
} from '@/features/orders/constants/orderRules.ts';

interface RecentOrdersSectionProps {
  orders: DashboardOrderSummary[];
}

export const RecentOrdersSection: React.FC<RecentOrdersSectionProps> = ({ orders }) => {
  return (
    <Card id="section-recent-orders">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
              <History className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Recent Orders
              </CardTitle>
              <CardDescription>
                Latest intake orders registered in the atelier
              </CardDescription>
            </div>
          </div>
          <Link to="/orders" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No orders created yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="w-[80px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} id={`row-recent-${order.id}`}>
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
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
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
