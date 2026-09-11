import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Search,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  AlertTriangle,
  ClipboardList,
  Calendar,
} from 'lucide-react';
import type { Order, OrderStatus } from '../types/orders.types.ts';
import type { PaginationMeta } from '../../customers/types/customers.types.ts';
import { fetchOrders } from '../api/orders.api.ts';
import { ORDER_STATUSES, formatCurrency, formatDate, getStatusLabel } from '../constants/orderRules.ts';
import { OrderStatusBadge } from '../components/OrderStatusBadge.tsx';

export const OrderListPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [dueAfter, setDueAfter] = useState('');
  const [dueBefore, setDueBefore] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setMeta((prev) => ({ ...prev, page: 1 }));
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const loadOrders = async (
    page: number,
    q: string,
    status: OrderStatus | '',
    after: string,
    before: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrders({
        q: q || undefined,
        status: status || undefined,
        dueAfter: after ? new Date(after).toISOString() : undefined,
        dueBefore: before ? new Date(before).toISOString() : undefined,
        page,
        pageSize: 20,
      });
      setOrders(res.orders);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(meta.page, debouncedQuery, statusFilter, dueAfter, dueBefore);
  }, [meta.page, debouncedQuery, statusFilter, dueAfter, dueBefore]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      setMeta((prev) => ({ ...prev, page: newPage }));
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setStatusFilter('');
    setDueAfter('');
    setDueBefore('');
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    Boolean(debouncedQuery) || Boolean(statusFilter) || Boolean(dueAfter) || Boolean(dueBefore);

  return (
    <div className="space-y-6" id="order-list-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
              Bespoke Orders
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage custom tailoring orders, line items, status lifecycles, and delivery deadlines.
          </p>
        </div>

        <Link
          to="/orders/new"
          className={buttonVariants({ size: 'sm' })}
          id="btn-create-new-order"
        >
          <Plus className="size-4 mr-1.5" />
          New Order
        </Link>
      </div>

      {/* Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search order #, customer, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 h-9 text-xs"
                id="input-search-orders"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as OrderStatus | '');
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                id="select-filter-status"
              >
                <option value="">All Statuses</option>
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {getStatusLabel(st)}
                  </option>
                ))}
              </select>
            </div>

            {/* Due After Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">Due from:</span>
              <Input
                type="date"
                value={dueAfter}
                onChange={(e) => {
                  setDueAfter(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                className="h-9 text-xs"
                id="input-filter-due-after"
              />
            </div>

            {/* Due Before Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">Due until:</span>
              <Input
                type="date"
                value={dueBefore}
                onChange={(e) => {
                  setDueBefore(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                className="h-9 text-xs"
                id="input-filter-due-before"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
              <span className="text-muted-foreground">
                Showing filtered results ({meta.totalItems} orders found)
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleClearFilters}
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error loading orders</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Orders Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-7 animate-spin mb-2 text-primary" />
          <span className="text-sm">Loading bespoke orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="rounded-full bg-muted p-3 mb-3 text-muted-foreground">
              <ClipboardList className="size-6" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-foreground">
              {hasActiveFilters ? 'No matching orders found' : 'No orders recorded yet'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your search criteria, clearing filters, or create a new bespoke order.'
                : 'Create your first custom tailoring order to track line items, measurements, and delivery workflow.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Link to="/orders/new" className={buttonVariants({ size: 'sm' })}>
                <Plus className="size-4 mr-1.5" />
                Create First Order
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <Card className="hidden md:block overflow-hidden border shadow-xs">
            <Table id="table-orders">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[15%] text-xs">Order #</TableHead>
                  <TableHead className="w-[20%] text-xs">Client Name</TableHead>
                  <TableHead className="w-[14%] text-xs">Status</TableHead>
                  <TableHead className="w-[15%] text-xs">Deadline</TableHead>
                  <TableHead className="w-[16%] text-right text-xs">Total / Balance</TableHead>
                  <TableHead className="w-[10%] text-center text-xs">Items</TableHead>
                  <TableHead className="w-[10%] text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const customerName = order.customer?.name || 'Unknown Client';
                  const total = Number(order.total);
                  const paid = Number(order.paidTotalCache || 0);
                  const balance = Math.max(0, total - paid);
                  const itemCount = order.items?.length || 0;

                  return (
                    <TableRow key={order.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        <Link
                          to={`/orders/${order.id}`}
                          className="hover:underline text-primary"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <Link
                            to={`/customers/${order.customerId}`}
                            className="font-medium text-xs text-foreground hover:underline"
                          >
                            {customerName}
                          </Link>
                          {order.customer?.phone && (
                            <p className="text-[10px] text-muted-foreground">
                              {order.customer.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          <span>{formatDate(order.deadlineAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono text-xs font-semibold text-foreground">
                          {formatCurrency(total)}
                        </div>
                        {balance > 0 ? (
                          <div className="text-[10px] font-mono text-destructive">
                            Due: {formatCurrency(balance)}
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground">Settled</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {itemCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/orders/${order.id}`}
                          className={buttonVariants({ variant: 'ghost', size: 'xs' })}
                          title="View order details"
                        >
                          <Eye className="size-3.5 mr-1" />
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => {
              const customerName = order.customer?.name || 'Unknown Client';
              const total = Number(order.total);
              const paid = Number(order.paidTotalCache || 0);
              const balance = Math.max(0, total - paid);

              return (
                <Card key={order.id} className="border shadow-xs">
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/orders/${order.id}`}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <CardTitle className="text-sm font-medium mt-1">
                      <Link to={`/customers/${order.customerId}`} className="hover:underline">
                        {customerName}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Deadline:</span>
                      <span className="text-foreground">{formatDate(order.deadlineAt)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total:</span>
                      <span className="font-mono text-foreground font-semibold">
                        {formatCurrency(total)}
                      </span>
                    </div>
                    {balance > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Balance Due:</span>
                        <span className="font-mono font-semibold">{formatCurrency(balance)}</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="p-3 pt-1 border-t border-border flex justify-end">
                    <Link
                      to={`/orders/${order.id}`}
                      className={buttonVariants({ variant: 'outline', size: 'xs' })}
                    >
                      <Eye className="size-3.5 mr-1" />
                      View Details
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Page {meta.page} of {meta.totalPages} ({meta.totalItems} orders)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page <= 1 || loading}
                  className="h-8 px-2.5 text-xs"
                >
                  <ChevronLeft className="size-3.5 mr-1" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page >= meta.totalPages || loading}
                  className="h-8 px-2.5 text-xs"
                >
                  Next
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
