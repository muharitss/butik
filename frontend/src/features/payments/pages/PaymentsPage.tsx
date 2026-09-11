import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RotateCcw, Receipt } from 'lucide-react';
import type { Order } from '../../orders/types/orders.types.ts';
import type { Payment } from '../types/payments.types.ts';
import { fetchOrders } from '../../orders/api/orders.api.ts';
import { fetchOrderPayments } from '../api/payments.api.ts';
import { PaymentRecordDialog } from '../components/PaymentRecordDialog.tsx';
import { PaymentsMetricsGrid, type PaymentsMetrics } from '../components/PaymentsMetricsGrid.tsx';
import { PaymentsFilterBar, type PaymentFilterTab } from '../components/PaymentsFilterBar.tsx';
import { PaymentsLedgerTable } from '../components/PaymentsLedgerTable.tsx';

export const PaymentsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<PaymentFilterTab>('ALL');

  // Dialog state for inline payment recording
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [existingPayments, setExistingPayments] = useState<Payment[]>([]);

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
      setError(err instanceof Error ? err.message : 'Failed to load orders for ledger');
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

  const handleOpenPaymentDialog = async (order: Order) => {
    setSelectedOrder(order);
    setExistingPayments([]);
    setDialogOpen(true);
    try {
      const payments = await fetchOrderPayments(order.id);
      setExistingPayments(payments);
    } catch {
      setExistingPayments([]);
    }
  };

  const handlePaymentSuccess = () => {
    loadOrders(searchQuery);
  };

  // Metrics computation across all loaded orders
  const metrics = useMemo<PaymentsMetrics>(() => {
    let totalValuation = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let unsettledOrdersCount = 0;

    for (const ord of orders) {
      const tot = Number(ord.total) || 0;
      const paid = Number(ord.paidTotalCache) || 0;
      const bal = Math.max(0, tot - paid);

      totalValuation += tot;
      totalCollected += paid;
      totalOutstanding += bal;

      if (bal > 0 || ord.paymentStatusCache !== 'PAID') {
        unsettledOrdersCount += 1;
      }
    }

    const collectionRate =
      totalValuation > 0
        ? Math.min(100, Math.round((totalCollected / totalValuation) * 100))
        : 0;

    return {
      totalValuation,
      totalCollected,
      totalOutstanding,
      unsettledOrdersCount,
      collectionRate,
    };
  }, [orders]);

  // Client-side filtering by tab
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const tot = Number(ord.total) || 0;
      const paid = Number(ord.paidTotalCache) || 0;
      const bal = Math.max(0, tot - paid);

      if (filterTab === 'UNSETTLED') {
        return bal > 0 || ord.paymentStatusCache !== 'PAID';
      }
      if (filterTab === 'PAID') {
        return ord.paymentStatusCache === 'PAID' || bal === 0;
      }
      return true;
    });
  }, [orders, filterTab]);

  return (
    <div className="space-y-6" id="payments-ledger-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
              Payment & Receivables Ledger
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of customer down payments, progress installments, and outstanding balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadOrders(searchQuery)}
            disabled={loading}
            id="btn-refresh-payments"
          >
            <RotateCcw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/orders" className="inline-flex">
            <Button variant="secondary" size="sm" id="btn-goto-orders">
              <Receipt className="size-3.5 mr-1.5" />
              All Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <PaymentsMetricsGrid metrics={metrics} totalOrdersCount={orders.length} />

      {/* Filter and Search Bar */}
      <PaymentsFilterBar
        filterTab={filterTab}
        setFilterTab={setFilterTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        totalOrdersCount={orders.length}
        unsettledCount={metrics.unsettledOrdersCount}
      />

      {/* Orders Ledger Table */}
      <PaymentsLedgerTable
        orders={filteredOrders}
        loading={loading}
        error={error}
        searchQuery={searchQuery}
        filterTab={filterTab}
        onRetry={() => loadOrders(searchQuery)}
        onClearSearch={handleClearSearch}
        onOpenPaymentDialog={handleOpenPaymentDialog}
      />

      {/* Inline Payment Record Dialog */}
      {selectedOrder && (
        <PaymentRecordDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedOrder(null);
          }}
          orderId={selectedOrder.id}
          orderTotal={selectedOrder.total}
          currentPaidTotal={selectedOrder.paidTotalCache}
          existingPayments={existingPayments}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
