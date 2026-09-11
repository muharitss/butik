import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  Loader2,
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
import { OrderPlaceholdersSection } from '../components/OrderPlaceholdersSection.tsx';
import { OrderEditMetadataDialog } from '../components/OrderEditMetadataDialog.tsx';
import { OrderEditItemsDialog } from '../components/OrderEditItemsDialog.tsx';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [editMetadataOpen, setEditMetadataOpen] = useState(false);
  const [editItemsOpen, setEditItemsOpen] = useState(false);

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

        <div className="text-right sm:self-center">
          <span className="text-xs text-muted-foreground block">Total Valuation</span>
          <span className="font-mono text-xl font-bold text-foreground">
            {formatCurrency(order.total)}
          </span>
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

          {/* Reserved Future Section Placeholders */}
          <OrderPlaceholdersSection />
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
    </div>
  );
};
