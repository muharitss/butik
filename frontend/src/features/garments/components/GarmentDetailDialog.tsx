import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Pencil,
  CheckCircle2,
  XCircle,
  Scissors,
  Calendar,
  Clock,
  Ruler,
  AlertCircle,
} from 'lucide-react';
import type { GarmentType } from '../types/garments.types.ts';

interface GarmentDetailDialogProps {
  garment: GarmentType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (garment: GarmentType) => void;
  onDeactivate: (garment: GarmentType) => void;
  onReactivate: (garment: GarmentType) => void;
  actionLoading?: boolean;
  canManage?: boolean;
}

const formatDate = (isoString?: string | null) => {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

export const GarmentDetailDialog: React.FC<GarmentDetailDialogProps> = ({
  garment,
  open,
  onOpenChange,
  onEdit,
  onDeactivate,
  onReactivate,
  actionLoading = false,
  canManage = false,
}) => {
  if (!garment) return null;

  const fields = garment.measurementFields || [];
  const requiredCount = fields.filter((f) => f.isRequired).length;
  const optionalCount = fields.length - requiredCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border bg-card/60">
          <DialogHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Scissors className="size-5" />
                </div>
                <div>
                  <DialogTitle className="font-heading text-xl font-semibold text-foreground tracking-tight">
                    {garment.name}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reference ID: <span className="font-mono">{garment.id}</span>
                  </p>
                </div>
              </div>

              <div>
                {garment.isActive ? (
                  <Badge variant="default" className="text-xs px-2.5 py-0.5">
                    <CheckCircle2 className="size-3.5 mr-1" /> Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs px-2.5 py-0.5 text-muted-foreground">
                    <XCircle className="size-3.5 mr-1" /> Inactive
                  </Badge>
                )}
              </div>
            </div>

            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {garment.description || (
                <span className="italic text-muted-foreground/60">
                  No additional description provided for this garment type.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-foreground">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Ruler className="size-3.5" />
                <span>Total Specifications</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {fields.length} {fields.length === 1 ? 'Field' : 'Fields'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {requiredCount} Required, {optionalCount} Optional
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                <span>Created At</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatDate(garment.createdAt)}
              </p>
              <p className="text-[11px] text-muted-foreground">Initial record created</p>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                <span>Last Updated</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatDate(garment.updatedAt)}
              </p>
              <p className="text-[11px] text-muted-foreground">Configuration history</p>
            </div>
          </div>

          {/* Measurement Fields Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-sm text-foreground">
                  Body Measurement Fields
                </h3>
                <p className="text-xs text-muted-foreground">
                  Measurement fields required or optional for tailors when creating an order for this garment.
                </p>
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                {fields.length} {fields.length === 1 ? 'parameter' : 'parameters'}
              </Badge>
            </div>

            {fields.length === 0 ? (
              <div className="p-6 text-center border border-dashed rounded-lg bg-card/40 space-y-2">
                <AlertCircle className="size-6 text-muted-foreground/60 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  This garment type has no measurement fields configured yet.
                </p>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs mt-2"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit(garment);
                    }}
                  >
                    <Pencil className="size-3.5 mr-1" />
                    Configure Measurement Fields
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[10%] text-xs font-semibold">#</TableHead>
                      <TableHead className="w-[35%] text-xs font-semibold">Field Label</TableHead>
                      <TableHead className="w-[25%] text-xs font-semibold">System Key</TableHead>
                      <TableHead className="w-[15%] text-xs font-semibold">Unit</TableHead>
                      <TableHead className="w-[15%] text-right text-xs font-semibold">Requirement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id || field.fieldKey} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {field.sortOrder != null ? field.sortOrder + 1 : index + 1}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">
                          {field.label}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {field.fieldKey}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {field.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {field.isRequired ? (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              Optional
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-card/60 flex-row justify-between items-center gap-2 sm:justify-between">
          <div>
            {canManage && (
              garment.isActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onOpenChange(false);
                    onDeactivate(garment);
                  }}
                  disabled={actionLoading}
                >
                  Deactivate Garment
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    onReactivate(garment);
                  }}
                  disabled={actionLoading}
                >
                  Reactivate
                </Button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {canManage && (
              <Button
                type="button"
                size="sm"
                className="text-xs"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(garment);
                }}
              >
                <Pencil className="size-3.5 mr-1" />
                Edit Garment Type
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
