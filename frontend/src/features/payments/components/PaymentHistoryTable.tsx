import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ArrowDownLeft, RotateCcw } from 'lucide-react';
import type { Payment } from '../types/payments.types.ts';
import {
  getPaymentTypeBadgeVariant,
  getPaymentTypeLabel,
} from '../constants/paymentRules.ts';
import {
  formatCurrency,
  formatDateTime,
} from '../../orders/constants/orderRules.ts';

interface PaymentHistoryTableProps {
  payments: Payment[];
}

export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({ payments }) => {
  if (payments.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-10 px-4 text-center border rounded-lg bg-card/40 border-dashed"
        id="empty-payment-history"
      >
        <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
          <CreditCard className="size-5" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">No Payments Recorded</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          No down payments or balance settlements have been logged for this order yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden" id="payment-history-table-container">
      <Table id="payment-history-table">
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="text-xs font-semibold">Date & Time</TableHead>
            <TableHead className="text-xs font-semibold">Type</TableHead>
            <TableHead className="text-xs font-semibold">Method</TableHead>
            <TableHead className="text-xs font-semibold">Notes / Reversal</TableHead>
            <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => {
            const numericAmount = Number(payment.amount);
            const isNegative = numericAmount < 0;

            return (
              <TableRow key={payment.id} className="text-xs hover:bg-muted/20">
                <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                  <div>{formatDateTime(payment.recordedAt)}</div>
                  {payment.user?.name && (
                    <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                      by {payment.user.name}
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  <Badge variant={getPaymentTypeBadgeVariant(payment.type)} className="text-[10px]">
                    {getPaymentTypeLabel(payment.type)}
                  </Badge>
                </TableCell>

                <TableCell className="text-foreground">
                  {payment.method || <span className="text-muted-foreground italic">—</span>}
                </TableCell>

                <TableCell className="max-w-[220px]">
                  <div className="space-y-1">
                    {payment.note ? (
                      <p className="text-xs text-foreground truncate" title={payment.note}>
                        {payment.note}
                      </p>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">—</span>
                    )}

                    {payment.reversedPaymentId && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                        <RotateCcw className="size-3 shrink-0" />
                        <span>Reversal of previous payment</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right font-mono font-semibold whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    {isNegative && <ArrowDownLeft className="size-3 text-destructive shrink-0" />}
                    <span className={isNegative ? 'text-destructive' : 'text-foreground'}>
                      {isNegative
                        ? `-${formatCurrency(Math.abs(numericAmount))}`
                        : formatCurrency(numericAmount)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
