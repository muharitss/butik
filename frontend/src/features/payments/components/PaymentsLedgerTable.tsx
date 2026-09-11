import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { Order } from '../../orders/types/orders.types.ts';
import { OrderStatusBadge } from '../../orders/components/OrderStatusBadge.tsx';
import {
  formatCurrency,
  getPaymentBadgeVariant,
  getPaymentStatusLabel,
} from '../../orders/constants/orderRules.ts';

interface PaymentsLedgerTableProps {
  orders: Order[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filterTab: string;
  onRetry: () => void;
  onClearSearch: () => void;
  onOpenPaymentDialog: (order: Order) => void;
}

export const PaymentsLedgerTable: React.FC<PaymentsLedgerTableProps> = ({
  orders,
  loading,
  error,
  searchQuery,
  filterTab,
  onRetry,
  onClearSearch,
  onOpenPaymentDialog,
}) => {
  return (
    <Card className="border shadow-xs overflow-hidden" id="payments-ledger-card">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Ledger Entries</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Detailed valuation and payment balances per client order.
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {orders.length} order(s) listed
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-7 animate-spin mb-2 text-primary" />
            <span className="text-xs">Loading ledger entries...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-destructive">
            <AlertCircle className="size-5 mx-auto mb-1.5" />
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3 text-xs"
            >
              Try Again
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
              <CreditCard className="size-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No Ledger Entries Found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? `No orders matching "${searchQuery}" in this filter.`
                : filterTab === 'UNSETTLED'
                ? 'All customer orders are currently fully settled!'
                : 'No orders recorded yet.'}
            </p>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSearch}
                className="mt-3 text-xs"
              >
                Clear Search Filter
              </Button>
            )}
          </div>
        ) : (
          <Table id="table-payment-ledger">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs font-semibold w-[15%]">Order #</TableHead>
                <TableHead className="text-xs font-semibold w-[22%]">Client Name</TableHead>
                <TableHead className="text-xs font-semibold w-[12%]">Status</TableHead>
                <TableHead className="text-xs font-semibold w-[14%]">Payment State</TableHead>
                <TableHead className="text-xs font-semibold text-right w-[12%]">Total</TableHead>
                <TableHead className="text-xs font-semibold text-right w-[12%]">Paid</TableHead>
                <TableHead className="text-xs font-semibold text-right w-[15%]">Balance Due</TableHead>
                <TableHead className="text-xs font-semibold text-right w-[10%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((ord) => {
                const total = Number(ord.total) || 0;
                const paid = Number(ord.paidTotalCache) || 0;
                const remaining = Math.max(0, total - paid);
                const isPaid = ord.paymentStatusCache === 'PAID' || remaining === 0;
                const customerName = ord.customer?.name || 'Unknown Client';

                return (
                  <TableRow key={ord.id} className="text-xs hover:bg-muted/20">
                    {/* Order Number */}
                    <TableCell className="font-mono font-semibold text-primary whitespace-nowrap">
                      <Link to={`/orders/${ord.id}`} className="hover:underline">
                        {ord.orderNumber}
                      </Link>
                    </TableCell>

                    {/* Customer Info */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <Link
                          to={`/customers/${ord.customerId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {customerName}
                        </Link>
                        {ord.customer?.phone && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {ord.customer.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Order Status */}
                    <TableCell>
                      <OrderStatusBadge status={ord.status} />
                    </TableCell>

                    {/* Payment Status */}
                    <TableCell>
                      <Badge
                        variant={getPaymentBadgeVariant(ord.paymentStatusCache)}
                        className="text-[10px]"
                      >
                        {getPaymentStatusLabel(ord.paymentStatusCache)}
                      </Badge>
                    </TableCell>

                    {/* Total Valuation */}
                    <TableCell className="text-right font-mono text-foreground font-medium">
                      {formatCurrency(total)}
                    </TableCell>

                    {/* Paid Amount */}
                    <TableCell className="text-right font-mono text-primary font-medium">
                      {formatCurrency(paid)}
                    </TableCell>

                    {/* Balance Due */}
                    <TableCell className="text-right font-mono font-bold whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {isPaid ? (
                          <div className="inline-flex items-center gap-1 text-primary">
                            <CheckCircle2 className="size-3 shrink-0" />
                            <span>Lunas</span>
                          </div>
                        ) : (
                          <span className="text-destructive">
                            {formatCurrency(remaining)}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isPaid && ord.status !== 'CANCELLED' && (
                          <Button
                            type="button"
                            size="xs"
                            variant="default"
                            className="h-7 text-xs px-2"
                            onClick={() => onOpenPaymentDialog(ord)}
                            id={`btn-record-payment-${ord.id}`}
                            title="Record payment transaction"
                          >
                            <Plus className="size-3 mr-1" />
                            Pay
                          </Button>
                        )}
                        <Link to={`/orders/${ord.id}`}>
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                            title="Open order details"
                          >
                            <ArrowRight className="size-3" />
                          </Button>
                        </Link>
                      </div>
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
