import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { History, ArrowRight } from 'lucide-react';
import type { OrderStatusHistory } from '../types/orders.types.ts';
import { formatDateTime } from '../constants/orderRules.ts';
import { OrderStatusBadge } from './OrderStatusBadge.tsx';

interface OrderHistoryTimelineProps {
  statusHistories?: OrderStatusHistory[];
}

export const OrderHistoryTimeline: React.FC<OrderHistoryTimelineProps> = ({
  statusHistories = [],
}) => {
  return (
    <Card className="border shadow-xs" id="order-status-history-section">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Status Audit Trail</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Chronological record of status transitions and workflow notes.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {statusHistories.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            No status history recorded yet.
          </p>
        ) : (
          <div className="relative pl-6 space-y-4 border-l border-border ml-2 my-2">
            {statusHistories.map((entry, index) => (
              <div key={entry.id || index} className="relative group">
                {/* Timeline dot */}
                <div className="absolute -left-[31px] top-1 size-2.5 rounded-full border border-background bg-primary ring-2 ring-background" />

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.fromStatus ? (
                      <div className="flex items-center gap-1.5">
                        <OrderStatusBadge status={entry.fromStatus} showIcon={false} />
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <OrderStatusBadge status={entry.toStatus} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Created as</span>
                        <OrderStatusBadge status={entry.toStatus} />
                      </div>
                    )}

                    <span className="text-[11px] text-muted-foreground ml-auto">
                      {formatDateTime(entry.changedAt)}
                    </span>
                  </div>

                  {entry.reason && (
                    <div className="rounded-md bg-muted/40 p-2 text-xs text-foreground mt-1 border border-border/50">
                      <span className="text-muted-foreground font-medium mr-1">Note:</span>
                      <span>"{entry.reason}"</span>
                    </div>
                  )}

                  {entry.user?.name && (
                    <p className="text-[10px] text-muted-foreground">
                      By: {entry.user.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
