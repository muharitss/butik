import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Scissors,
  Ruler,
  RefreshCw,
  PackageCheck,
  CheckCheck,
} from 'lucide-react';
import type { Order, OrderStatus } from '../types/orders.types.ts';
import {
  ALLOWED_TRANSITIONS,
  getStatusLabel,
  transitionRequiresReason,
} from '../constants/orderRules.ts';
import { transitionOrder } from '../api/orders.api.ts';

interface OrderTransitionControlProps {
  order: Order;
  onTransitionSuccess: (updatedOrder: Order) => void;
}

export const OrderTransitionControl: React.FC<OrderTransitionControlProps> = ({
  order,
  onTransitionSuccess,
}) => {
  const currentStatus = order.status;
  const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus] || [];

  const [loadingTarget, setLoadingTarget] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dialog state for transitions requiring a reason
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<OrderStatus | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const getTransitionMeta = (toStatus: OrderStatus) => {
    switch (toStatus) {
      case 'CONFIRMED':
        return {
          label: 'Confirm Order',
          icon: <CheckCircle2 className="size-4 mr-1.5" />,
          variant: 'default' as const,
          description: 'Move order from Draft to Confirmed once items and measurements are verified.',
        };
      case 'IN_PROGRESS':
        return {
          label: 'Start Production',
          icon: <Scissors className="size-4 mr-1.5" />,
          variant: 'default' as const,
          description: 'Mark order as cutting and tailoring in progress.',
        };
      case 'FITTING':
        return {
          label: 'Send to Fitting',
          icon: <Ruler className="size-4 mr-1.5" />,
          variant: 'default' as const,
          description: 'Order garments are ready for client trial & measurement fitting session.',
        };
      case 'REVISION':
        return {
          label: 'Request Revision',
          icon: <RefreshCw className="size-4 mr-1.5" />,
          variant: 'secondary' as const,
          description: 'Log required tailoring alteration adjustments.',
        };
      case 'READY':
        return {
          label: 'Mark Ready for Pickup',
          icon: <PackageCheck className="size-4 mr-1.5" />,
          variant: 'default' as const,
          description: 'Garment finished and waiting for customer pickup or delivery.',
        };
      case 'COMPLETED':
        return {
          label: 'Complete Order',
          icon: <CheckCheck className="size-4 mr-1.5" />,
          variant: 'default' as const,
          description: 'Customer has received order and outstanding balance is settled.',
        };
      case 'CANCELLED':
        return {
          label: 'Cancel Order',
          icon: <XCircle className="size-4 mr-1.5" />,
          variant: 'destructive' as const,
          description: 'Void order. Requires a cancellation reason.',
        };
      default:
        return {
          label: `Move to ${getStatusLabel(toStatus)}`,
          icon: <ArrowRight className="size-4 mr-1.5" />,
          variant: 'outline' as const,
          description: '',
        };
    }
  };

  const executeTransition = async (toStatus: OrderStatus, reason?: string | null) => {
    setLoadingTarget(toStatus);
    setError(null);
    try {
      const updated = await transitionOrder(order.id, {
        toStatus,
        reason: reason || undefined,
      });
      onTransitionSuccess(updated);
      setReasonDialogOpen(false);
      setPendingTargetStatus(null);
      setReasonText('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Status transition failed';
      if (reasonDialogOpen) {
        setReasonError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoadingTarget(null);
    }
  };

  const handleActionClick = (targetStatus: OrderStatus) => {
    setError(null);
    if (transitionRequiresReason(targetStatus, currentStatus)) {
      setPendingTargetStatus(targetStatus);
      setReasonText('');
      setReasonError(null);
      setReasonDialogOpen(true);
      return;
    }

    // Client-side guard checks for immediate user feedback
    if (currentStatus === 'DRAFT' && targetStatus === 'CONFIRMED') {
      if (!order.items || order.items.length === 0) {
        setError('Cannot confirm order: at least one line item is required.');
        return;
      }
    }

    if (currentStatus === 'READY' && targetStatus === 'COMPLETED') {
      const balance = Number(order.total) - Number(order.paidTotalCache);
      if (balance > 0) {
        setError(
          `Cannot complete order with an outstanding unpaid balance of Rp ${balance.toLocaleString('id-ID')}. Please record full payment first.`
        );
        return;
      }
    }

    executeTransition(targetStatus);
  };

  const handleReasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTargetStatus) return;
    if (!reasonText.trim()) {
      setReasonError('Please provide a reason to continue.');
      return;
    }
    executeTransition(pendingTargetStatus, reasonText.trim());
  };

  if (allowedTransitions.length === 0) {
    return (
      <Card className="border bg-muted/20">
        <CardContent className="py-3 px-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {currentStatus === 'COMPLETED' ? (
              <CheckCheck className="size-4 text-primary" />
            ) : (
              <XCircle className="size-4 text-destructive" />
            )}
            <span>
              This order is in terminal status (<strong>{getStatusLabel(currentStatus)}</strong>). No further transitions allowed.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" id="order-transition-control">
      <Card className="border shadow-xs bg-card">
        <CardContent className="py-4 px-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Workflow Actions
              </p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                Current status: <span className="font-semibold">{getStatusLabel(currentStatus)}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {allowedTransitions.map((toStatus) => {
                const meta = getTransitionMeta(toStatus);
                const isWorking = loadingTarget === toStatus;

                return (
                  <Button
                    key={toStatus}
                    id={`btn-transition-to-${toStatus.toLowerCase()}`}
                    variant={meta.variant}
                    size="sm"
                    disabled={loadingTarget !== null}
                    onClick={() => handleActionClick(toStatus)}
                  >
                    {isWorking ? (
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    ) : (
                      meta.icon
                    )}
                    {meta.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Action Blocked</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Reason Dialog (Cancellation or Reopen to Revision) */}
      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent id="dialog-transition-reason">
          <form onSubmit={handleReasonSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {pendingTargetStatus === 'CANCELLED'
                  ? 'Cancel Order'
                  : `Transition to ${pendingTargetStatus ? getStatusLabel(pendingTargetStatus) : ''}`}
              </DialogTitle>
              <DialogDescription>
                {pendingTargetStatus === 'CANCELLED'
                  ? 'Cancelling an order is a terminal action. Please provide an explicit cancellation reason for the audit trail.'
                  : 'Please enter notes or reason for this status change.'}
              </DialogDescription>
            </DialogHeader>

            {reasonError && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertDescription>{reasonError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="transition-reason-input" className="text-xs font-medium">
                Reason / Explanation <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="transition-reason-input"
                rows={3}
                placeholder={
                  pendingTargetStatus === 'CANCELLED'
                    ? 'e.g. Customer cancelled due to change of wedding date...'
                    : 'e.g. Waist needs 2cm reduction after customer fitting session...'
                }
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                autoFocus
                required
                className="text-xs"
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReasonDialogOpen(false)}
                disabled={loadingTarget !== null}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={pendingTargetStatus === 'CANCELLED' ? 'destructive' : 'default'}
                size="sm"
                id="btn-confirm-transition-reason"
                disabled={loadingTarget !== null || !reasonText.trim()}
              >
                {loadingTarget !== null && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                Confirm Transition
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
