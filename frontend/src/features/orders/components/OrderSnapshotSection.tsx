import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ruler, RefreshCw, Loader2, AlertTriangle, Check } from 'lucide-react';
import type { Order } from '../types/orders.types.ts';
import { formatDateTime } from '../constants/orderRules.ts';
import { resnapshotOrder } from '../api/orders.api.ts';

interface OrderSnapshotSectionProps {
  order: Order;
  onResnapshotSuccess?: (updatedOrder: Order) => void;
}

export const OrderSnapshotSection: React.FC<OrderSnapshotSectionProps> = ({
  order,
  onResnapshotSuccess,
}) => {
  const snapshot =
    order.measurementSnapshot ||
    order.measurementSnapshots?.find((s) => !s.supersededByResnapshotAt) ||
    order.measurementSnapshots?.[0];

  const canResnapshot =
    order.status === 'DRAFT' ||
    order.status === 'CONFIRMED' ||
    order.status === 'IN_PROGRESS';

  const [resnapshotting, setResnapshotting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleResnapshot = async () => {
    setResnapshotting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await resnapshotOrder(order.id);
      setSuccessMsg('Measurements successfully re-snapshotted from client profile.');
      if (onResnapshotSuccess) {
        onResnapshotSuccess(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-snapshot customer measurements');
    } finally {
      setResnapshotting(false);
    }
  };

  return (
    <Card className="border shadow-xs" id="order-measurement-snapshot-section">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Ruler className="size-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Measurement Snapshot</CardTitle>
            {snapshot && (
              <Badge variant="outline" className="text-xs">
                Frozen Snapshot
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs mt-1">
            Immutable body measurements captured for this production run.
          </CardDescription>
        </div>

        {canResnapshot && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResnapshot}
            disabled={resnapshotting}
            id="btn-resnapshot-measurements"
            title="Re-copy latest customer measurements into this order"
          >
            {resnapshotting ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="size-3.5 mr-1.5" />
            )}
            Sync Latest Profile
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert variant="default" className="border-border">
            <Check className="size-4 text-primary" />
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        {!snapshot ? (
          <div className="rounded-md border border-dashed border-border py-8 text-center text-muted-foreground">
            <p className="text-sm">No measurement snapshot attached.</p>
            <p className="mt-1 text-xs">
              Ensure the customer has measurements on file, then click "Sync Latest Profile" before confirming this order.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground border-b border-border pb-2 mb-3">
              <span>
                Captured at: <strong>{formatDateTime(snapshot.createdAt)}</strong>
              </span>
              <span>
                Total Fields: <strong>{snapshot.values?.length || 0}</strong>
              </span>
            </div>

            {(!snapshot.values || snapshot.values.length === 0) ? (
              <p className="text-xs text-muted-foreground italic py-2">
                Snapshot has no recorded values.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {snapshot.values.map((v) => (
                  <div
                    key={v.id || v.fieldKey}
                    className="flex flex-col p-2 rounded-md border border-border bg-muted/20"
                  >
                    <span className="text-[11px] text-muted-foreground truncate uppercase font-mono">
                      {v.fieldKey}
                    </span>
                    <span className="text-sm font-semibold font-mono text-foreground mt-0.5">
                      {Number(v.value)} {v.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
