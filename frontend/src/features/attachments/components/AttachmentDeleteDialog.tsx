import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import type { OrderAttachment } from '../types/attachments.types.ts';
import { deleteAttachment } from '../api/attachments.api.ts';
import {
  ATTACHMENT_TYPE_LABELS,
  formatAttachmentDate,
} from '../constants/attachmentRules.ts';

interface AttachmentDeleteDialogProps {
  attachment: OrderAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (deletedId: string) => void;
}

export const AttachmentDeleteDialog: React.FC<AttachmentDeleteDialogProps> = ({
  attachment,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!attachment) return null;

  const typeLabel = ATTACHMENT_TYPE_LABELS[attachment.type] || attachment.type;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAttachment(attachment.orderId, attachment.id);
      onOpenChange(false);
      onSuccess(attachment.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete attachment.';
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !deleting && onOpenChange(val)}>
      <DialogContent className="max-w-md" id="attachment-delete-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-5" />
            <DialogTitle>Delete Attachment</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to remove this attachment from the order?
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="my-2">
            <AlertTriangle className="size-4" />
            <AlertTitle>Action Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Attachment summary card */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 my-2">
          <div className="size-16 rounded overflow-hidden bg-muted shrink-0 border border-border">
            <img
              src={attachment.secureUrl}
              alt={typeLabel}
              className="size-full object-cover"
            />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px] font-semibold">
                {typeLabel}
              </Badge>
              {attachment.format && (
                <span className="text-[10px] uppercase font-mono text-muted-foreground">
                  {attachment.format}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Uploaded on {formatAttachmentDate(attachment.uploadedAt)}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            id="btn-confirm-delete-attachment"
          >
            {deleting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="size-4 mr-1.5" />
                Delete File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
