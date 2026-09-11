import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ExternalLink, Calendar, Maximize2 } from 'lucide-react';
import type { OrderAttachment } from '../types/attachments.types.ts';
import {
  ATTACHMENT_TYPE_LABELS,
  formatAttachmentDate,
  formatDimensions,
} from '../constants/attachmentRules.ts';

interface AttachmentLightboxDialogProps {
  attachment: OrderAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AttachmentLightboxDialog: React.FC<AttachmentLightboxDialogProps> = ({
  attachment,
  open,
  onOpenChange,
}) => {
  if (!attachment) return null;

  const typeLabel = ATTACHMENT_TYPE_LABELS[attachment.type] || attachment.type;
  const dimensions = formatDimensions(attachment.width, attachment.height);
  const formatLabel = attachment.format ? attachment.format.toUpperCase() : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-4 sm:p-6" id="attachment-lightbox-dialog">
        <DialogHeader className="pb-2 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-semibold">
                {typeLabel}
              </Badge>
              {formatLabel && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  {formatLabel}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {dimensions && (
                <span className="flex items-center gap-1 font-mono">
                  <Maximize2 className="size-3" />
                  {dimensions}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {formatAttachmentDate(attachment.uploadedAt)}
              </span>
              <a
                href={attachment.secureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'h-7 px-2 text-xs text-primary hover:text-primary/80 inline-flex items-center',
                })}
              >
                <ExternalLink className="size-3 mr-1" />
                Open Original
              </a>
            </div>
          </div>
          <DialogTitle className="sr-only">
            {typeLabel} Preview
          </DialogTitle>
        </DialogHeader>

        {/* Image Container */}
        <div className="relative flex items-center justify-center min-h-[300px] max-h-[70vh] bg-muted/40 rounded-md overflow-hidden p-2">
          <img
            src={attachment.secureUrl}
            alt={typeLabel}
            className="max-h-[65vh] max-w-full object-contain rounded select-none shadow-xs"
            loading="lazy"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
