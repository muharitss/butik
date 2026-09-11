import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shirt, Ruler, Pencil } from 'lucide-react';
import type { OrderItem } from '../types/orders.types.ts';
import { formatCurrency } from '../constants/orderRules.ts';

interface OrderItemsTableProps {
  items: OrderItem[];
  canEdit?: boolean;
  onEditClick?: () => void;
}

export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
  items,
  canEdit = false,
  onEditClick,
}) => {
  return (
    <Card className="border shadow-xs" id="order-items-section">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Shirt className="size-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Order Items</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Custom bespoke garments ordered, quantities, and pricing.
          </CardDescription>
        </div>

        {canEdit && onEditClick && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEditClick}
            id="btn-edit-order-items"
          >
            <Pencil className="size-3.5 mr-1.5" />
            Edit Items
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border py-8 text-center text-muted-foreground">
            <p className="text-sm">No items added to this draft order yet.</p>
            <p className="mt-1 text-xs">
              Add at least one garment line item before confirming the order.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table id="table-order-items">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">#</TableHead>
                  <TableHead className="text-xs">Garment Type</TableHead>
                  <TableHead className="w-24 text-center text-xs">Qty</TableHead>
                  <TableHead className="w-32 text-right text-xs">Unit Price</TableHead>
                  <TableHead className="w-36 text-right text-xs">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const garmentName = item.garmentType?.name || 'Garment';
                  const fields = item.garmentType?.measurementFields || [];
                  const requiredFields = fields.filter((f) => f.isRequired);

                  return (
                    <TableRow key={item.id || index}>
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-xs text-foreground">{garmentName}</p>
                          {item.notes && (
                            <p className="text-[11px] text-muted-foreground italic">
                              "{item.notes}"
                            </p>
                          )}

                          {/* Informational context: Garment required measurement fields */}
                          {requiredFields.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Ruler className="size-2.5" /> Required measurements:
                              </span>
                              {requiredFields.map((rf) => (
                                <Badge
                                  key={rf.id || rf.fieldKey}
                                  variant="outline"
                                  className="text-[10px] py-0 px-1 font-mono"
                                >
                                  {rf.label} ({rf.unit})
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
