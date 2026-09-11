import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoomIn, Trash2, ImageOff, Calendar, FileImage } from 'lucide-react';
import type { OrderAttachment } from '../types/attachments.types.ts';
import {
  ATTACHMENT_TYPE_LABELS,
  formatAttachmentDate,
  formatDimensions,
} from '../constants/attachmentRules.ts';

interface AttachmentCardProps {
  attachment: OrderAttachment;
  canModify: boolean;
  onView: (attachment: OrderAttachment) => void;
  onDelete: (attachment: OrderAttachment) => void;
}

export const AttachmentCard: React.FC<AttachmentCardProps> = ({
  attachment,
  canModify,
  onView,
  onDelete,
}) => {
  const [imageError, setImageError] = useState(false);

  const typeLabel = ATTACHMENT_TYPE_LABELS[attachment.type] || attachment.type;
  const dimensions = formatDimensions(attachment.width, attachment.height);
  const formatText = attachment.format ? attachment.format.toUpperCase() : null;

  return (
    <Card
      className="overflow-hidden border border-border group hover:border-primary/40 transition-colors shadow-xs flex flex-col justify-between"
      id={`attachment-card-${attachment.id}`}
    >
      {/* Thumbnail Area */}
      <div
        className="relative w-full aspect-4/3 bg-muted/60 overflow-hidden cursor-pointer flex items-center justify-center"
        onClick={() => onView(attachment)}
      >
        {imageError ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
            <ImageOff className="size-8 mb-1.5 opacity-60" />
            <span className="text-xs">Preview unavailable</span>
          </div>
        ) : (
          <img
            src={attachment.secureUrl}
            alt={typeLabel}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}

        {/* Hover overlay with quick zoom prompt */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          <div className="flex items-center gap-1 text-xs font-medium bg-black/60 px-2.5 py-1.5 rounded-full backdrop-blur-xs">
            <ZoomIn className="size-3.5" />
            <span>Click to expand</span>
          </div>
        </div>

        {/* Category Badge overlay on top-left */}
        <div className="absolute top-2 left-2 pointer-events-none">
          <Badge
            variant="secondary"
            className="text-[10px] font-semibold bg-background/90 backdrop-blur-xs shadow-xs"
          >
            {typeLabel}
          </Badge>
        </div>

        {/* Format Badge overlay on top-right */}
        {formatText && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <Badge
              variant="outline"
              className="text-[9px] font-mono bg-background/90 backdrop-blur-xs shadow-xs"
            >
              {formatText}
            </Badge>
          </div>
        )}
      </div>

      {/* Card Footer details & actions */}
      <CardContent className="p-3 pt-2.5 space-y-2 border-t border-border bg-card">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatAttachmentDate(attachment.uploadedAt)}
          </span>
          {dimensions && (
            <span className="font-mono text-[10px] truncate max-w-[120px]">
              {dimensions}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onView(attachment)}
          >
            <FileImage className="size-3 mr-1" />
            View Full
          </Button>

          {canModify && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(attachment);
              }}
              aria-label="Delete attachment"
              id={`btn-delete-attachment-${attachment.id}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
