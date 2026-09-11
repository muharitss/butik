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
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ClipboardCheck,
  Scissors,
  Check,
} from 'lucide-react';
import type { Fitting, FittingResult } from '../types/fittings.types.ts';
import { updateFitting } from '../api/fittings.api.ts';

interface FittingRecordResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  fitting: Fitting | null;
  onSuccess: (updatedFitting: Fitting) => void;
}

export const FittingRecordResultDialog: React.FC<FittingRecordResultDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  fitting,
  onSuccess,
}) => {
  const [result, setResult] = useState<FittingResult>('APPROVED');
  const [occurredAt, setOccurredAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [nextAction, setNextAction] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (open && fitting) {
      setApiError(null);
      setResult('APPROVED');
      setNotes(fitting.notes || '');
      setNextAction('');

      // Prefill occurredAt with current local datetime
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      setOccurredAt(formatted);
    }
  }, [open, fitting]);

  if (!fitting) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!occurredAt) {
      setApiError('Please select the date and time when the fitting took place.');
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const updated = await updateFitting(orderId, fitting.id, {
        status: 'DONE',
        result,
        occurredAt: new Date(occurredAt).toISOString(),
        notes: notes.trim() || null,
        nextAction: nextAction.trim() || null,
      });

      onOpenChange(false);
      onSuccess(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record fitting outcome';
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" id="fitting-record-result-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">
              Record Outcome: Fitting #{fitting.fittingNumber}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Document whether the garments fit correctly or if tailoring alterations are required.
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <Alert variant="destructive" className="py-2.5">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-xs font-semibold">Submission Error</AlertTitle>
            <AlertDescription className="text-xs">{apiError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Outcome Choice Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Fitting Result</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setResult('APPROVED')}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  result === 'APPROVED'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-accent/50'
                }`}
                id="radio-result-approved"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`size-4 ${
                        result === 'APPROVED' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <span className="text-xs font-semibold text-foreground">Approved</span>
                  </div>
                  {result === 'APPROVED' && (
                    <Check className="size-3.5 text-primary" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Fit is satisfactory. Order will move to <strong>READY</strong>.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setResult('NEEDS_REVISION')}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  result === 'NEEDS_REVISION'
                    ? 'border-destructive bg-destructive/10 ring-1 ring-destructive'
                    : 'border-border bg-card hover:bg-accent/50'
                }`}
                id="radio-result-needs-revision"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5">
                    <Scissors
                      className={`size-4 ${
                        result === 'NEEDS_REVISION' ? 'text-destructive' : 'text-muted-foreground'
                      }`}
                    />
                    <span className="text-xs font-semibold text-foreground">Needs Revision</span>
                  </div>
                  {result === 'NEEDS_REVISION' && (
                    <Check className="size-3.5 text-destructive" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Alterations required. Order will move to <strong>REVISION</strong>.
                </p>
              </button>
            </div>
          </div>

          {/* Session Occurrence Date */}
          <div className="space-y-1.5">
            <Label htmlFor="fitting-occurred-at" className="text-xs font-medium">
              Fitting Session Timestamp <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fitting-occurred-at"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              disabled={submitting}
              className="text-xs font-mono"
              required
            />
          </div>

          {/* Fitting Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="fitting-outcome-notes" className="text-xs font-medium">
              Observations & Customer Feedback
            </Label>
            <Textarea
              id="fitting-outcome-notes"
              placeholder="e.g. Chest fits well; waist needs to be taken in by 2cm. Customer satisfied with overall silhouette."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* Next Action */}
          <div className="space-y-1.5">
            <Label htmlFor="fitting-next-action" className="text-xs font-medium">
              Next Action Item
            </Label>
            <Input
              id="fitting-next-action"
              placeholder={
                result === 'NEEDS_REVISION'
                  ? 'e.g. Alter side seams and schedule follow-up trial'
                  : 'e.g. Proceed with final pressing and packaging'
              }
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              disabled={submitting}
              className="text-xs"
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
              id="btn-submit-record-result"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving Outcome...
                </>
              ) : (
                'Save Fitting Outcome'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
