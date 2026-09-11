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
import {
  CheckCircle2,
  PlayCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { Revision, RevisionStatus } from '../types/revisions.types.ts';
import { updateRevision } from '../api/revisions.api.ts';

export type RevisionActionType = 'START' | 'RESOLVE' | 'CANCEL';

interface RevisionStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  revision: Revision | null;
  actionType: RevisionActionType | null;
  onSuccess: (updated: Revision) => void;
}

export const RevisionStatusDialog: React.FC<RevisionStatusDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  revision,
  actionType,
  onSuccess,
}) => {
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (open && revision) {
      setApiError(null);
      setNotes('');
    }
  }, [open, revision, actionType]);

  if (!revision || !actionType) return null;

  const getTargetStatus = (): RevisionStatus => {
    switch (actionType) {
      case 'START':
        return 'IN_PROGRESS';
      case 'RESOLVE':
        return 'RESOLVED';
      case 'CANCEL':
        return 'CANCELLED';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setApiError(null);

    const targetStatus = getTargetStatus();

    try {
      // Append or set notes if provided
      let updatedNotes = revision.notes || undefined;
      if (notes.trim()) {
        const prefix =
          actionType === 'RESOLVE'
            ? 'Resolution: '
            : actionType === 'CANCEL'
              ? 'Cancellation: '
              : 'Work log: ';
        updatedNotes = revision.notes
          ? `${revision.notes} | ${prefix}${notes.trim()}`
          : `${prefix}${notes.trim()}`;
      }

      const updated = await updateRevision(orderId, revision.id, {
        status: targetStatus,
        notes: updatedNotes,
        resolvedAt: targetStatus === 'RESOLVED' ? new Date().toISOString() : undefined,
      });

      onOpenChange(false);
      onSuccess(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update revision status';
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isStart = actionType === 'START';
  const isResolve = actionType === 'RESOLVE';
  const isCancel = actionType === 'CANCEL';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]" id="revision-status-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isStart && <PlayCircle className="size-5 text-primary" />}
            {isResolve && <CheckCircle2 className="size-5 text-primary" />}
            {isCancel && <XCircle className="size-5 text-destructive" />}
            <DialogTitle className="text-lg font-semibold">
              {isStart && 'Start Work on Revision'}
              {isResolve && 'Mark Revision as Resolved'}
              {isCancel && 'Cancel Revision Ticket'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isStart &&
              'Move this revision to In Progress to indicate tailoring alterations have begun.'}
            {isResolve &&
              'Confirm that alterations have been executed. Once all revisions are resolved, the order is ready for refitting or final approval.'}
            {isCancel &&
              'Cancel this revision if the customer or tailor determines no changes are required.'}
          </DialogDescription>
        </DialogHeader>

        {apiError && (
          <Alert variant="destructive" className="py-2.5">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-xs font-semibold">Action Error</AlertTitle>
            <AlertDescription className="text-xs">{apiError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-md bg-muted/40 border border-border/70 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              Revision Issue:
            </span>
            <p className="text-xs text-foreground font-medium">{revision.issue}</p>
            {revision.requestedChange && (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium">Requested change:</span> {revision.requestedChange}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="revision-action-notes" className="text-xs font-medium">
              {isResolve && 'Resolution Notes (Optional)'}
              {isCancel && 'Reason for Cancellation (Optional)'}
              {isStart && 'Workshop / Seamstress Note (Optional)'}
            </Label>
            <Textarea
              id="revision-action-notes"
              placeholder={
                isResolve
                  ? 'e.g. Alterations completed. Seams pressed and ready for fitting inspection.'
                  : isCancel
                    ? 'e.g. Fit deemed acceptable by customer without adjustments.'
                    : 'e.g. Assigned to master tailor for bodice alteration.'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              rows={3}
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
              Close
            </Button>
            <Button
              type="submit"
              variant={isCancel ? 'destructive' : 'default'}
              size="sm"
              disabled={submitting}
              id="btn-confirm-revision-status-action"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : isStart ? (
                'Start Work'
              ) : isResolve ? (
                'Mark as Resolved'
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
