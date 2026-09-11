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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { Order } from '../types/orders.types.ts';
import { updateOrder } from '../api/orders.api.ts';

interface OrderEditMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onSuccess: (updated: Order) => void;
}

export const OrderEditMetadataDialog: React.FC<OrderEditMetadataDialogProps> = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}) => {
  const [deadlineAt, setDeadlineAt] = useState('');
  const [requiresFitting, setRequiresFitting] = useState(true);
  const [additionalCost, setAdditionalCost] = useState(0);
  const [expressFee, setExpressFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      if (order.deadlineAt) {
        const d = new Date(order.deadlineAt);
        const pad = (n: number) => String(n).padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`;
        setDeadlineAt(formatted);
      }
      setRequiresFitting(order.requiresFitting ?? true);
      setAdditionalCost(Number(order.additionalCost) || 0);
      setExpressFee(Number(order.expressFee) || 0);
      setDiscount(Number(order.discount) || 0);
      setNotes(order.notes || '');
      setError(null);
    }
  }, [order, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOrder(order.id, {
        deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : undefined,
        requiresFitting,
        additionalCost: Number(additionalCost) || 0,
        expressFee: Number(expressFee) || 0,
        discount: Number(discount) || 0,
        notes: notes.trim() || null,
      });
      onSuccess(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="dialog-edit-order-metadata">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit Order Details & Pricing</DialogTitle>
            <DialogDescription>
              Update delivery deadline, fitting requirement, and price adjustments.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="edit-deadline-input" className="text-xs font-medium">
                Delivery Deadline <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-deadline-input"
                type="datetime-local"
                value={deadlineAt}
                onChange={(e) => setDeadlineAt(e.target.value)}
                required
                disabled={saving}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="edit-requires-fitting"
                type="checkbox"
                checked={requiresFitting}
                onChange={(e) => setRequiresFitting(e.target.checked)}
                disabled={saving}
                className="size-4 rounded border-input"
              />
              <Label htmlFor="edit-requires-fitting" className="text-xs font-medium cursor-pointer">
                Requires client fitting trial before completion
              </Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="space-y-1">
                <Label htmlFor="edit-additional-cost" className="text-xs font-medium">
                  Additional Cost (Rp)
                </Label>
                <Input
                  id="edit-additional-cost"
                  type="number"
                  min="0"
                  step="1000"
                  value={additionalCost}
                  onChange={(e) => setAdditionalCost(Number(e.target.value) || 0)}
                  disabled={saving}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-express-fee" className="text-xs font-medium">
                  Express Fee (Rp)
                </Label>
                <Input
                  id="edit-express-fee"
                  type="number"
                  min="0"
                  step="1000"
                  value={expressFee}
                  onChange={(e) => setExpressFee(Number(e.target.value) || 0)}
                  disabled={saving}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-discount" className="text-xs font-medium">
                  Discount (Rp)
                </Label>
                <Input
                  id="edit-discount"
                  type="number"
                  min="0"
                  step="1000"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  disabled={saving}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label htmlFor="edit-notes-input" className="text-xs font-medium">
                Internal Order Notes (Optional)
              </Label>
              <Textarea
                id="edit-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special tailor notes, fabric preferences..."
                disabled={saving}
                className="text-xs"
              />
            </div>
          </div>

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
            <Button type="submit" size="sm" disabled={saving} id="btn-save-order-edit">
              {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
