import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Receipt,
  Loader2,
  Calendar,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { fetchCustomerPayments } from '../api/customers.api.ts';
import type { CustomerPaymentHistoryItem, PaginationMeta } from '../types/customers.types.ts';
import { formatCurrency, formatDate } from '../../orders/constants/orderRules.ts';
import {
  getPaymentTypeLabel,
  getPaymentTypeBadgeVariant,
} from '../../payments/constants/paymentRules.ts';

export interface CustomerPaymentsTabProps {
  customerId: string;
}

export const CustomerPaymentsTab: React.FC<CustomerPaymentsTabProps> = ({ customerId }) => {
  const [payments, setPayments] = useState<CustomerPaymentHistoryItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async (pageToLoad: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCustomerPayments(customerId, {
        page: pageToLoad,
        pageSize: 10,
      });
      setPayments(res.payments);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadPayments(1);
  }, [loadPayments]);

  return (
    <Card className="border shadow-xs" id={`customer-payments-tab-${customerId}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">Payment History</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {meta.totalItems} {meta.totalItems === 1 ? 'transaction' : 'transactions'}
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Complete record of down payments, installments, settlements, and adjustments across all orders.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" />
            <span className="text-xs">Loading payment transactions...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-destructive">
            {error}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-8 text-center text-muted-foreground">
            <Receipt className="size-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No payment transactions recorded</p>
            <p className="mt-1 text-xs max-w-sm">
              Payments recorded on custom orders will automatically appear in this unified ledger.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-md border border-border">
              <Table id="table-customer-payments">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[18%] text-xs">Date</TableHead>
                    <TableHead className="w-[18%] text-xs">Order #</TableHead>
                    <TableHead className="w-[20%] text-xs">Type</TableHead>
                    <TableHead className="w-[16%] text-xs">Method</TableHead>
                    <TableHead className="w-[28%] text-right text-xs">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const amt = Number(p.amount);
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/10">
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="size-3 shrink-0" />
                            <span>{formatDate(p.recordedAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          <Link
                            to={`/orders/${p.orderId}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <span>{p.orderNumber}</span>
                            <ExternalLink className="size-2.5 opacity-60" />
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getPaymentTypeBadgeVariant(p.type)}
                            className="text-[11px] font-medium"
                          >
                            {getPaymentTypeLabel(p.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.method ? (
                            <span className="flex items-center gap-1">
                              <CreditCard className="size-3" />
                              {p.method}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-xs font-semibold text-foreground block">
                            {formatCurrency(amt)}
                          </span>
                          {p.note && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1 truncate max-w-[200px] ml-auto">
                              {p.note}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  Page {meta.page} of {meta.totalPages} ({meta.totalItems} total)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    disabled={meta.page <= 1 || loading}
                    onClick={() => loadPayments(meta.page - 1)}
                  >
                    <ChevronLeft className="size-3.5 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    disabled={meta.page >= meta.totalPages || loading}
                    onClick={() => loadPayments(meta.page + 1)}
                  >
                    Next
                    <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
