import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  Search,
  User,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  AlertTriangle,
  Loader2,
  Ruler,
  CheckCircle2,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { Customer } from '../../customers/types/customers.types.ts';
import type { GarmentType } from '../../garments/types/garments.types.ts';
import type { OrderItemInput } from '../types/orders.types.ts';
import type { MeasurementVersion } from '../../measurements/types/measurements.types.ts';
import { fetchCustomers, fetchCustomer } from '../../customers/api/customers.api.ts';
import { fetchGarmentTypes } from '../../garments/api/garments.api.ts';
import { fetchCurrentMeasurement } from '../../measurements/api/measurements.api.ts';
import { createOrder, transitionOrder } from '../api/orders.api.ts';
import { formatCurrency } from '../constants/orderRules.ts';

interface LocalOrderItem {
  garmentTypeId: string;
  garmentTypeName: string;
  quantity: number;
  unitPrice: number;
  notes: string;
  requiredFields: Array<{ id?: string; fieldKey: string; label: string; unit: string }>;
}

export const OrderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryCustomerId = searchParams.get('customerId');

  // Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerMeasurement, setCustomerMeasurement] = useState<MeasurementVersion | null>(null);
  const [loadingCustomerMeasurement, setLoadingCustomerMeasurement] = useState(false);

  // Garment Types State
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [loadingGarmentTypes, setLoadingGarmentTypes] = useState(true);

  // Line Items State
  const [items, setItems] = useState<LocalOrderItem[]>([]);
  const [selectedGarmentTypeId, setSelectedGarmentTypeId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(150000);
  const [itemNotes, setItemNotes] = useState<string>('');

  // Pricing & Logistics State
  // Default deadline: 14 days from today at 17:00
  const getDefaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setHours(17, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T17:00`;
  };

  const [deadlineAt, setDeadlineAt] = useState<string>(getDefaultDeadline());
  const [requiresFitting, setRequiresFitting] = useState<boolean>(true);
  const [additionalCost, setAdditionalCost] = useState<number>(0);
  const [expressFee, setExpressFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Submitting State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load garment types on mount
  useEffect(() => {
    fetchGarmentTypes()
      .then((data) => {
        const active = data.filter((gt) => gt.isActive);
        setGarmentTypes(active);
        if (active.length > 0) {
          setSelectedGarmentTypeId(active[0].id);
        }
      })
      .catch((err) =>
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load garment types')
      )
      .finally(() => setLoadingGarmentTypes(false));
  }, []);

  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerSearch(cust.name);
    setCustomerOptions([]);

    // Check if customer has measurements
    setLoadingCustomerMeasurement(true);
    try {
      const measurement = await fetchCurrentMeasurement(cust.id);
      setCustomerMeasurement(measurement);
    } catch {
      setCustomerMeasurement(null);
    } finally {
      setLoadingCustomerMeasurement(false);
    }
  };

  // If query customerId provided, load customer directly
  useEffect(() => {
    if (queryCustomerId) {
      fetchCustomer(queryCustomerId)
        .then((cust) => {
          handleSelectCustomer(cust);
        })
        .catch(() => {
          // ignore or fall back
        });
    }
  }, [queryCustomerId]);

  // Handle customer search debounce
  useEffect(() => {
    if (!customerSearch.trim() || selectedCustomer) {
      setCustomerOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCustomer(true);
      try {
        const res = await fetchCustomers({ q: customerSearch.trim(), pageSize: 5 });
        setCustomerOptions(res.customers);
      } catch {
        setCustomerOptions([]);
      } finally {
        setSearchingCustomer(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearch, selectedCustomer]);

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerMeasurement(null);
    setCustomerSearch('');
  };

  // Selected garment type metadata
  const currentGarment = garmentTypes.find((g) => g.id === selectedGarmentTypeId);
  const currentRequiredFields = currentGarment?.measurementFields.filter((f) => f.isRequired) || [];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGarment) return;

    if (itemQuantity < 1) {
      setErrorMessage('Item quantity must be at least 1.');
      return;
    }

    if (itemUnitPrice < 0) {
      setErrorMessage('Unit price cannot be negative.');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        garmentTypeId: currentGarment.id,
        garmentTypeName: currentGarment.name,
        quantity: itemQuantity,
        unitPrice: itemUnitPrice,
        notes: itemNotes.trim(),
        requiredFields: currentRequiredFields,
      },
    ]);

    // Reset line item inputs
    setItemQuantity(1);
    setItemNotes('');
    setErrorMessage(null);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Pricing calculations
  const itemsSubtotal = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  const finalTotal = itemsSubtotal + (additionalCost || 0) + (expressFee || 0) - (discount || 0);

  const handleSubmit = async (targetConfirm = false) => {
    setErrorMessage(null);

    if (!selectedCustomer) {
      setErrorMessage('Please select a customer before creating the order.');
      return;
    }

    if (!deadlineAt) {
      setErrorMessage('Please specify an estimated delivery deadline.');
      return;
    }

    if (targetConfirm && items.length === 0) {
      setErrorMessage(
        'Cannot confirm order: at least one line item is required. Add an item or click "Save as Draft".'
      );
      return;
    }

    if (finalTotal < 0) {
      setErrorMessage('Order total cannot be negative. Please adjust discounts or extra fees.');
      return;
    }

    setSubmitting(true);
    try {
      const payloadItems: OrderItemInput[] = items.map((it) => ({
        garmentTypeId: it.garmentTypeId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        notes: it.notes || null,
      }));

      const created = await createOrder({
        customerId: selectedCustomer.id,
        deadlineAt: new Date(deadlineAt).toISOString(),
        requiresFitting,
        additionalCost: Number(additionalCost) || 0,
        expressFee: Number(expressFee) || 0,
        discount: Number(discount) || 0,
        notes: orderNotes.trim() || null,
        items: payloadItems,
      });

      // If user requested direct confirmation and criteria met, attempt transition
      if (targetConfirm && items.length > 0) {
        try {
          await transitionOrder(created.id, { toStatus: 'CONFIRMED' });
        } catch {
          // If transition fails (e.g. no measurements on file), order still exists in DRAFT
        }
      }

      navigate(`/orders/${created.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create order');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="order-create-page">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/orders"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="size-3.5 mr-1" /> Back to Orders
        </Link>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          New Bespoke Order
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Select customer, configure custom garment items with measurement requirements, and set pricing.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Select Customer */}
      <Card className="border shadow-xs" id="section-select-customer">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">1. Customer Selection</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Identify the client for this order to snapshot their active measurements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {!selectedCustomer ? (
            <div className="relative">
              <Label htmlFor="search-customer-input" className="text-xs font-medium mb-1 block">
                Search Client Directory <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="search-customer-input"
                  placeholder="Type client name or phone number..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                  autoComplete="off"
                />
                {searchingCustomer && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
                )}
              </div>

              {customerOptions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden">
                  {customerOptions.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => handleSelectCustomer(cust)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors flex items-center justify-between border-b border-border/50 last:border-b-0"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{cust.name}</p>
                        <p className="text-[11px] text-muted-foreground">{cust.phone || 'No phone'}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Select</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-md border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">
                    {selectedCustomer.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    Client Selected
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                  {selectedCustomer.phone && <span>Phone: {selectedCustomer.phone}</span>}
                  {selectedCustomer.email && <span>Email: {selectedCustomer.email}</span>}
                </div>

                {/* Measurement Status Indicator */}
                <div className="pt-1">
                  {loadingCustomerMeasurement ? (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="size-3 animate-spin" /> Verifying measurements...
                    </span>
                  ) : customerMeasurement ? (
                    <span className="text-[11px] text-foreground flex items-center gap-1 font-medium">
                      <CheckCircle2 className="size-3.5 text-primary" />
                      Measurements on file: Version #{customerMeasurement.versionNumber} ({customerMeasurement.values?.length || 0} fields)
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 p-1.5 rounded">
                      <AlertTriangle className="size-3.5 text-muted-foreground shrink-0" />
                      <span>
                        No measurements on file yet. Draft order can still be saved, but measurements must be taken before confirming.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleClearCustomer}
                className="self-start sm:self-center text-xs"
              >
                Change Client
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Line Items */}
      <Card className="border shadow-xs" id="section-order-items">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">2. Bespoke Line Items</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Add custom garments to the order. Notice each garment type's required measurement fields.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Add Item Form */}
          <div className="p-3 rounded-md border border-border bg-muted/20 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Garment Type Select */}
              <div className="space-y-1">
                <Label htmlFor="select-garment-type" className="text-xs font-medium">
                  Garment Type
                </Label>
                {loadingGarmentTypes ? (
                  <div className="h-9 flex items-center text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin mr-1.5" /> Loading catalogue...
                  </div>
                ) : (
                  <select
                    id="select-garment-type"
                    value={selectedGarmentTypeId}
                    onChange={(e) => setSelectedGarmentTypeId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {garmentTypes.map((gt) => (
                      <option key={gt.id} value={gt.id}>
                        {gt.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <Label htmlFor="input-quantity" className="text-xs font-medium">
                  Quantity
                </Label>
                <Input
                  id="input-quantity"
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Unit Price */}
              <div className="space-y-1">
                <Label htmlFor="input-unit-price" className="text-xs font-medium">
                  Unit Price (Rp)
                </Label>
                <Input
                  id="input-unit-price"
                  type="number"
                  min="0"
                  step="5000"
                  value={itemUnitPrice}
                  onChange={(e) => setItemUnitPrice(parseFloat(e.target.value) || 0)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Informational Context: Garment Required Measurement Fields */}
            {currentRequiredFields.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded bg-card border border-border/60 text-xs">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Ruler className="size-3 text-muted-foreground" />
                  Required body measurements for <strong>{currentGarment?.name}</strong>:
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentRequiredFields.map((f) => (
                    <Badge
                      key={f.id || f.fieldKey}
                      variant="secondary"
                      className="text-[10px] py-0 px-1 font-mono"
                    >
                      {f.label} ({f.unit})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Line Item Notes */}
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="space-y-1 flex-1 w-full">
                <Label htmlFor="input-item-notes" className="text-xs font-medium">
                  Customization Notes (Optional)
                </Label>
                <Input
                  id="input-item-notes"
                  placeholder="e.g. Silk lining, peaked lapel, double vent, cuff style..."
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-9 shrink-0 text-xs"
                id="btn-add-item-to-order"
              >
                <Plus className="size-3.5 mr-1" />
                Add to Order
              </Button>
            </div>
          </div>

          {/* Items List Table */}
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-border py-8 text-center text-muted-foreground text-xs">
              <p>No line items added yet.</p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">
                Configure garments above and click "Add to Order".
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-3 text-left w-10">#</th>
                      <th className="py-2 px-3 text-left">Garment</th>
                      <th className="py-2 px-3 text-center w-20">Qty</th>
                      <th className="py-2 px-3 text-right w-28">Unit Price</th>
                      <th className="py-2 px-3 text-right w-32">Subtotal</th>
                      <th className="py-2 px-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="py-2 px-3 font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-foreground">{item.garmentTypeName}</p>
                          {item.notes && (
                            <p className="text-[11px] text-muted-foreground italic">"{item.notes}"</p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="size-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center text-xs font-semibold px-1">
                <span>Items Subtotal:</span>
                <span className="font-mono text-sm">{formatCurrency(itemsSubtotal)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Logistics & Pricing Adjustments */}
      <Card className="border shadow-xs" id="section-order-pricing">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">3. Pricing & Delivery Schedule</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Set expected delivery deadline, fitting sessions, and pricing adjustments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Deadline */}
            <div className="space-y-1">
              <Label htmlFor="input-deadline" className="text-xs font-medium flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground" />
                Delivery Deadline <span className="text-destructive">*</span>
              </Label>
              <Input
                id="input-deadline"
                type="datetime-local"
                value={deadlineAt}
                onChange={(e) => setDeadlineAt(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Fitting Checkbox */}
            <div className="flex items-center gap-2 pt-6">
              <input
                id="checkbox-requires-fitting"
                type="checkbox"
                checked={requiresFitting}
                onChange={(e) => setRequiresFitting(e.target.checked)}
                className="size-4 rounded border-input"
              />
              <Label htmlFor="checkbox-requires-fitting" className="text-xs font-medium cursor-pointer">
                Requires fitting trial before handover (standard bespoke practice)
              </Label>
            </div>
          </div>

          {/* Pricing Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <Label htmlFor="input-additional-cost" className="text-xs font-medium">
                Additional Cost (Rp)
              </Label>
              <Input
                id="input-additional-cost"
                type="number"
                min="0"
                step="5000"
                value={additionalCost}
                onChange={(e) => setAdditionalCost(parseFloat(e.target.value) || 0)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="input-express-fee" className="text-xs font-medium">
                Express Surcharge (Rp)
              </Label>
              <Input
                id="input-express-fee"
                type="number"
                min="0"
                step="5000"
                value={expressFee}
                onChange={(e) => setExpressFee(parseFloat(e.target.value) || 0)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="input-discount" className="text-xs font-medium">
                Discount (Rp)
              </Label>
              <Input
                id="input-discount"
                type="number"
                min="0"
                step="5000"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Order Notes */}
          <div className="space-y-1">
            <Label htmlFor="input-order-notes" className="text-xs font-medium">
              Order Notes (Optional)
            </Label>
            <Textarea
              id="input-order-notes"
              rows={2}
              placeholder="Packaging requests, event dates, tailor assignments..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Totals Summary Banner */}
          <div className="rounded-md border border-border p-3 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-muted-foreground">Order Calculation:</span>
              <p className="text-[11px] text-muted-foreground">
                Subtotal {formatCurrency(itemsSubtotal)} + Extra {formatCurrency(additionalCost)} + Express {formatCurrency(expressFee)} - Discount {formatCurrency(discount)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Final Total</span>
              <span className="font-mono text-lg font-bold text-foreground">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <Link
          to="/orders"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Cancel
        </Link>

        <div className="flex items-center gap-2">
          {/* Save as Draft */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            id="btn-save-draft-order"
          >
            {submitting && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            <FileText className="size-3.5 mr-1.5" />
            Save as Draft
          </Button>

          {/* Confirm & Create */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            id="btn-confirm-create-order"
          >
            {submitting && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            <CheckCircle2 className="size-3.5 mr-1.5" />
            Confirm & Create Order
          </Button>
        </div>
      </div>
    </div>
  );
};
