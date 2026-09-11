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
import { Button } from '@/components/ui/button';
import {
  Scissors,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import type { Revision } from '../types/revisions.types.ts';
import type { Fitting } from '../../fittings/types/fittings.types.ts';
import {
  getRevisionStatusLabel,
  getRevisionBadgeVariant,
  formatDate,
} from '../constants/revisionRules.ts';
import type { RevisionActionType } from './RevisionStatusDialog.tsx';

interface RevisionsListTableProps {
  revisions: Revision[];
  fittings?: Fitting[];
  onActionClick: (revision: Revision, action: RevisionActionType) => void;
}

export const RevisionsListTable: React.FC<RevisionsListTableProps> = ({
  revisions,
  fittings = [],
  onActionClick,
}) => {
  if (revisions.length === 0) {
    return (
      <div className="py-8 text-center border rounded-lg bg-card/40 border-dashed" id="empty-revisions-state">
        <Scissors className="size-8 mx-auto text-muted-foreground/60 mb-2" />
        <h4 className="text-sm font-medium text-foreground">No Alteration Revisions Logged</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
          No garment alterations have been requested yet. If a fitting reveals sizing adjustments or modifications are needed, log a revision here.
        </p>
      </div>
    );
  }

  // Create lookup map for fittings
  const fittingMap = new Map<string, Fitting>();
  fittings.forEach((f) => {
    fittingMap.set(f.id, f);
  });

  return (
    <div className="rounded-md border border-border overflow-x-auto" id="revisions-list-table-container">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[80px] text-xs font-semibold">#</TableHead>
            <TableHead className="min-w-[220px] text-xs font-semibold">Issue & Modification</TableHead>
            <TableHead className="text-xs font-semibold">Related Fitting</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold">Timeline</TableHead>
            <TableHead className="text-right text-xs font-semibold min-w-[160px]">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {revisions.map((rev, idx) => {
            const relatedFitting = rev.fittingId ? fittingMap.get(rev.fittingId) : null;
            const isOpen = rev.status === 'OPEN';
            const isInProgress = rev.status === 'IN_PROGRESS';
            const isResolved = rev.status === 'RESOLVED';
            const isCancelled = rev.status === 'CANCELLED';

            return (
              <TableRow
                key={rev.id}
                className={`transition-colors ${
                  isOpen || isInProgress ? 'bg-background' : 'bg-muted/10 opacity-85'
                }`}
                id={`revision-row-${idx + 1}`}
              >
                {/* Index / Number */}
                <TableCell className="font-mono text-xs font-medium text-muted-foreground align-top py-3">
                  REV-{idx + 1}
                </TableCell>

                {/* Issue & Modification Details */}
                <TableCell className="align-top py-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">{rev.issue}</p>

                    {rev.requestedChange && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground/80">Change:</span>{' '}
                        {rev.requestedChange}
                      </p>
                    )}

                    {rev.notes && (
                      <p className="text-[10px] text-muted-foreground italic bg-muted/30 p-1 rounded border border-border/50">
                        {rev.notes}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Related Fitting */}
                <TableCell className="align-top py-3 text-xs">
                  {relatedFitting ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                          Fitting #{relatedFitting.fittingNumber}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground block">
                        {formatDate(relatedFitting.occurredAt || relatedFitting.scheduledAt)}
                      </span>
                    </div>
                  ) : rev.fittingId ? (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Linked Session
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">
                      Direct Workshop
                    </span>
                  )}
                </TableCell>

                {/* Status Badge */}
                <TableCell className="align-top py-3">
                  <div className="flex flex-col items-start gap-1">
                    <Badge
                      variant={getRevisionBadgeVariant(rev.status)}
                      className="text-[11px] capitalize font-medium"
                      id={`badge-revision-status-${idx + 1}`}
                    >
                      {getRevisionStatusLabel(rev.status)}
                    </Badge>
                    {(isOpen || isInProgress) && (
                      <span className="text-[10px] text-destructive font-medium">
                        ● Open (blocks Ready)
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Timeline */}
                <TableCell className="align-top py-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3 shrink-0" />
                      <span>Created: {formatDate(rev.createdAt)}</span>
                    </div>

                    {isResolved && rev.resolvedAt && (
                      <div className="flex items-center gap-1 text-[11px] text-primary font-medium">
                        <CheckCircle2 className="size-3 shrink-0" />
                        <span>Resolved: {formatDate(rev.resolvedAt)}</span>
                      </div>
                    )}

                    {isCancelled && (
                      <span className="text-[10px] text-muted-foreground/80 block">
                        Cancelled
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Action Buttons */}
                <TableCell className="align-top py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {isOpen && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs px-2"
                        onClick={() => onActionClick(rev, 'START')}
                        title="Begin working on alteration"
                        id={`btn-start-revision-${idx + 1}`}
                      >
                        <PlayCircle className="size-3 mr-1" />
                        Start
                      </Button>
                    )}

                    {(isOpen || isInProgress) && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          className="h-7 text-xs px-2"
                          onClick={() => onActionClick(rev, 'RESOLVE')}
                          title="Mark alteration completed"
                          id={`btn-resolve-revision-${idx + 1}`}
                        >
                          <CheckCircle2 className="size-3 mr-1" />
                          Resolve
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-1.5 text-muted-foreground hover:text-destructive"
                          onClick={() => onActionClick(rev, 'CANCEL')}
                          title="Cancel revision"
                          id={`btn-cancel-revision-${idx + 1}`}
                        >
                          <XCircle className="size-3.5" />
                        </Button>
                      </>
                    )}

                    {!isOpen && !isInProgress && (
                      <span className="text-muted-foreground/60 text-xs italic">
                        {isResolved ? 'Resolved' : 'Cancelled'}
                      </span>
                    )}
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
