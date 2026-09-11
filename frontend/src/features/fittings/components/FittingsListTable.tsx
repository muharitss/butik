import React from 'react';
import { Link } from 'react-router-dom';
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
  ClipboardCheck,
  XCircle,
  Scissors,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { Fitting } from '../types/fittings.types.ts';
import {
  getFittingStatusLabel,
  getFittingBadgeVariant,
  getFittingResultLabel,
  getFittingResultBadgeVariant,
  formatDateTime,
} from '../constants/fittingRules.ts';

interface FittingsListTableProps {
  orderId: string;
  fittings: Fitting[];
  onRecordResultClick: (fitting: Fitting) => void;
  onCancelClick: (fitting: Fitting) => void;
  onCreateRevisionClick?: (fitting: Fitting) => void;
}

export const FittingsListTable: React.FC<FittingsListTableProps> = ({
  orderId,
  fittings,
  onRecordResultClick,
  onCancelClick,
  onCreateRevisionClick,
}) => {
  if (fittings.length === 0) {
    return (
      <div className="py-8 text-center border rounded-lg bg-card/40 border-dashed">
        <Calendar className="size-8 mx-auto text-muted-foreground/60 mb-2" />
        <h4 className="text-sm font-medium text-foreground">No Fitting Appointments</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
          No fittings have been scheduled for this order yet. Schedule a session once garments are prepared.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[120px] text-xs font-semibold">Session</TableHead>
            <TableHead className="w-[110px] text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold">Scheduled Date</TableHead>
            <TableHead className="text-xs font-semibold">Outcome & Date</TableHead>
            <TableHead className="text-xs font-semibold">Notes / Instructions</TableHead>
            <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fittings.map((fitting) => {
            const isScheduled = fitting.status === 'SCHEDULED';
            const isDone = fitting.status === 'DONE';
            const isNeedsRevision = isDone && fitting.result === 'NEEDS_REVISION';
            const isApproved = isDone && fitting.result === 'APPROVED';

            return (
              <TableRow key={fitting.id} className="text-xs">
                {/* Session */}
                <TableCell className="font-semibold text-foreground">
                  Fitting #{fitting.fittingNumber}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={getFittingBadgeVariant(fitting.status)} className="text-[10px]">
                    {getFittingStatusLabel(fitting.status)}
                  </Badge>
                </TableCell>

                {/* Scheduled Date */}
                <TableCell className="text-muted-foreground">
                  {fitting.scheduledAt ? (
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="size-3 text-muted-foreground shrink-0" />
                      <span>{formatDateTime(fitting.scheduledAt)}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/60">Unscheduled</span>
                  )}
                </TableCell>

                {/* Outcome & Occurred Date */}
                <TableCell>
                  {isDone ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={getFittingResultBadgeVariant(fitting.result)}
                          className="text-[10px] flex items-center gap-1"
                        >
                          {isApproved && <CheckCircle2 className="size-2.5" />}
                          {isNeedsRevision && <Scissors className="size-2.5" />}
                          {getFittingResultLabel(fitting.result)}
                        </Badge>
                      </div>
                      {fitting.occurredAt && (
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          Held: {formatDateTime(fitting.occurredAt)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/60 italic text-[11px]">
                      {fitting.status === 'CANCELLED' ? 'Session cancelled' : 'Pending session'}
                    </span>
                  )}
                </TableCell>

                {/* Notes & Next Action */}
                <TableCell className="max-w-xs">
                  {fitting.notes && (
                    <p className="line-clamp-2 text-foreground/90">{fitting.notes}</p>
                  )}
                  {fitting.nextAction && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      <strong>Next:</strong> {fitting.nextAction}
                    </p>
                  )}
                  {!fitting.notes && !fitting.nextAction && (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {isScheduled && (
                      <>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-7 text-xs px-2.5"
                          onClick={() => onRecordResultClick(fitting)}
                          id={`btn-record-result-${fitting.fittingNumber}`}
                        >
                          <ClipboardCheck className="size-3 mr-1" />
                          Record Result
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => onCancelClick(fitting)}
                          title="Cancel Fitting"
                          id={`btn-cancel-fitting-${fitting.fittingNumber}`}
                        >
                          <XCircle className="size-3.5" />
                        </Button>
                      </>
                    )}

                    {isNeedsRevision && (
                      onCreateRevisionClick ? (
                        <button
                          type="button"
                          onClick={() => onCreateRevisionClick(fitting)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                          id={`link-create-revision-${fitting.fittingNumber}`}
                        >
                          Create Revision <ArrowRight className="size-3" />
                        </button>
                      ) : (
                        <Link
                          to={`/revisions?orderId=${orderId}&fittingId=${fitting.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                          id={`link-create-revision-${fitting.fittingNumber}`}
                        >
                          Create Revision <ArrowRight className="size-3" />
                        </Link>
                      )
                    )}

                    {!isScheduled && !isNeedsRevision && (
                      <span className="text-muted-foreground/60 text-[11px]">—</span>
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
