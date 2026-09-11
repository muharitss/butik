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
import { AlertTriangle, Scissors, Loader2 } from 'lucide-react';
import { createRevision } from '../api/revisions.api.ts';
import type { Revision } from '../types/revisions.types.ts';
import type { Fitting } from '../../fittings/types/fittings.types.ts';
import { formatDate } from '../constants/revisionRules.ts';

interface RevisionCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  fittings?: Fitting[];
  defaultFittingId?: string | null;
  onSuccess: (created: Revision) => void;
}

export const RevisionCreateDialog: React.FC<RevisionCreateDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  fittings = [],
  defaultFittingId,
  onSuccess,
}) => {
  const [fittingId, setFittingId] = useState<string>('');
  const [issue, setIssue] = useState<string>('');
  const [requestedChange, setRequestedChange] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setApiError(null);
      setIssue('');
      setRequestedChange('');
      setNotes('');
      // If defaultFittingId is provided and valid, set it, else empty string (none)
      if (defaultFittingId) {
        setFittingId(defaultFittingId);
      } else {
        // If there is a fitting that needs revision, default to it
        const needsRevFitting = fittings.find((f) => f.result === 'NEEDS_REVISION');
        setFittingId(needsRevFitting ? needsRevFitting.id : '');
      }
    }
  }, [open, defaultFittingId, fittings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) {
      setApiError('Please describe the issue or fit problem.');
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const created = await createRevision(orderId, {
        fittingId: fittingId ? fittingId : null,
        issue: issue.trim(),
        requestedChange: requestedChange.trim() || null,
        notes: notes.trim() || null,
      });

      onOpenChange(false);
      onSuccess(created);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create revision ticket';
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]" id="revision-create-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Scissors className="size-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">Log Garment Revision</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Document alteration issues, requested tailoring modifications, and link to a fitting session.
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
          {/* Related Fitting Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="revision-fitting-select" className="text-xs font-medium">
              Related Fitting Session
            </Label>
            <select
              id="revision-fitting-select"
              value={fittingId}
              onChange={(e) => setFittingId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">None / Direct Workshop Inspection</option>
              {fittings.map((f) => (
                <option key={f.id} value={f.id}>
                  Fitting #{f.fittingNumber} — {formatDate(f.occurredAt || f.scheduledAt)}{' '}
                  {f.result === 'NEEDS_REVISION' ? '(Needs Revision)' : f.result ? `(${f.result})` : `(${f.status})`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Optionally link this alteration to the trial fitting that revealed the issue.
            </p>
          </div>

          {/* Issue Description */}
          <div className="space-y-1.5">
            <Label htmlFor="revision-issue-input" className="text-xs font-medium">
              Issue / Problem Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="revision-issue-input"
              rows={2}
              placeholder="e.g. Waistband is too tight by 2 cm; armhole puckers when arms are lifted."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              required
            />
          </div>

          {/* Requested Tailoring Change */}
          <div className="space-y-1.5">
            <Label htmlFor="revision-requested-change" className="text-xs font-medium">
              Requested Tailoring Modification
            </Label>
            <Textarea
              id="revision-requested-change"
              rows={2}
              placeholder="e.g. Let out side seams by 1.5 cm; adjust sleeve pitch forward."
              value={requestedChange}
              onChange={(e) => setRequestedChange(e.target.value)}
            />
          </div>

          {/* Workshop Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="revision-notes-input" className="text-xs font-medium">
              Workshop Notes (Optional)
            </Label>
            <Textarea
              id="revision-notes-input"
              rows={2}
              placeholder="Internal instructions or seamstress assignment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              id="btn-cancel-revision-create"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !issue.trim()}
              id="btn-submit-revision-create"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                'Create Revision'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
