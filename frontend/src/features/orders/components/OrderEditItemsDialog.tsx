import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Loader2, AlertTriangle, Ruler } from 'lucide-react';
import type { Order, OrderItemInput } from '../types/orders.types.ts';
import type { GarmentType } from '../../garments/types/garments.types.ts';
import { fetchGarmentTypes } from '../../garments/api/garments.api.ts';
import { replaceOrderItems } from '../api/orders.api.ts';
import { formatCurrency } from '../constants/orderRules.ts';

interface EditableItemRow {
  garmentTypeId: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

interface OrderEditItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onSuccess: (updated: Order) => void;
}

export const OrderEditItemsDialog: React.FC<OrderEditItemsDialogProps> = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}) => {
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [rows, setRows] = useState<EditableItemRow[]>([]);
  const [loadingGarments, setLoadingGarments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Load active garment types
      setLoadingGarments(true);
      fetchGarmentTypes()
        .then((types) => setGarmentTypes(types.filter((t) => t.isActive)))
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load garment types'))
        .finally(() => setLoadingGarments(false));

      // Populate current items
      if (order.items && order.items.length > 0) {
        setRows(
          order.items.map((item) => ({
            garmentTypeId: item.garmentTypeId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice) || 0,
            notes: item.notes || '',
          }))
        );
      } else {
        setRows([]);
      }
      setError(null);
    }
  }, [open, order]);

  const handleAddRow = () => {
    const firstType = garmentTypes[0]?.id || '';
    setRows((prev) => [
      ...prev,
      { garmentTypeId: firstType, quantity: 1, unitPrice: 0, notes: '' },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = <K extends keyof EditableItemRow>(
    index: number,
    field: K,
    val: EditableItemRow[K]
  ) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
  };

  const calculateSubtotal = () => {
    return rows.reduce((acc, r) => acc + (r.quantity || 0) * (r.unitPrice || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.garmentTypeId) {
        setError(`Item #${i + 1} must have a garment type selected.`);
        setSaving(false);
        return;
      }
      if (r.quantity < 1) {
        setError(`Item #${i + 1} quantity must be at least 1.`);
        setSaving(false);
        return;
      }
      if (r.unitPrice < 0) {
        setError(`Item #${i + 1} unit price cannot be negative.`);
        setSaving(false);
        return;
      }
    }

    try {
      const payload: OrderItemInput[] = rows.map((r) => ({
        garmentTypeId: r.garmentTypeId,
        quantity: Number(r.quantity),
        unitPrice: Number(r.unitPrice),
        notes: r.notes.trim() || null,
      }));

      const updated = await replaceOrderItems(order.id, payload);
      onSuccess(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save order items');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" id="dialog-edit-order-items">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit Order Line Items</DialogTitle>
            <DialogDescription>
              Modify bespoke garments, quantities, and pricing for this draft order.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loadingGarments ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2 text-primary" />
              Loading garment catalogue...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Line Items ({rows.length})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleAddRow}
                  disabled={saving || garmentTypes.length === 0}
                  id="btn-add-item-row"
                >
                  <Plus className="size-3.5 mr-1" />
                  Add Garment
                </Button>
              </div>

              {rows.length === 0 ? (
                <div className="rounded-md border border-dashed border-border py-6 text-center text-muted-foreground text-xs">
                  No line items. Click "Add Garment" to add one.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {rows.map((row, index) => {
                    const selectedGarment = garmentTypes.find((gt) => gt.id === row.garmentTypeId);
                    const requiredFields =
                      selectedGarment?.measurementFields.filter((f) => f.isRequired) || [];

                    return (
                      <div
                        key={index}
                        className="p-3 rounded-md border border-border bg-card space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-muted-foreground">#{index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="size-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveRow(index)}
                            disabled={saving}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-1 space-y-1">
                            <Label className="text-[11px]">Garment Type</Label>
                            <select
                              value={row.garmentTypeId}
                              onChange={(e) =>
                                handleRowChange(index, 'garmentTypeId', e.target.value)
                              }
                              disabled={saving}
                              className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {garmentTypes.map((gt) => (
                                <option key={gt.id} value={gt.id}>
                                  {gt.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px]">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) =>
                                handleRowChange(index, 'quantity', parseInt(e.target.value) || 1)
                              }
                              disabled={saving}
                              className="h-8 text-xs font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px]">Unit Price (Rp)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="5000"
                              value={row.unitPrice}
                              onChange={(e) =>
                                handleRowChange(
                                  index,
                                  'unitPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              disabled={saving}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>

                        {/* Measurement fields context badge */}
                        {requiredFields.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Ruler className="size-2.5" /> Required measurements:
                            </span>
                            {requiredFields.map((f) => (
                              <span
                                key={f.id}
                                className="text-[10px] bg-muted/60 px-1 py-0.2 rounded border border-border/50 text-foreground"
                              >
                                {f.label}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="space-y-1 pt-1">
                          <Input
                            placeholder="Line item notes (e.g. French cuffs, mandarin collar)..."
                            value={row.notes}
                            onChange={(e) => handleRowChange(index, 'notes', e.target.value)}
                            disabled={saving}
                            className="h-7 text-[11px]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border text-xs font-semibold">
                <span>Calculated Subtotal:</span>
                <span className="font-mono text-sm">{formatCurrency(calculateSubtotal())}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || loadingGarments}
              id="btn-save-order-items"
            >
              {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Save Items
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
