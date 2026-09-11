import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Ruler,
  ClipboardCheck,
  Plus,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { Order } from '../../orders/types/orders.types.ts';
import type { Fitting } from '../types/fittings.types.ts';
import { OrderStatusBadge } from '../../orders/components/OrderStatusBadge.tsx';
import {
  canScheduleFitting,
  getFittingStatusLabel,
  getFittingBadgeVariant,
  getFittingResultLabel,
  getFittingResultBadgeVariant,
  formatDateTime,
} from '../constants/fittingRules.ts';

interface FittingsScheduleTableProps {
  orders: Order[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filterTab: string;
  onRetry: () => void;
  onClearSearch: () => void;
  onOpenSchedule: (order: Order) => void;
  onOpenRecordResult: (order: Order, fitting: Fitting) => void;
}

export const FittingsScheduleTable: React.FC<FittingsScheduleTableProps> = ({
  orders,
  loading,
  error,
  searchQuery,
  filterTab,
  onRetry,
  onClearSearch,
  onOpenSchedule,
  onOpenRecordResult,
}) => {
  return (
    <Card className="border shadow-xs overflow-hidden" id="fittings-table-card">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Fitting Sessions</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Trial sessions and tailoring fit status per customer order.
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {orders.length} order(s) listed
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-7 animate-spin mb-2 text-primary" />
            <span className="text-xs">Loading fitting sessions...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-destructive">
            <AlertCircle className="size-5 mx-auto mb-1.5" />
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3 text-xs"
            >
              Try Again
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
              <Ruler className="size-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No Fitting Records Found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? `No orders matching "${searchQuery}" in this filter.`
                : filterTab === 'SCHEDULED'
                ? 'No scheduled trial appointments currently pending.'
                : 'No bespoke orders recorded yet.'}
            </p>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSearch}
                className="mt-3 text-xs"
              >
                Clear Search Filter
              </Button>
            )}
          </div>
        ) : (
          <Table id="table-fittings-schedule">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs font-semibold w-[14%]">Order #</TableHead>
                <TableHead className="text-xs font-semibold w-[20%]">Client Name</TableHead>
                <TableHead className="text-xs font-semibold w-[12%]">Order State</TableHead>
                <TableHead className="text-xs font-semibold w-[12%]">Fitting Needed?</TableHead>
                <TableHead className="text-xs font-semibold w-[14%]">Session Count</TableHead>
                <TableHead className="text-xs font-semibold w-[18%]">Latest Fitting</TableHead>
                <TableHead className="text-xs font-semibold text-right w-[10%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((ord) => {
                const customerName = ord.customer?.name || 'Unknown Client';
                const fittings = ((ord.fittings || []) as Fitting[])
                  .slice()
                  .sort((a, b) => a.fittingNumber - b.fittingNumber);
                const latestFitting = fittings.length > 0 ? fittings[fittings.length - 1] : null;
                const activeScheduled = fittings.find((f) => f.status === 'SCHEDULED');
                const canSchedule = canScheduleFitting(ord.status).allowed && ord.requiresFitting;

                return (
                  <TableRow key={ord.id} className="text-xs hover:bg-muted/20">
                    {/* Order Number */}
                    <TableCell className="font-mono font-semibold text-primary whitespace-nowrap">
                      <Link to={`/orders/${ord.id}`} className="hover:underline">
                        {ord.orderNumber}
                      </Link>
                    </TableCell>

                    {/* Customer Info */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <Link
                          to={`/customers/${ord.customerId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {customerName}
                        </Link>
                        {ord.customer?.phone && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {ord.customer.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Order Workflow Status */}
                    <TableCell>
                      <OrderStatusBadge status={ord.status} />
                    </TableCell>

                    {/* Requires Fitting */}
                    <TableCell>
                      <Badge
                        variant={ord.requiresFitting ? 'outline' : 'secondary'}
                        className="text-[10px]"
                      >
                        {ord.requiresFitting ? 'Required' : 'No Fitting'}
                      </Badge>
                    </TableCell>

                    {/* Session Count */}
                    <TableCell>
                      <span className="font-mono font-medium text-foreground">
                        {fittings.length} session{fittings.length === 1 ? '' : 's'}
                      </span>
                    </TableCell>

                    {/* Latest Fitting Session */}
                    <TableCell>
                      {latestFitting ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              Fitting #{latestFitting.fittingNumber}
                            </span>
                            <Badge
                              variant={getFittingBadgeVariant(latestFitting.status)}
                              className="text-[9px] px-1 py-0"
                            >
                              {getFittingStatusLabel(latestFitting.status)}
                            </Badge>
                          </div>

                          {latestFitting.status === 'SCHEDULED' && latestFitting.scheduledAt && (
                            <p className="text-[10px] text-muted-foreground">
                              {formatDateTime(latestFitting.scheduledAt)}
                            </p>
                          )}

                          {latestFitting.status === 'DONE' && (
                            <div className="flex items-center gap-1">
                              <Badge
                                variant={getFittingResultBadgeVariant(latestFitting.result)}
                                className="text-[9px] px-1 py-0"
                              >
                                {getFittingResultLabel(latestFitting.result)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">
                          Not scheduled yet
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {activeScheduled ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="default"
                            className="h-7 text-xs px-2"
                            onClick={() => onOpenRecordResult(ord, activeScheduled)}
                            id={`btn-record-result-${ord.id}`}
                            title="Record trial outcome"
                          >
                            <ClipboardCheck className="size-3 mr-1" />
                            Outcome
                          </Button>
                        ) : canSchedule ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="secondary"
                            className="h-7 text-xs px-2"
                            onClick={() => onOpenSchedule(ord)}
                            id={`btn-schedule-fitting-${ord.id}`}
                            title="Schedule fitting trial session"
                          >
                            <Plus className="size-3 mr-1" />
                            Schedule
                          </Button>
                        ) : null}

                        <Link to={`/orders/${ord.id}`}>
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                            title="Open order details"
                          >
                            <ArrowRight className="size-3" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
