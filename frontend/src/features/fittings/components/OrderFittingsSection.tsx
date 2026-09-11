import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Ruler,
  Plus,
  Scissors,
  ArrowRight,
  Info,
  Check,
  Copy,
  X,
} from 'lucide-react';
import type { Order } from '../../orders/types/orders.types.ts';
import type { Fitting } from '../types/fittings.types.ts';
import { canScheduleFitting } from '../constants/fittingRules.ts';
import { FittingsListTable } from './FittingsListTable.tsx';
import { FittingScheduleDialog } from './FittingScheduleDialog.tsx';
import { FittingRecordResultDialog } from './FittingRecordResultDialog.tsx';
import { FittingCancelDialog } from './FittingCancelDialog.tsx';
import { fetchOrder } from '../../orders/api/orders.api.ts';

interface OrderFittingsSectionProps {
  order: Order;
  onOrderUpdated: (order: Order) => void;
  onOpenCreateRevision?: (fittingId: string) => void;
}

export const OrderFittingsSection: React.FC<OrderFittingsSectionProps> = ({
  order,
  onOrderUpdated,
  onOpenCreateRevision,
}) => {
  const [scheduleOpen, setScheduleOpen] = useState<boolean>(false);
  const [recordResultFitting, setRecordResultFitting] = useState<Fitting | null>(null);
  const [cancelFitting, setCancelFitting] = useState<Fitting | null>(null);

  // Non-blocking revision prompt state
  const [revisionPromptFitting, setRevisionPromptFitting] = useState<Fitting | null>(null);
  const [copiedFittingId, setCopiedFittingId] = useState<boolean>(false);

  const fittings = ((order.fittings || []) as Fitting[]).slice().sort((a, b) => a.fittingNumber - b.fittingNumber);
  const scheduleCheck = canScheduleFitting(order.status);

  // Count metrics
  const scheduledCount = fittings.filter((f) => f.status === 'SCHEDULED').length;
  const completedCount = fittings.filter((f) => f.status === 'DONE').length;

  const refreshOrder = async (optimisticFitting?: Fitting) => {
    try {
      const freshOrder = await fetchOrder(order.id);
      onOrderUpdated(freshOrder);
    } catch {
      if (optimisticFitting) {
        const existingIdx = fittings.findIndex((f) => f.id === optimisticFitting.id);
        const updatedFittings =
          existingIdx >= 0
            ? fittings.map((f, i) => (i === existingIdx ? optimisticFitting : f))
            : [...fittings, optimisticFitting];

        onOrderUpdated({
          ...order,
          fittings: updatedFittings,
        });
      }
    }
  };

  const handleScheduleSuccess = (created: Fitting) => {
    refreshOrder(created);
  };

  const handleRecordResultSuccess = (updated: Fitting) => {
    refreshOrder(updated);
    if (updated.result === 'NEEDS_REVISION') {
      setRevisionPromptFitting(updated);
    }
  };

  const handleCancelSuccess = (updated: Fitting) => {
    refreshOrder(updated);
  };

  const handleCopyFittingId = (fittingId: string) => {
    navigator.clipboard?.writeText(fittingId);
    setCopiedFittingId(true);
    setTimeout(() => setCopiedFittingId(false), 2000);
  };

  return (
    <Card className="border shadow-xs" id="order-fittings-section">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Ruler className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">Fitting Appointments</CardTitle>
            <Badge variant="secondary" className="text-xs font-mono">
              {fittings.length} {fittings.length === 1 ? 'Session' : 'Sessions'}
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Customer trial fittings, silhouette adjustments, and alteration sign-offs.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            size="sm"
            onClick={() => setScheduleOpen(true)}
            disabled={!scheduleCheck.allowed}
            title={scheduleCheck.reason}
            id="btn-open-schedule-fitting"
          >
            <Plus className="size-3.5 mr-1.5" />
            Schedule Fitting
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Metric Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground block">Total Fittings</span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {fittings.length}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground block">Pending Scheduled</span>
            <span className="font-mono text-sm font-semibold text-primary">
              {scheduledCount}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground block">Completed Sessions</span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {completedCount}
            </span>
          </div>
        </div>

        {/* Soft Guidance Banner for DRAFT/CONFIRMED status */}
        {!scheduleCheck.allowed && order.status !== 'CANCELLED' && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
            <Info className="size-4 text-primary shrink-0" />
            <span>{scheduleCheck.reason}</span>
          </div>
        )}

        {/* Non-blocking Prompt for NEEDS_REVISION */}
        {revisionPromptFitting && (
          <Alert className="border-destructive/30 bg-destructive/5 text-foreground py-3 relative" id="prompt-needs-revision">
            <Scissors className="size-4 text-destructive" />
            <div className="flex-1 pr-6">
              <AlertTitle className="text-xs font-semibold text-destructive flex items-center gap-2">
                Fitting #{revisionPromptFitting.fittingNumber} Required Alterations
              </AlertTitle>
              <AlertDescription className="text-xs mt-1 text-muted-foreground space-y-2">
                <p>
                  Fitting outcome was saved as <strong>Needs Revision</strong>. The order status has automatically transitioned to <strong>REVISION</strong>. You can now immediately create a revision ticket with tailor adjustment instructions.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onOpenCreateRevision ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs gap-1 font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md cursor-pointer"
                      onClick={() => {
                        onOpenCreateRevision(revisionPromptFitting.id);
                        setRevisionPromptFitting(null);
                      }}
                      id="btn-prompt-create-revision"
                    >
                      Create Revision Ticket <ArrowRight className="size-3.5" />
                    </Button>
                  ) : (
                    <Link
                      to={`/revisions?orderId=${order.id}&fittingId=${revisionPromptFitting.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md transition-colors"
                      id="btn-prompt-create-revision"
                    >
                      Create Revision Ticket <ArrowRight className="size-3.5" />
                    </Link>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleCopyFittingId(revisionPromptFitting.id)}
                    id="btn-copy-fitting-id"
                  >
                    {copiedFittingId ? (
                      <>
                        <Check className="size-3 text-primary" />
                        Copied ID!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 text-muted-foreground" />
                        Copy Fitting ID
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </div>
            <button
              type="button"
              onClick={() => setRevisionPromptFitting(null)}
              className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground p-1 rounded-sm cursor-pointer"
              title="Dismiss prompt"
              id="btn-dismiss-revision-prompt"
            >
              <X className="size-3.5" />
            </button>
          </Alert>
        )}

        {/* Fittings List Table */}
        <FittingsListTable
          orderId={order.id}
          fittings={fittings}
          onRecordResultClick={(f) => setRecordResultFitting(f)}
          onCancelClick={(f) => setCancelFitting(f)}
          onCreateRevisionClick={onOpenCreateRevision ? (f) => onOpenCreateRevision(f.id) : undefined}
        />

        {/* Schedule Dialog */}
        <FittingScheduleDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          orderId={order.id}
          currentFittingCount={fittings.length}
          orderStatus={order.status}
          onSuccess={handleScheduleSuccess}
        />

        {/* Record Result Dialog */}
        <FittingRecordResultDialog
          open={Boolean(recordResultFitting)}
          onOpenChange={(open) => !open && setRecordResultFitting(null)}
          orderId={order.id}
          fitting={recordResultFitting}
          onSuccess={handleRecordResultSuccess}
        />

        {/* Cancel Fitting Dialog */}
        <FittingCancelDialog
          open={Boolean(cancelFitting)}
          onOpenChange={(open) => !open && setCancelFitting(null)}
          orderId={order.id}
          fitting={cancelFitting}
          onSuccess={handleCancelSuccess}
        />
      </CardContent>
    </Card>
  );
};
