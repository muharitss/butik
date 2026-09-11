import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  Loader2,
  Receipt,
  MessageSquare,
} from 'lucide-react';
import type { Order } from '../types/orders.types.ts';
import { fetchOrder } from '../api/orders.api.ts';
import { formatDate, formatCurrency } from '../constants/orderRules.ts';
import { OrderStatusBadge } from '../components/OrderStatusBadge.tsx';
import { OrderTransitionControl } from '../components/OrderTransitionControl.tsx';
import { OrderItemsTable } from '../components/OrderItemsTable.tsx';
import { OrderPricingSummaryCard } from '../components/OrderPricingSummaryCard.tsx';
import { OrderSnapshotSection } from '../components/OrderSnapshotSection.tsx';
import { OrderHistoryTimeline } from '../components/OrderHistoryTimeline.tsx';
import { OrderAttachmentsSection } from '../../attachments/index.ts';
import { OrderPaymentsSection } from '../../payments/components/OrderPaymentsSection.tsx';
import { OrderFittingsSection } from '../../fittings/index.ts';
import { OrderRevisionsSection } from '../../revisions/index.ts';
import { OrderEditMetadataDialog } from '../components/OrderEditMetadataDialog.tsx';
import { OrderEditItemsDialog } from '../components/OrderEditItemsDialog.tsx';
import { OrderWhatsAppDialog } from '../components/OrderWhatsAppDialog.tsx';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [editMetadataOpen, setEditMetadataOpen] = useState(false);
  const [editItemsOpen, setEditItemsOpen] = useState(false);
  const [createRevisionOpen, setCreateRevisionOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [prefillFittingId, setPrefillFittingId] = useState<string | null>(null);

  // Detect URL trigger for revision creation (e.g. ?action=create-revision&fittingId=...)
  useEffect(() => {
    const action =
      searchParams.get('action') ||
      (searchParams.get('createRevision') === 'true' ? 'create-revision' : null);
    if (action === 'create-revision') {
      const fittingId = searchParams.get('fittingId');
      if (fittingId) {
        setPrefillFittingId(fittingId);
      }
      setCreateRevisionOpen(true);
    }
  }, [searchParams]);

  const handleOpenCreateRevision = (fittingId?: string) => {
    if (fittingId) {
      setPrefillFittingId(fittingId);
    }
    setCreateRevisionOpen(true);
  };

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);
    fetchOrder(id)
      .then((data) => setOrder(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load order details'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="size-8 animate-spin mb-3 text-primary" />
        <span className="text-sm">Loading order file...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4 max-w-xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Order Not Found</AlertTitle>
          <AlertDescription>
            {error || 'The requested order does not exist or has been removed.'}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link to="/orders" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="size-3.5 mr-1.5" /> Return to Orders List
          </Link>
        </div>
      </div>
    );
  }

  const customerName = order.customer?.name || 'Unknown Client';
  const isDraft = order.status === 'DRAFT';
  const isModifiable = isDraft || order.status === 'CONFIRMED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="order-detail-page">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <Link
            to="/orders"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="size-3.5 mr-1" /> Back to Orders
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
              {order.orderNumber}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
            <div className="flex items-center gap-1">
              <User className="size-3.5" />
              <span>Client:</span>
              <Link
                to={`/customers/${order.customerId}`}
                className="font-medium text-foreground hover:underline"
              >
                {customerName}
              </Link>
            </div>

            <div className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              <span>Ordered: {formatDate(order.orderDate)}</span>
            </div>

            <div className="flex items-center gap-1">
              <Clock className="size-3.5" />
              <span>Deadline: <strong>{formatDate(order.deadlineAt)}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex flex-row sm:flex-col items-end gap-2.5 sm:self-center">
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Total Valuation</span>
            <span className="font-mono text-xl font-bold text-foreground">
              {formatCurrency(order.total)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setWhatsappOpen(true)}
              id="btn-open-whatsapp-dialog"
              title="Kirim pesan WhatsApp ke pelanggan"
            >
              <MessageSquare className="size-3.5 mr-1.5 text-emerald-600" />
              WhatsApp
            </Button>
            <Link
              to={`/orders/${order.id}/receipt`}
              className={buttonVariants({ variant: 'outline', size: 'xs' })}
              id="btn-print-order-receipt"
            >
              <Receipt className="size-3.5 mr-1.5 text-primary" />
              Cetak Nota
            </Link>
          </div>
        </div>
      </div>

      {/* Prominent Status Workflow Transition Action Bar */}
      <OrderTransitionControl order={order} onTransitionSuccess={(updated) => setOrder(updated)} />

      {/* Order Main Content: 2-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Items & Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table */}
          <OrderItemsTable
            items={order.items || []}
            canEdit={isDraft}
            onEditClick={() => setEditItemsOpen(true)}
          />

          {/* Active Measurement Snapshot Section */}
          <OrderSnapshotSection
            order={order}
            onResnapshotSuccess={(updated) => setOrder(updated)}
          />

          {/* Payment Transactions Section */}
          <OrderPaymentsSection
            order={order}
            onOrderUpdated={(updated) => setOrder(updated)}
          />

          {/* Fitting Appointments Section */}
          <OrderFittingsSection
            order={order}
            onOrderUpdated={(updated) => setOrder(updated)}
            onOpenCreateRevision={handleOpenCreateRevision}
          />

          {/* Garment Revisions & Alterations Section */}
          <OrderRevisionsSection
            order={order}
            onOrderUpdated={(updated) => setOrder(updated)}
            externalCreateOpen={createRevisionOpen}
            onCloseExternalCreate={() => {
              setCreateRevisionOpen(false);
              setPrefillFittingId(null);
            }}
            prefillFittingId={prefillFittingId}
          />

          {/* Order Design Attachments & Photo Gallery Section */}
          <OrderAttachmentsSection
            order={order}
            onOrderUpdated={(updated) => setOrder(updated)}
          />
        </div>

        {/* Right 1 Column: Pricing Summary & Audit Timeline */}
        <div className="space-y-6">
          {/* Pricing & Settlement Breakdown */}
          <OrderPricingSummaryCard
            order={order}
            canEdit={isModifiable}
            onEditClick={() => setEditMetadataOpen(true)}
          />

          {/* Status Audit Trail Timeline */}
          <OrderHistoryTimeline statusHistories={order.statusHistories} />
        </div>
      </div>

      {/* Edit Metadata Dialog */}
      <OrderEditMetadataDialog
        open={editMetadataOpen}
        onOpenChange={setEditMetadataOpen}
        order={order}
        onSuccess={(updated) => setOrder(updated)}
      />

      {/* Edit Items Dialog (Draft only) */}
      <OrderEditItemsDialog
        open={editItemsOpen}
        onOpenChange={setEditItemsOpen}
        order={order}
        onSuccess={(updated) => setOrder(updated)}
      />

      {/* WhatsApp Action Dialog */}
      <OrderWhatsAppDialog
        open={whatsappOpen}
        onOpenChange={setWhatsappOpen}
        order={order}
      />
    </div>
  );
};
