import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Receipt,
} from 'lucide-react';
import type { Order } from '../../orders/types/orders.types.ts';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusBadgeVariant,
  getPaymentStatusLabel,
  getPaymentBadgeVariant,
} from '../../orders/constants/orderRules.ts';

interface BreakdownSectionsProps {
  orders: Order[];
  loading: boolean;
  from?: string;
  to?: string;
}

export const BreakdownSections: React.FC<BreakdownSectionsProps> = ({
  orders,
  loading,
  from,
  to,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');
  const [orderPage, setOrderPage] = useState<number>(1);
  const pageSize = 10;

  // Filter orders by orderDate period if dates are provided
  const periodOrders = orders.filter((order) => {
    if (!from && !to) return true;
    const orderDateStr = order.orderDate ? order.orderDate.slice(0, 10) : '';
    if (from && orderDateStr < from) return false;
    if (to && orderDateStr > to) return false;
    return true;
  });

  const totalPages = Math.ceil(periodOrders.length / pageSize) || 1;
  const paginatedOrders = periodOrders.slice((orderPage - 1) * pageSize, orderPage * pageSize);

  // Filter orders that have payments
  const paidOrders = periodOrders.filter(
    (o) => Number(o.paidTotalCache) > 0 || o.paymentStatusCache === 'PAID'
  );

  return (
    <div className="space-y-4" id="reports-breakdown-sections">
      {/* Tabs Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={activeTab === 'orders' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('orders');
              setOrderPage(1);
            }}
            className="text-xs h-8 gap-1.5"
            id="tab-orders-breakdown"
          >
            <ClipboardList className="size-3.5" />
            Order Breakdown ({periodOrders.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'payments' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('payments');
              setOrderPage(1);
            }}
            className="text-xs h-8 gap-1.5"
            id="tab-payments-breakdown"
          >
            <CreditCard className="size-3.5" />
            Payment Breakdown ({paidOrders.length})
          </Button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <Card id="card-orders-breakdown">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold">Orders in Selected Period</CardTitle>
            <CardDescription className="text-xs">
              Read-only tabular summary of orders created in this timeframe.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28 text-xs font-semibold">Order #</TableHead>
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold">Order Date</TableHead>
                    <TableHead className="text-xs font-semibold">Deadline</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Total</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Paid</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && periodOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : paginatedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                        No orders found for the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOrders.map((order) => {
                      const totalNum = Number(order.total) || 0;
                      const paidNum = Number(order.paidTotalCache) || 0;
                      const balance = Math.max(0, totalNum - paidNum);

                      return (
                        <TableRow key={order.id} className="text-xs">
                          <TableCell className="font-medium">
                            <Link
                              to={`/orders/${order.id}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {order.orderNumber}
                              <ExternalLink className="size-3 opacity-60" />
                            </Link>
                          </TableCell>
                          <TableCell>
                            {order.customer ? (
                              <div>
                                <span className="font-medium text-foreground">
                                  {order.customer.name}
                                </span>
                                {order.customer.phone && (
                                  <span className="block text-[11px] text-muted-foreground">
                                    {order.customer.phone}
                                  </span>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(order.orderDate)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(order.deadlineAt)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusBadgeVariant(order.status)}
                              className="text-[10px] py-0"
                            >
                              {getStatusLabel(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(order.total)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(order.paidTotalCache)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {balance > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                {formatCurrency(balance)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Lunas</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
                <div>
                  Page {orderPage} of {totalPages} ({periodOrders.length} total orders)
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    disabled={orderPage <= 1}
                    onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    disabled={orderPage >= totalPages}
                    onClick={() => setOrderPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card id="card-payments-breakdown">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold">Payments & Collections Breakdown</CardTitle>
            <CardDescription className="text-xs">
              Read-only summary of payment status and collected balances on period orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28 text-xs font-semibold">Order #</TableHead>
                    <TableHead className="text-xs font-semibold">Customer</TableHead>
                    <TableHead className="text-xs font-semibold">Payment Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Order Total</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Collected Amount</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Remaining Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && paidOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                        Loading payments...
                      </TableCell>
                    </TableRow>
                  ) : paidOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                        No orders with recorded payments in the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paidOrders.map((order) => {
                      const totalNum = Number(order.total) || 0;
                      const paidNum = Number(order.paidTotalCache) || 0;
                      const remaining = Math.max(0, totalNum - paidNum);

                      return (
                        <TableRow key={order.id} className="text-xs">
                          <TableCell className="font-medium">
                            <Link
                              to={`/orders/${order.id}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {order.orderNumber}
                              <Receipt className="size-3 opacity-60" />
                            </Link>
                          </TableCell>
                          <TableCell>
                            {order.customer ? order.customer.name : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getPaymentBadgeVariant(order.paymentStatusCache)}
                              className="text-[10px] py-0"
                            >
                              {getPaymentStatusLabel(order.paymentStatusCache)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(order.total)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(order.paidTotalCache)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {remaining > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                {formatCurrency(remaining)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Rp 0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
