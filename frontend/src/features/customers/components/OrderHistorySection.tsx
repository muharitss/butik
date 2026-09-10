import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag } from 'lucide-react';

export interface OrderHistorySectionProps {
  customerId: string;
}

export const OrderHistorySection: React.FC<OrderHistorySectionProps> = ({ customerId }) => {
  return (
    <Card className="border-dashed" id={`order-history-section-${customerId}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Order History</CardTitle>
          </div>
          <Badge variant="outline">Phase 3 Reserved</Badge>
        </div>
        <CardDescription>
          Track bespoke tailoring orders, line items, fittings, and garment status transitions for this customer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-8 text-center text-muted-foreground">
          <p className="text-sm">No orders recorded yet.</p>
          <p className="mt-1 text-xs">
            Bespoke orders and measurement snapshots will be visible here once the Orders module is enabled.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
