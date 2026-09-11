import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Pencil, ShieldAlert } from 'lucide-react';
import type { Order } from '../types/orders.types.ts';
import {
  formatCurrency,
  getPaymentBadgeVariant,
  getPaymentStatusLabel,
} from '../constants/orderRules.ts';

interface OrderPricingSummaryCardProps {
  order: Order;
  canEdit?: boolean;
  onEditClick?: () => void;
}

export const OrderPricingSummaryCard: React.FC<OrderPricingSummaryCardProps> = ({
  order,
  canEdit = false,
  onEditClick,
}) => {
  const subtotal = Number(order.subtotal);
  const additionalCost = Number(order.additionalCost);
  const expressFee = Number(order.expressFee);
  const discount = Number(order.discount);
  const total = Number(order.total);
  const paidTotal = Number(order.paidTotalCache || 0);
  const remainingBalance =
    order.paymentsSummary?.remainingBalance !== undefined
      ? Number(order.paymentsSummary.remainingBalance)
      : Math.max(0, total - paidTotal);

  const paymentStatus = order.paymentStatusCache || 'UNPAID';

  return (
    <Card className="border shadow-xs" id="order-pricing-summary-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Pricing & Settlement</CardTitle>
          </div>
          <CardDescription className="text-xs mt-1">
            Order cost structure and settlement status.
          </CardDescription>
        </div>

        {canEdit && onEditClick && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEditClick}
            id="btn-edit-order-pricing"
          >
            <Pencil className="size-3.5 mr-1.5" />
            Edit Pricing
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2 text-xs border-b border-border pb-3">
          <div className="flex justify-between text-muted-foreground">
            <span>Items Subtotal</span>
            <span className="font-mono text-foreground">{formatCurrency(subtotal)}</span>
          </div>

          {additionalCost > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Additional Customization Cost</span>
              <span className="font-mono text-foreground">+{formatCurrency(additionalCost)}</span>
            </div>
          )}

          {expressFee > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Express Production Fee</span>
              <span className="font-mono text-foreground">+{formatCurrency(expressFee)}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Promotional / Courtesy Discount</span>
              <span className="font-mono text-destructive">-{formatCurrency(discount)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-border font-semibold text-sm">
            <span>Final Total</span>
            <span className="font-mono text-base text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Payment Settlement Status */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payment Status:</span>
            <Badge variant={getPaymentBadgeVariant(paymentStatus)}>
              {getPaymentStatusLabel(paymentStatus)}
            </Badge>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>Paid to Date</span>
            <span className="font-mono text-foreground font-medium">
              {formatCurrency(paidTotal)}
            </span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>Outstanding Balance</span>
            <span
              className={`font-mono font-semibold ${
                remainingBalance > 0 ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {formatCurrency(remainingBalance)}
            </span>
          </div>

          {remainingBalance > 0 && (
            <div className="flex items-start gap-1.5 mt-2 rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
              <ShieldAlert className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span>
                Orders cannot transition to Completed until the balance is fully settled.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
