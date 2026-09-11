import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Paperclip,
  Plus,
  FolderOpen,
  Image as ImageIcon,
} from 'lucide-react';
import type { Order } from '../../orders/types/orders.types.ts';
import type {
  AttachmentType,
  OrderAttachment,
} from '../types/attachments.types.ts';
import {
  ATTACHMENT_TYPES,
  ATTACHMENT_TYPE_LABELS,
  canModifyAttachments,
  groupAttachmentsByType,
} from '../constants/attachmentRules.ts';
import { AttachmentCard } from './AttachmentCard.tsx';
import { AttachmentUploadDialog } from './AttachmentUploadDialog.tsx';
import { AttachmentDeleteDialog } from './AttachmentDeleteDialog.tsx';
import { AttachmentLightboxDialog } from './AttachmentLightboxDialog.tsx';
import { fetchOrder } from '../../orders/api/orders.api.ts';

interface OrderAttachmentsSectionProps {
  order: Order;
  onOrderUpdated: (order: Order) => void;
}

type FilterTab = 'ALL' | AttachmentType;

export const OrderAttachmentsSection: React.FC<OrderAttachmentsSectionProps> = ({
  order,
  onOrderUpdated,
}) => {
  const [selectedTab, setSelectedTab] = useState<FilterTab>('ALL');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightboxAttachment, setLightboxAttachment] = useState<OrderAttachment | null>(null);
  const [deleteAttachment, setDeleteAttachment] = useState<OrderAttachment | null>(null);

  const canModify = canModifyAttachments(order.status);
  const attachments = (order.attachments || []) as OrderAttachment[];

  const grouped = useMemo(() => {
    return groupAttachmentsByType(attachments);
  }, [attachments]);

  const filteredAttachments = useMemo(() => {
    if (selectedTab === 'ALL') {
      return attachments;
    }
    return grouped[selectedTab] || [];
  }, [selectedTab, attachments, grouped]);

  const refreshOrder = async () => {
    try {
      const freshOrder = await fetchOrder(order.id);
      onOrderUpdated(freshOrder);
    } catch {
      // Fallback: order state remains as-is
    }
  };

  const handleUploadSuccess = (newAttachment: OrderAttachment) => {
    const updatedList = [...attachments, newAttachment];
    onOrderUpdated({
      ...order,
      attachments: updatedList,
    });
    // Also trigger async fresh fetch in background
    refreshOrder();
  };

  const handleDeleteSuccess = (deletedId: string) => {
    const updatedList = attachments.filter((a) => a.id !== deletedId);
    onOrderUpdated({
      ...order,
      attachments: updatedList,
    });
    refreshOrder();
  };

  return (
    <Card className="border shadow-xs bg-card" id="order-attachments-section">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Paperclip className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                Design Sketches & Photos
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-mono">
                {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Customer reference photos, fabric swatches, sketches, and fitting results.
            </CardDescription>
          </div>

          {canModify && (
            <Button
              type="button"
              size="sm"
              className="text-xs shrink-0 self-start sm:self-center"
              onClick={() => setUploadOpen(true)}
              id="btn-open-attachment-upload"
            >
              <Plus className="size-3.5 mr-1.5" />
              Upload Photo
            </Button>
          )}
        </div>

        {/* Filter Tabs by Category */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5" id="attachment-filter-tabs">
          <Button
            type="button"
            size="sm"
            variant={selectedTab === 'ALL' ? 'default' : 'outline'}
            className="h-7 text-xs px-2.5"
            onClick={() => setSelectedTab('ALL')}
            id="tab-attachments-all"
          >
            All ({attachments.length})
          </Button>

          {ATTACHMENT_TYPES.map((type) => {
            const count = grouped[type]?.length || 0;
            return (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={selectedTab === type ? 'default' : 'outline'}
                className="h-7 text-xs px-2.5"
                onClick={() => setSelectedTab(type)}
                id={`tab-attachments-${type.toLowerCase()}`}
              >
                {ATTACHMENT_TYPE_LABELS[type]} ({count})
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {attachments.length === 0 ? (
          /* Empty State: Zero Attachments */
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed rounded-lg bg-muted/20 border-border">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <ImageIcon className="size-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              No Attachments Added Yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mb-4">
              Add client style inspiration photos, fabric swatches, or bespoke design sketches to keep all tailoring assets in one place.
            </p>
            {canModify && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setUploadOpen(true)}
              >
                <Plus className="size-3.5 mr-1.5" />
                Upload First Photo
              </Button>
            )}
          </div>
        ) : filteredAttachments.length === 0 ? (
          /* Empty State: Zero in selected category tab */
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <FolderOpen className="size-8 mb-2 opacity-50" />
            <p className="text-xs font-medium">No attachments in this category.</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Select another tab or upload photos under this category.
            </p>
          </div>
        ) : (
          /* Gallery Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="attachments-gallery-grid">
            {filteredAttachments.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                canModify={canModify}
                onView={(att) => setLightboxAttachment(att)}
                onDelete={(att) => setDeleteAttachment(att)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <AttachmentUploadDialog
        orderId={order.id}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultType={selectedTab !== 'ALL' ? selectedTab : 'CUSTOMER_REFERENCE'}
        onSuccess={handleUploadSuccess}
      />

      {/* Lightbox Dialog */}
      <AttachmentLightboxDialog
        attachment={lightboxAttachment}
        open={Boolean(lightboxAttachment)}
        onOpenChange={(open) => !open && setLightboxAttachment(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AttachmentDeleteDialog
        attachment={deleteAttachment}
        open={Boolean(deleteAttachment)}
        onOpenChange={(open) => !open && setDeleteAttachment(null)}
        onSuccess={handleDeleteSuccess}
      />
    </Card>
  );
};
