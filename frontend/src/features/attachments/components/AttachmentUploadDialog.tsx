import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  UploadCloud,
  Camera,
  FolderOpen,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { AttachmentType, OrderAttachment } from '../types/attachments.types.ts';
import {
  ATTACHMENT_TYPES,
  ATTACHMENT_TYPE_LABELS,
  ATTACHMENT_TYPE_DESCRIPTIONS,
  validateAttachmentFile,
  formatFileSize,
} from '../constants/attachmentRules.ts';
import { uploadAttachmentFlow } from '../api/attachments.api.ts';

interface AttachmentUploadDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: AttachmentType;
  onSuccess: (newAttachment: OrderAttachment) => void;
}

export const AttachmentUploadDialog: React.FC<AttachmentUploadDialogProps> = ({
  orderId,
  open,
  onOpenChange,
  defaultType = 'CUSTOMER_REFERENCE',
  onSuccess,
}) => {
  const [selectedType, setSelectedType] = useState<AttachmentType>(defaultType);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Uploading state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'IDLE' | 'SIGNING' | 'UPLOADING' | 'FINALIZING' | 'SUCCESS'>('IDLE');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
    setProgress(0);
    setUploadPhase('IDLE');
    setUploading(false);
  };

  const handleFileSelect = (candidateFile: File | null | undefined) => {
    setError(null);
    if (!candidateFile) return;

    const validation = validateAttachmentFile(candidateFile);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(candidateFile);
    setPreviewUrl(URL.createObjectURL(candidateFile));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!uploading) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or capture a photo first.');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(5);
    setUploadPhase('SIGNING');

    try {
      // Step 1: Getting signature -> handled by uploadAttachmentFlow
      // Step 2: Uploading directly to Cloudinary with progress
      // Step 3: Registering metadata
      const created = await uploadAttachmentFlow(
        orderId,
        selectedType,
        file,
        (percent) => {
          setUploadPhase('UPLOADING');
          // Scale progress nicely between 10% and 90%
          const scaled = Math.min(95, Math.max(10, percent));
          setProgress(scaled);
          if (scaled >= 90) {
            setUploadPhase('FINALIZING');
          }
        }
      );

      setProgress(100);
      setUploadPhase('SUCCESS');

      setTimeout(() => {
        resetForm();
        onOpenChange(false);
        onSuccess(created);
      }, 400);
    } catch (err: unknown) {
      // Per DECISIONS.md#D-006: Cloudinary failure means metadata is NEVER registered
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(message);
      setUploadPhase('IDLE');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!uploading) {
          if (!val) resetForm();
          onOpenChange(val);
        }
      }}
    >
      <DialogContent className="max-w-md sm:max-w-lg" id="attachment-upload-dialog">
        <form onSubmit={handleStartUpload}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="size-5 text-primary" />
              Upload Order Attachment
            </DialogTitle>
            <DialogDescription>
              Add customer references, fabric swatches, sketches, or finished results.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="my-3">
              <AlertTriangle className="size-4" />
              <AlertTitle>Upload Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-2">
            {/* Attachment Type Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="attachment-type-select" className="text-xs font-semibold">
                Attachment Category <span className="text-destructive">*</span>
              </Label>
              <select
                id="attachment-type-select"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as AttachmentType)}
                disabled={uploading}
              >
                {ATTACHMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ATTACHMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <Info className="size-3 shrink-0" />
                {ATTACHMENT_TYPE_DESCRIPTIONS[selectedType]}
              </p>
            </div>

            {/* Hidden file inputs: regular picker & mobile camera capture */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            {/* File Selection Zone or Preview */}
            {!file ? (
              <div
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 bg-muted/20'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <UploadCloud className="size-9 text-muted-foreground mb-2" />
                <p className="text-xs font-medium text-foreground mb-1">
                  Drag and drop photo here, or use buttons below
                </p>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Supports JPG, PNG, WebP up to 10 MB
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading}
                    id="btn-trigger-camera"
                  >
                    <Camera className="size-3.5 mr-1.5" />
                    Take Photo
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    id="btn-trigger-file-picker"
                  >
                    <FolderOpen className="size-3.5 mr-1.5" />
                    Browse Files
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border p-3 space-y-3 bg-card">
                <div className="flex items-start gap-3">
                  <div className="size-16 rounded overflow-hidden bg-muted shrink-0 border border-border flex items-center justify-center">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="size-full object-cover"
                      />
                    ) : (
                      <UploadCloud className="size-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {formatFileSize(file.size)} • {file.type || 'image'}
                    </p>
                  </div>

                  {!uploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={resetForm}
                      aria-label="Remove selected file"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>

                {/* Progress bar during upload */}
                {uploading && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin text-primary" />
                        {uploadPhase === 'SIGNING' && 'Authorizing upload with server...'}
                        {uploadPhase === 'UPLOADING' && `Uploading directly to Cloudinary (${progress}%)...`}
                        {uploadPhase === 'FINALIZING' && 'Saving attachment details in order...'}
                        {uploadPhase === 'SUCCESS' && 'Upload completed!'}
                      </span>
                      <span className="font-mono text-foreground font-medium">
                        {progress}%
                      </span>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={!file || uploading}
              id="btn-submit-attachment-upload"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Uploading...
                </>
              ) : uploadPhase === 'SUCCESS' ? (
                <>
                  <CheckCircle2 className="size-4 mr-1.5 text-primary-foreground" />
                  Done
                </>
              ) : (
                <>
                  <UploadCloud className="size-4 mr-1.5" />
                  Upload Photo
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
