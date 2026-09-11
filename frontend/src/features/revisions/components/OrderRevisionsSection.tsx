import React, { useState } from 'react';
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
  Scissors,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { Order } from '../../orders/types/orders.types.ts';
import type { Revision } from '../types/revisions.types.ts';
import type { Fitting } from '../../fittings/types/fittings.types.ts';
import {
  canCreateRevision,
  countOpenRevisions,
  hasOpenRevisions,
} from '../constants/revisionRules.ts';
import { RevisionsListTable } from './RevisionsListTable.tsx';
import { RevisionCreateDialog } from './RevisionCreateDialog.tsx';
import {
  RevisionStatusDialog,
  type RevisionActionType,
} from './RevisionStatusDialog.tsx';
import { fetchOrder } from '../../orders/api/orders.api.ts';

interface OrderRevisionsSectionProps {
  order: Order;
  onOrderUpdated: (order: Order) => void;
  externalCreateOpen?: boolean;
  onCloseExternalCreate?: () => void;
  prefillFittingId?: string | null;
}

export const OrderRevisionsSection: React.FC<OrderRevisionsSectionProps> = ({
  order,
  onOrderUpdated,
  externalCreateOpen = false,
  onCloseExternalCreate,
  prefillFittingId,
}) => {
  const [internalCreateOpen, setInternalCreateOpen] = useState<boolean>(false);
  const [statusDialogRevision, setStatusDialogRevision] = useState<Revision | null>(null);
  const [statusDialogAction, setStatusDialogAction] = useState<RevisionActionType | null>(null);

  const revisions = ((order.revisions || []) as Revision[]).slice();
  const fittings = ((order.fittings || []) as Fitting[]).slice();

  const openCount = countOpenRevisions(revisions);
  const resolvedCount = revisions.filter((r) => r.status === 'RESOLVED').length;
  const isCreationAllowed = canCreateRevision(order.status);
  const isOpenRevisionsBlocking = hasOpenRevisions(revisions);

  const isCreateOpen = externalCreateOpen || internalCreateOpen;
  const handleCreateOpenChange = (open: boolean) => {
    if (!open) {
      setInternalCreateOpen(false);
      onCloseExternalCreate?.();
    } else {
      setInternalCreateOpen(true);
    }
  };

  const refreshOrder = async () => {
    try {
      const fresh = await fetchOrder(order.id);
      onOrderUpdated(fresh);
    } catch {
      // Fallback: order state remains unchanged if network fails
    }
  };

  const handleCreateSuccess = () => {
    refreshOrder();
  };

  const handleStatusActionClick = (revision: Revision, action: RevisionActionType) => {
    setStatusDialogRevision(revision);
    setStatusDialogAction(action);
  };

  const handleStatusSuccess = () => {
    refreshOrder();
  };

  return (
    <Card className="border shadow-xs" id="order-revisions-section">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Scissors className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">Garment Revisions & Alterations</CardTitle>
            <Badge variant="secondary" className="text-xs font-mono">
              {revisions.length} {revisions.length === 1 ? 'Revision' : 'Revisions'}
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Track fit issues, tailor alteration tasks, and resolution sign-offs.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            size="sm"
            onClick={() => setInternalCreateOpen(true)}
            disabled={!isCreationAllowed.allowed}
            title={isCreationAllowed.reason}
            id="btn-open-create-revision"
          >
            <Plus className="size-3.5 mr-1.5" />
            Log Revision
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Metric Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground block">Total Revisions</span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {revisions.length}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground block">Open / In Progress</span>
            <span
              className={`font-mono text-sm font-semibold ${
                openCount > 0 ? 'text-destructive' : 'text-foreground'
              }`}
              id="metric-open-revisions-count"
            >
              {openCount}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground block">Resolved Alterations</span>
            <span className="font-mono text-sm font-semibold text-primary">
              {resolvedCount}
            </span>
          </div>
        </div>

        {/* Blocking Alert: Open revisions prevent returning to FITTING or reaching READY */}
        {isOpenRevisionsBlocking && (
          <Alert variant="destructive" className="py-3 bg-destructive/5 border-destructive/30" id="alert-open-revisions-blocking">
            <AlertTriangle className="size-4 text-destructive shrink-0" />
            <div className="flex-1">
              <AlertTitle className="text-xs font-semibold text-destructive">
                {openCount} Open Revision{openCount > 1 ? 's' : ''} Pending Resolution
              </AlertTitle>
              <AlertDescription className="text-xs mt-1 text-muted-foreground">
                Garment alterations are currently pending. Per boutique workflow rules, scheduling another trial fitting or advancing the order to <strong>READY</strong> is blocked until all revisions are marked as resolved or cancelled.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Success Guidance Banner: All revisions resolved when order is in REVISION status */}
        {!isOpenRevisionsBlocking && revisions.length > 0 && order.status === 'REVISION' && (
          <Alert className="py-3 bg-primary/5 border-primary/30" id="alert-all-revisions-resolved">
            <CheckCircle2 className="size-4 text-primary shrink-0" />
            <div className="flex-1">
              <AlertTitle className="text-xs font-semibold text-foreground">
                All Revisions Resolved
              </AlertTitle>
              <AlertDescription className="text-xs mt-1 text-muted-foreground">
                All alteration tickets have been completed! You can now schedule a new fitting appointment to verify fit with the customer.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Terminal Order Warning */}
        {!isCreationAllowed.allowed && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
            <Info className="size-4 text-muted-foreground shrink-0" />
            <span>{isCreationAllowed.reason}</span>
          </div>
        )}

        {/* Revisions List Table */}
        <RevisionsListTable
          revisions={revisions}
          fittings={fittings}
          onActionClick={handleStatusActionClick}
        />

        {/* Create Dialog */}
        <RevisionCreateDialog
          open={isCreateOpen}
          onOpenChange={handleCreateOpenChange}
          orderId={order.id}
          fittings={fittings}
          defaultFittingId={prefillFittingId}
          onSuccess={handleCreateSuccess}
        />

        {/* Status Action Dialog */}
        <RevisionStatusDialog
          open={Boolean(statusDialogRevision && statusDialogAction)}
          onOpenChange={(open) => {
            if (!open) {
              setStatusDialogRevision(null);
              setStatusDialogAction(null);
            }
          }}
          orderId={order.id}
          revision={statusDialogRevision}
          actionType={statusDialogAction}
          onSuccess={handleStatusSuccess}
        />
      </CardContent>
    </Card>
  );
};
