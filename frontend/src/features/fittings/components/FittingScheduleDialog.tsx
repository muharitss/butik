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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertTriangle, Loader2, Info } from 'lucide-react';
import type { Fitting } from '../types/fittings.types.ts';
import { scheduleFitting } from '../api/fittings.api.ts';

interface FittingScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentFittingCount: number;
  orderStatus: string;
  onSuccess: (fitting: Fitting) => void;
}

export const FittingScheduleDialog: React.FC<FittingScheduleDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  currentFittingCount,
  orderStatus,
  onSuccess,
}) => {
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const nextFittingNumber = currentFittingCount + 1;

  useEffect(() => {
    if (open) {
      setApiError(null);
      setNotes('');
      // Default to tomorrow at 10:00 AM local time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formatted = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
      setScheduledAt(formatted);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setApiError(null);

    try {
      const payload = {
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        notes: notes.trim() || null,
      };

      const result = await scheduleFitting(orderId, payload);
      onOpenChange(false);
      onSuccess(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to schedule fitting session';
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const willChangeStatus = orderStatus === 'IN_PROGRESS' || orderStatus === 'REVISION';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" id="fitting-schedule-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">
              Schedule Fitting #{nextFittingNumber}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Set the appointment date and briefing instructions for the customer trial fitting session.
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <Alert variant="destructive" className="py-2.5">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-xs font-semibold">Scheduling Failed</AlertTitle>
            <AlertDescription className="text-xs">{apiError}</AlertDescription>
          </Alert>
        )}

        {willChangeStatus && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
            <Info className="size-4 text-primary shrink-0 mt-0.5" />
            <span>
              Scheduling this session will advance the order status from{' '}
              <strong className="text-foreground">{orderStatus}</strong> to{' '}
              <strong className="text-foreground">FITTING</strong>.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fitting-scheduled-at" className="text-xs font-medium">
              Appointment Date & Time
            </Label>
            <Input
              id="fitting-scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={submitting}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fitting-notes" className="text-xs font-medium">
              Fitting Notes & Tailor Instructions
            </Label>
            <Textarea
              id="fitting-notes"
              placeholder="e.g. Focus on waist seam allowance and sleeve drape. Bring basting pins."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              id="btn-submit-schedule-fitting"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Scheduling...
                </>
              ) : (
                `Schedule Fitting #${nextFittingNumber}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
