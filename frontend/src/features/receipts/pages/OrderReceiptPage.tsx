import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { ReceiptDTO } from '../types/receipts.types.ts';
import { fetchOrderReceipt } from '../api/receipts.api.ts';
import { ReceiptDocument } from '../components/ReceiptDocument.tsx';
import { ReceiptActionToolbar } from '../components/ReceiptActionToolbar.tsx';

export const OrderReceiptPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<ReceiptDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReceipt = (isSilent = false) => {
    if (!id) return;
    if (isSilent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    fetchOrderReceipt(id)
      .then((data) => setReceipt(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Gagal memuat tanda terima nota')
      )
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadReceipt();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin mb-3 text-primary" />
        <span className="text-sm font-medium">Menyiapkan format cetak nota...</span>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-16 print:hidden">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Nota Tidak Ditemukan</AlertTitle>
          <AlertDescription>
            {error || 'Pesanan yang diminta tidak ditemukan atau belum memiliki data tanda terima.'}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center gap-2">
          <Link to="/orders" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="size-3.5 mr-1.5" /> Kembali ke Daftar Pesanan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 print:space-y-0 print:pb-0" id="order-receipt-page">
      {/* Action Toolbar (hidden when printing) */}
      <ReceiptActionToolbar
        receipt={receipt}
        onRefresh={() => loadReceipt(true)}
        refreshing={refreshing}
      />

      {/* Printable Receipt Canvas */}
      <ReceiptDocument receipt={receipt} />
    </div>
  );
};
