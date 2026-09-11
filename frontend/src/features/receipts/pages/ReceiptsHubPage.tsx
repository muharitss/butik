import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Receipt,
  Search,
  Printer,
  Calendar,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { fetchOrders } from '../../orders/api/orders.api.ts';
import type { Order } from '../../orders/types/orders.types.ts';
import {
  formatCurrency,
  formatDate,
  getStatusBadgeVariant,
  getStatusLabel,
  getPaymentBadgeVariant,
  getPaymentStatusLabel,
} from '../constants/receiptRules.ts';
import { fetchOrderReceipt } from '../api/receipts.api.ts';
import type { ReceiptDTO } from '../types/receipts.types.ts';
import { ReceiptDocument } from '../components/ReceiptDocument.tsx';
import { ReceiptActionToolbar } from '../components/ReceiptActionToolbar.tsx';

export const ReceiptsHubPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOrderId = searchParams.get('orderId');

  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Selected receipt preview
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptDTO | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  // Load orders matching query
  const loadOrders = (query = '') => {
    setLoadingOrders(true);
    fetchOrders({ q: query, pageSize: 15 })
      .then((res) => setOrders(res.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  };

  useEffect(() => {
    loadOrders(searchQuery);
  }, [searchQuery]);

  // If selectedOrderId changes, fetch receipt DTO for inline preview
  useEffect(() => {
    if (!selectedOrderId) {
      setPreviewReceipt(null);
      return;
    }

    setLoadingReceipt(true);
    setReceiptError(null);
    fetchOrderReceipt(selectedOrderId)
      .then((data) => setPreviewReceipt(data))
      .catch((err) =>
        setReceiptError(err instanceof Error ? err.message : 'Gagal memuat nota pesanan')
      )
      .finally(() => setLoadingReceipt(false));
  }, [selectedOrderId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="receipts-hub-page">
      {/* Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground tracking-tight">
              Tanda Terima & Nota
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih atau cari pesanan untuk mencetak nota pelanggan, bukti pembayaran, dan rincian item busana.
          </p>
        </div>
      </div>

      {/* If an order is selected, show preview directly */}
      {selectedOrderId && (
        <div className="space-y-4">
          <div className="print:hidden flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-xs">
              <FileCheck2 className="size-4 text-primary" />
              <span className="font-medium text-foreground">
                Menampilkan Pratinjau Nota:
              </span>
              <span className="font-mono font-bold">{previewReceipt?.orderNumber || '...'}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setSearchParams({})}
              id="btn-close-receipt-preview"
            >
              Tutup Pratinjau
            </Button>
          </div>

          {loadingReceipt ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin mb-2 text-primary" />
              <span className="text-xs">Memuat data nota...</span>
            </div>
          ) : receiptError ? (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{receiptError}</span>
            </div>
          ) : previewReceipt ? (
            <div className="space-y-4">
              <ReceiptActionToolbar receipt={previewReceipt} />
              <ReceiptDocument receipt={previewReceipt} />
            </div>
          ) : null}
        </div>
      )}

      {/* Orders Selector Section (hidden when printing) */}
      <Card className="print:hidden border border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Pilih Pesanan untuk Cetak Nota
              </CardTitle>
              <CardDescription className="text-xs">
                Cari berdasarkan nomor pesanan, nama pelanggan, atau nomor telepon.
              </CardDescription>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari pesanan / nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8"
                id="input-search-receipt-orders"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-6 animate-spin mb-2 text-primary" />
              <span className="text-xs">Mencari pesanan...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Tidak ada pesanan yang cocok dengan pencarian Anda.
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border">
                    <TableHead className="font-semibold text-xs">No. Pesanan</TableHead>
                    <TableHead className="font-semibold text-xs">Pelanggan</TableHead>
                    <TableHead className="font-semibold text-xs">Tanggal</TableHead>
                    <TableHead className="font-semibold text-xs">Status</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Total Tagihan</TableHead>
                    <TableHead className="text-right font-semibold text-xs">Aksi Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="border-border hover:bg-muted/20">
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        <Link
                          to={`/orders/${order.id}/receipt`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <Receipt className="size-3.5 text-primary" />
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        {order.customer?.name || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDate(order.orderDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          <Badge variant={getPaymentBadgeVariant(order.paymentStatusCache)}>
                            {getPaymentStatusLabel(order.paymentStatusCache)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => setSearchParams({ orderId: order.id })}
                            title="Pratinjau Nota di Sini"
                          >
                            <Receipt className="size-3 mr-1" />
                            Pratinjau
                          </Button>
                          <Link
                            to={`/orders/${order.id}/receipt`}
                            className={buttonVariants({ variant: 'default', size: 'xs' })}
                            title="Buka Halaman Cetak Nota Penuh"
                          >
                            <Printer className="size-3 mr-1" />
                            Cetak
                          </Link>
                          <Link
                            to={`/orders/${order.id}`}
                            className={buttonVariants({ variant: 'ghost', size: 'xs' })}
                            title="Lihat Detail Pesanan"
                          >
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
