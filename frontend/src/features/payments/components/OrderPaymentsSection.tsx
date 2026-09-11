import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Order } from '../../orders/types/orders.types.ts';
import type { Payment } from '../types/payments.types.ts';
import { PaymentHistoryTable } from './PaymentHistoryTable.tsx';
import { PaymentRecordDialog } from './PaymentRecordDialog.tsx';
import {
  formatCurrency,
  getPaymentBadgeVariant,
  getPaymentStatusLabel,
} from '../../orders/constants/orderRules.ts';
import { fetchOrder } from '../../orders/api/orders.api.ts';

interface OrderPaymentsSectionProps {
  order: Order;
  onOrderUpdated: (order: Order) => void;
}

export const OrderPaymentsSection: React.FC<OrderPaymentsSectionProps> = ({
  order,
  onOrderUpdated,
}) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const total = Number(order.total) || 0;
  const paidTotal = Number(order.paidTotalCache || 0);
  const remainingBalance =
    order.paymentsSummary?.remainingBalance !== undefined
      ? Number(order.paymentsSummary.remainingBalance)
      : Math.max(0, total - paidTotal);
  const paymentStatus = order.paymentStatusCache || 'UNPAID';

  const payments = (order.payments || []) as Payment[];

  // Calculate percentage paid for progress representation
  const percentPaid = total > 0 ? Math.min(100, Math.max(0, Math.round((paidTotal / total) * 100))) : 0;

  const handlePaymentSuccess = async (_createdPayment: Payment) => {
    try {
      // Refetch full order with updated caches, status, and history
      const freshOrder = await fetchOrder(order.id);
      onOrderUpdated(freshOrder);
    } catch {
      // If refetch fails, construct optimistic update
      const updatedPayments = [_createdPayment, ...payments];
      const newPaid = paidTotal + Number(_createdPayment.amount);
      const newRem = Math.max(0, total - newPaid);
      const newStatus = newPaid >= total ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';

      onOrderUpdated({
        ...order,
        paidTotalCache: newPaid,
        paymentStatusCache: newStatus,
        payments: updatedPayments,
        paymentsSummary: {
          paidTotal: newPaid,
          remainingBalance: newRem,
          paymentStatus: newStatus,
        },
      });
    }
  };

  const isCancelled = order.status === 'CANCELLED';

  return (
    <Card className="border shadow-xs" id="order-payments-section">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">Payment Transactions</CardTitle>
            <Badge variant={getPaymentBadgeVariant(paymentStatus)} className="text-xs">
              {getPaymentStatusLabel(paymentStatus)}
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Recorded down payments, progress installments, and ledger balance adjustments.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            size="sm"
            onClick={() => setDialogOpen(true)}
            id="btn-open-record-payment"
          >
            <Plus className="size-3.5 mr-1.5" />
            {isCancelled ? 'Record Adjustment' : 'Record Payment'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Metric Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground block">Total Valuation</span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {formatCurrency(total)}
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Paid to Date</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {percentPaid}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-semibold text-primary">
                {formatCurrency(paidTotal)}
              </span>
            </div>
            {/* Progress line */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${percentPaid}%` }}
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground block">Remaining Balance</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-mono text-sm font-bold ${
                  remainingBalance > 0 ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {formatCurrency(remainingBalance)}
              </span>
              {remainingBalance === 0 && (
                <CheckCircle2 className="size-3.5 text-primary shrink-0" />
              )}
            </div>
          </div>
        </div>

        {isCancelled && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              This order has been cancelled. Only <strong>ADJUSTMENT</strong> entries (e.g., customer refund) can be logged.
            </span>
          </div>
        )}

        {/* Payment History Table */}
        <PaymentHistoryTable payments={payments} />

        {/* Record Payment Dialog */}
        <PaymentRecordDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          orderId={order.id}
          orderTotal={total}
          currentPaidTotal={paidTotal}
          existingPayments={payments}
          onSuccess={handlePaymentSuccess}
        />
      </CardContent>
    </Card>
  );
};
