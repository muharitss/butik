import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  AlertTriangle,
  Loader2,
  Calculator,
  RotateCcw,
} from 'lucide-react';
import type { Payment, PaymentType } from '../types/payments.types.ts';
import {
  PAYMENT_TYPES,
  COMMON_PAYMENT_METHODS,
  getPaymentTypeLabel,
  calculatePaymentPreview,
} from '../constants/paymentRules.ts';
import {
  formatCurrency,
  getPaymentBadgeVariant,
  getPaymentStatusLabel,
} from '../../orders/constants/orderRules.ts';
import { createOrderPayment } from '../api/payments.api.ts';

interface PaymentRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTotal: number | string;
  currentPaidTotal: number | string;
  existingPayments?: Payment[];
  onSuccess: (payment: Payment) => void;
}

export const PaymentRecordDialog: React.FC<PaymentRecordDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  orderTotal,
  currentPaidTotal,
  existingPayments = [],
  onSuccess,
}) => {
  const numericTotal = Number(orderTotal) || 0;
  const numericPaid = Number(currentPaidTotal) || 0;
  const remaining = Math.max(0, numericTotal - numericPaid);

  // Form states
  const [type, setType] = useState<PaymentType>('PARTIAL');
  const [amountInput, setAmountInput] = useState<string>('');
  const [method, setMethod] = useState<string>('Bank Transfer');
  const [customMethod, setCustomMethod] = useState<string>('');
  const [reversedPaymentId, setReversedPaymentId] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // When dialog opens or remaining changes, initialize smart defaults
  useEffect(() => {
    if (open) {
      setApiError(null);
      setNote('');
      setReversedPaymentId('');

      // If nothing paid yet, default to DP; if remaining > 0, prefill remaining
      if (numericPaid === 0) {
        setType('DP');
        // Standard 50% DP recommendation or total
        const suggestedDp = Math.round(numericTotal * 0.5);
        setAmountInput(String(suggestedDp > 0 ? suggestedDp : numericTotal));
      } else if (remaining > 0) {
        setType('FINAL');
        setAmountInput(String(remaining));
      } else {
        setType('ADJUSTMENT');
        setAmountInput('');
      }
    }
  }, [open, numericPaid, numericTotal, remaining]);

  // Adjust prefilled amount when changing payment type
  const handleTypeChange = (newType: PaymentType) => {
    setType(newType);
    setApiError(null);

    if (newType === 'FINAL' && remaining > 0) {
      setAmountInput(String(remaining));
    } else if (newType === 'DP' && numericPaid === 0) {
      const half = Math.round(numericTotal * 0.5);
      setAmountInput(String(half > 0 ? half : numericTotal));
    } else if (newType === 'ADJUSTMENT') {
      // Keep or reset
    }
  };

  const preview = calculatePaymentPreview({
    orderTotal: numericTotal,
    currentPaidTotal: numericPaid,
    type,
    amount: amountInput,
    note,
  });

  const effectiveMethod = method === 'CUSTOM' ? customMethod : method;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview.isValid || submitting) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const recorded = await createOrderPayment(orderId, {
        type,
        amount: preview.numericAmount,
        method: effectiveMethod.trim() ? effectiveMethod.trim() : null,
        note: note.trim() ? note.trim() : null,
        reversedPaymentId:
          type === 'ADJUSTMENT' && reversedPaymentId.trim() ? reversedPaymentId : null,
      });

      onSuccess(recorded);
      onOpenChange(false);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full" id="dialog-record-payment">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">Record Payment</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Log a customer payment, down payment, or ledger balance adjustment.
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <Alert variant="destructive" className="my-1">
            <AlertTriangle className="size-4" />
            <AlertTitle>Unable to Record Payment</AlertTitle>
            <AlertDescription className="text-xs">{apiError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Payment Type Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-type" className="text-xs font-medium">
              Payment Classification <span className="text-destructive">*</span>
            </Label>
            <select
              id="payment-type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as PaymentType)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={submitting}
            >
              {PAYMENT_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {getPaymentTypeLabel(pt)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="payment-amount" className="text-xs font-medium">
                Payment Amount (IDR) <span className="text-destructive">*</span>
              </Label>
              {remaining > 0 && type !== 'ADJUSTMENT' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-primary hover:text-primary/80"
                  onClick={() => setAmountInput(String(remaining))}
                >
                  Fill Remaining ({formatCurrency(remaining)})
                </Button>
              )}
            </div>

            <Input
              id="payment-amount"
              type="number"
              step="any"
              placeholder={type === 'ADJUSTMENT' ? 'e.g. -50000 or 50000' : 'e.g. 250000'}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="font-mono text-sm"
              disabled={submitting}
              autoFocus
            />

            {amountInput && !isNaN(Number(amountInput)) && Number(amountInput) !== 0 && (
              <p className="text-[11px] text-muted-foreground font-mono">
                Equivalent:{' '}
                <strong className="text-foreground">
                  {Number(amountInput) < 0
                    ? `-${formatCurrency(Math.abs(Number(amountInput)))} (Refund / Credit)`
                    : formatCurrency(Number(amountInput))}
                </strong>
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment-method" className="text-xs font-medium">
                Payment Channel
              </Label>
              <select
                id="payment-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={submitting}
              >
                {COMMON_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="CUSTOM">Other Method...</option>
              </select>
            </div>

            {method === 'CUSTOM' && (
              <div className="space-y-1.5">
                <Label htmlFor="custom-payment-method" className="text-xs font-medium">
                  Specify Method Name
                </Label>
                <Input
                  id="custom-payment-method"
                  placeholder="e.g. Giro, Marketplace Escrow"
                  value={customMethod}
                  onChange={(e) => setCustomMethod(e.target.value)}
                  className="text-xs"
                  disabled={submitting}
                />
              </div>
            )}
          </div>

          {/* Reversal Selector (Adjustment only) */}
          {type === 'ADJUSTMENT' && existingPayments.length > 0 && (
            <div className="space-y-1.5 bg-muted/40 p-2.5 rounded-md border border-border/80">
              <div className="flex items-center gap-1.5">
                <RotateCcw className="size-3.5 text-muted-foreground" />
                <Label htmlFor="reversed-payment-id" className="text-xs font-medium">
                  Associated Original Payment (Optional Reversal Link)
                </Label>
              </div>
              <select
                id="reversed-payment-id"
                value={reversedPaymentId}
                onChange={(e) => setReversedPaymentId(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={submitting}
              >
                <option value="">No specific payment linked (General adjustment)</option>
                {existingPayments.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPaymentTypeLabel(p.type)} — {formatCurrency(p.amount)} (
                    {new Date(p.recordedAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Note Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="payment-note" className="text-xs font-medium">
                Payment Note / Reference
                {type === 'ADJUSTMENT' && <span className="text-destructive"> *</span>}
              </Label>
              {type === 'ADJUSTMENT' && (
                <span className="text-[10px] text-muted-foreground italic">
                  Required for audit trail
                </span>
              )}
            </div>
            <Textarea
              id="payment-note"
              rows={2}
              placeholder={
                type === 'ADJUSTMENT'
                  ? 'Describe reason for adjustment / refund (required)...'
                  : 'Optional note (e.g. receipt no, transfer reference, customer notes)...'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs"
              disabled={submitting}
            />
          </div>

          {/* Client-side Live Preview Card */}
          <div
            className="rounded-lg border bg-card p-3 space-y-2.5 text-xs"
            id="payment-preview-card"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Calculator className="size-3.5" />
                <span>Resulting Balance Preview</span>
              </div>
              <Badge variant={getPaymentBadgeVariant(preview.resultingStatus)} className="text-[10px]">
                {getPaymentStatusLabel(preview.resultingStatus)}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
              <div className="bg-muted/30 rounded p-1.5">
                <span className="text-[10px] text-muted-foreground block">Current Paid</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(numericPaid)}
                </span>
              </div>

              <div className="bg-muted/30 rounded p-1.5">
                <span className="text-[10px] text-muted-foreground block">Payment Entry</span>
                <span className="font-mono font-medium text-primary">
                  {preview.numericAmount < 0
                    ? `-${formatCurrency(Math.abs(preview.numericAmount))}`
                    : `+${formatCurrency(preview.numericAmount)}`}
                </span>
              </div>

              <div className="bg-muted/30 rounded p-1.5">
                <span className="text-[10px] text-muted-foreground block">New Balance</span>
                <span
                  className={`font-mono font-bold ${
                    preview.resultingRemainingBalance > 0
                      ? 'text-destructive'
                      : 'text-foreground'
                  }`}
                >
                  {formatCurrency(preview.resultingRemainingBalance)}
                </span>
              </div>
            </div>

            {/* Overpayment warning or validation alert */}
            {preview.wouldOverpay && (
              <Alert variant="destructive" className="py-2 mt-1">
                <AlertTriangle className="size-3.5" />
                <AlertDescription className="text-xs">
                  {preview.validationError ||
                    'Payment would exceed total order amount. Overpayments are only allowed as ADJUSTMENT.'}
                </AlertDescription>
              </Alert>
            )}

            {!preview.wouldOverpay && !preview.isValid && preview.validationError && (
              <p className="text-[11px] text-muted-foreground italic text-center">
                {preview.validationError}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!preview.isValid || submitting}
              id="btn-submit-payment"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Recording...
                </>
              ) : (
                <>
                  <CreditCard className="size-3.5 mr-1.5" />
                  Confirm & Record
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
