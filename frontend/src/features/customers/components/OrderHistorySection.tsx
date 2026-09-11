import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShoppingBag, Plus, Eye, Calendar } from 'lucide-react';
import type { CustomerOrderSummary } from '../../orders/types/orders.types.ts';
import { OrderStatusBadge } from '../../orders/components/OrderStatusBadge.tsx';
import { formatCurrency, formatDate } from '../../orders/constants/orderRules.ts';

export interface OrderHistorySectionProps {
  customerId: string;
  orders?: CustomerOrderSummary[];
}

export const OrderHistorySection: React.FC<OrderHistorySectionProps> = ({
  customerId,
  orders = [],
}) => {
  return (
    <Card className="border shadow-xs" id={`order-history-section-${customerId}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Order History</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Bespoke tailoring orders, production statuses, and delivery schedules for this client.
          </CardDescription>
        </div>

        <Link
          to={`/orders/new?customerId=${customerId}`}
          className={buttonVariants({ size: 'sm' })}
          id="btn-new-order-for-customer"
        >
          <Plus className="size-3.5 mr-1" />
          New Order
        </Link>
      </CardHeader>

      <CardContent className="pt-0">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-8 text-center text-muted-foreground">
            <p className="text-sm">No bespoke orders recorded yet for this client.</p>
            <p className="mt-1 text-xs max-w-sm mb-3">
              Start by creating their first custom tailoring order. Their measurements will be automatically snapshotted.
            </p>
            <Link
              to={`/orders/new?customerId=${customerId}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Plus className="size-3.5 mr-1.5" />
              Create First Order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table id="table-customer-orders">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[20%] text-xs">Order #</TableHead>
                  <TableHead className="w-[18%] text-xs">Status</TableHead>
                  <TableHead className="w-[20%] text-xs">Deadline</TableHead>
                  <TableHead className="w-[22%] text-right text-xs">Total / Balance</TableHead>
                  <TableHead className="w-[20%] text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const total = Number(order.total);
                  const paid = Number(order.paidTotalCache || 0);
                  const balance = Math.max(0, total - paid);

                  return (
                    <TableRow key={order.id} className="hover:bg-muted/10">
                      <TableCell className="font-mono text-xs font-semibold">
                        <Link
                          to={`/orders/${order.id}`}
                          className="text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          <span>{formatDate(order.deadlineAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-xs font-semibold text-foreground block">
                          {formatCurrency(total)}
                        </span>
                        {balance > 0 ? (
                          <span className="text-[10px] font-mono text-destructive">
                            Due: {formatCurrency(balance)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Settled</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/orders/${order.id}`}
                          className={buttonVariants({ variant: 'ghost', size: 'xs' })}
                        >
                          <Eye className="size-3.5 mr-1" />
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
