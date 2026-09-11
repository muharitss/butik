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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { Fitting } from '../types/fittings.types.ts';
import { updateFitting } from '../api/fittings.api.ts';

interface FittingCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  fitting: Fitting | null;
  onSuccess: (updatedFitting: Fitting) => void;
}

export const FittingCancelDialog: React.FC<FittingCancelDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  fitting,
  onSuccess,
}) => {
  const [cancellationNotes, setCancellationNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (open && fitting) {
      setApiError(null);
      setCancellationNotes('');
    }
  }, [open, fitting]);

  if (!fitting) return null;

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setApiError(null);

    try {
      const updated = await updateFitting(orderId, fitting.id, {
        status: 'CANCELLED',
        notes: cancellationNotes.trim()
          ? `${fitting.notes ? fitting.notes + ' | ' : ''}Cancellation reason: ${cancellationNotes.trim()}`
          : fitting.notes,
      });

      onOpenChange(false);
      onSuccess(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel fitting appointment';
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]" id="fitting-cancel-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-destructive" />
            <DialogTitle className="text-lg font-semibold">
              Cancel Fitting #{fitting.fittingNumber}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            This will mark Fitting #{fitting.fittingNumber} as Cancelled. Once cancelled, this appointment cannot be reopened.
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <Alert variant="destructive" className="py-2.5">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-xs font-semibold">Cancellation Error</AlertTitle>
            <AlertDescription className="text-xs">{apiError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fitting-cancel-reason" className="text-xs font-medium">
              Reason for Cancellation (Optional)
            </Label>
            <Textarea
              id="fitting-cancel-reason"
              placeholder="e.g. Customer requested rescheduling or trial cancelled by client."
              value={cancellationNotes}
              onChange={(e) => setCancellationNotes(e.target.value)}
              disabled={submitting}
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Keep Fitting
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={submitting}
              id="btn-confirm-cancel-fitting"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
