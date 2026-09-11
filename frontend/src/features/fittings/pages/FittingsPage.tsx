import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { Order } from '../../orders/types/orders.types.ts';
import type { Fitting } from '../types/fittings.types.ts';
import { fetchOrders } from '../../orders/api/orders.api.ts';
import { FittingsMetricsGrid, type FittingsMetrics } from '../components/FittingsMetricsGrid.tsx';
import { FittingsFilterBar, type FittingFilterTab } from '../components/FittingsFilterBar.tsx';
import { FittingsScheduleTable } from '../components/FittingsScheduleTable.tsx';
import { FittingScheduleDialog } from '../components/FittingScheduleDialog.tsx';
import { FittingRecordResultDialog } from '../components/FittingRecordResultDialog.tsx';

export const FittingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<FittingFilterTab>('ALL');

  // Dialog states for inline scheduling & outcome recording
  const [scheduleOrder, setScheduleOrder] = useState<Order | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState<boolean>(false);

  const [recordResultOrder, setRecordResultOrder] = useState<Order | null>(null);
  const [recordResultFitting, setRecordResultFitting] = useState<Fitting | null>(null);
  const [recordResultOpen, setRecordResultOpen] = useState<boolean>(false);

  const loadOrders = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOrders({
        q: query.trim() || undefined,
        pageSize: 100,
      });
      setOrders(result.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fitting orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(searchQuery);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    loadOrders('');
  };

  const handleOpenSchedule = (order: Order) => {
    setScheduleOrder(order);
    setScheduleOpen(true);
  };

  const handleOpenRecordResult = (order: Order, fitting: Fitting) => {
    setRecordResultOrder(order);
    setRecordResultFitting(fitting);
    setRecordResultOpen(true);
  };

  const handleScheduleSuccess = () => {
    loadOrders(searchQuery);
  };

  const handleRecordResultSuccess = (updatedFitting: Fitting) => {
    loadOrders(searchQuery);
    if (updatedFitting.result === 'NEEDS_REVISION' && recordResultOrder) {
      navigate(
        `/orders/${recordResultOrder.id}?action=create-revision&fittingId=${encodeURIComponent(
          updatedFitting.id
        )}`
      );
    }
  };

  // Metrics computation across orders
  const metrics = useMemo<FittingsMetrics>(() => {
    let scheduledFittingsCount = 0;
    let inProgressOrdersCount = 0;
    let inRevisionOrdersCount = 0;
    let approvedFittingsCount = 0;

    for (const ord of orders) {
      const fittings = (ord.fittings || []) as Fitting[];
      for (const f of fittings) {
        if (f.status === 'SCHEDULED') {
          scheduledFittingsCount += 1;
        }
        if (f.status === 'DONE' && f.result === 'APPROVED') {
          approvedFittingsCount += 1;
        }
      }

      if (ord.status === 'IN_PROGRESS' && ord.requiresFitting) {
        inProgressOrdersCount += 1;
      }
      if (ord.status === 'REVISION') {
        inRevisionOrdersCount += 1;
      }
    }

    return {
      scheduledFittingsCount,
      inProgressOrdersCount,
      inRevisionOrdersCount,
      approvedFittingsCount,
    };
  }, [orders]);

  // Client-side filtering by tab
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const fittings = (ord.fittings || []) as Fitting[];
      const hasScheduled = fittings.some((f) => f.status === 'SCHEDULED');

      if (filterTab === 'SCHEDULED') {
        return hasScheduled;
      }
      if (filterTab === 'IN_PRODUCTION') {
        return ['IN_PROGRESS', 'FITTING', 'REVISION'].includes(ord.status);
      }
      if (filterTab === 'COMPLETED') {
        return ['READY', 'COMPLETED'].includes(ord.status);
      }
      return true;
    });
  }, [orders, filterTab]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="fittings-schedule-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
              Fittings & Alterations Hub
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule client measurement trials, record trial outcomes, and track alterations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadOrders(searchQuery)}
            disabled={loading}
            id="btn-refresh-fittings"
          >
            <RotateCcw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/orders" className="inline-flex">
            <Button variant="secondary" size="sm" id="btn-goto-orders-from-fittings">
              All Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <FittingsMetricsGrid metrics={metrics} />

      {/* Filter and Search Bar */}
      <FittingsFilterBar
        filterTab={filterTab}
        setFilterTab={setFilterTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        totalOrdersCount={orders.length}
        scheduledCount={metrics.scheduledFittingsCount}
      />

      {/* Fittings Schedule Table */}
      <FittingsScheduleTable
        orders={filteredOrders}
        loading={loading}
        error={error}
        searchQuery={searchQuery}
        filterTab={filterTab}
        onRetry={() => loadOrders(searchQuery)}
        onClearSearch={handleClearSearch}
        onOpenSchedule={handleOpenSchedule}
        onOpenRecordResult={handleOpenRecordResult}
      />

      {/* Schedule Fitting Dialog */}
      {scheduleOrder && (
        <FittingScheduleDialog
          open={scheduleOpen}
          onOpenChange={(open) => {
            setScheduleOpen(open);
            if (!open) setScheduleOrder(null);
          }}
          orderId={scheduleOrder.id}
          currentFittingCount={(scheduleOrder.fittings || []).length}
          orderStatus={scheduleOrder.status}
          onSuccess={handleScheduleSuccess}
        />
      )}

      {/* Record Result Dialog */}
      {recordResultOrder && recordResultFitting && (
        <FittingRecordResultDialog
          open={recordResultOpen}
          onOpenChange={(open) => {
            setRecordResultOpen(open);
            if (!open) {
              setRecordResultOrder(null);
              setRecordResultFitting(null);
            }
          }}
          orderId={recordResultOrder.id}
          fitting={recordResultFitting}
          onSuccess={handleRecordResultSuccess}
        />
      )}
    </div>
  );
};
