import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Scissors,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Receipt,
  FileText,
} from 'lucide-react';
import type { ReceiptDTO } from '../types/receipts.types.ts';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusBadgeVariant,
  getPaymentStatusLabel,
  getPaymentBadgeVariant,
  getPaymentTypeLabel,
} from '../constants/receiptRules.ts';

interface ReceiptDocumentProps {
  receipt: ReceiptDTO;
}

export const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({ receipt }) => {
  const isFullyPaid = Number(receipt.paymentsSummary.remainingBalance) <= 0;
  const hasAdditionalCost = Number(receipt.totals.additionalCost) > 0;
  const hasExpressFee = Number(receipt.totals.expressFee) > 0;
  const hasDiscount = Number(receipt.totals.discount) > 0;

  return (
    <Card
      id="receipt-print-area"
      className="receipt-card max-w-3xl mx-auto border border-border bg-card text-card-foreground shadow-xs print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full"
    >
      <CardContent className="p-6 sm:p-8 space-y-6 print:p-0">
        {/* Boutique Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center print:border print:border-border">
                <Scissors className="size-4" />
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {receipt.boutique.name}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {receipt.boutique.tagline}
            </p>
            <div className="space-y-0.5 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                <span>{receipt.boutique.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0" />
                  {receipt.boutique.phone}
                </span>
                {receipt.boutique.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5 shrink-0" />
                    {receipt.boutique.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Receipt Document Title & Order Number */}
          <div className="sm:text-right space-y-1.5 shrink-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Receipt className="size-3.5" />
              <span>Tanda Terima / Nota</span>
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {receipt.orderNumber}
            </div>
            <div className="flex items-center sm:justify-end gap-2 pt-0.5">
              <Badge variant={getStatusBadgeVariant(receipt.status)}>
                {getStatusLabel(receipt.status)}
              </Badge>
              <Badge variant={getPaymentBadgeVariant(receipt.paymentsSummary.paymentStatus)}>
                {getPaymentStatusLabel(receipt.paymentsSummary.paymentStatus)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info Grid: Customer & Order Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-b border-border pb-6">
          {/* Customer Details */}
          <div className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3.5 print:bg-transparent print:border-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Pelanggan / Pemesan
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm pt-0.5">
              <User className="size-3.5 text-muted-foreground" />
              <span>{receipt.customer.name}</span>
            </div>
            {receipt.customer.phone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="size-3 text-muted-foreground" />
                <span>{receipt.customer.phone}</span>
              </div>
            )}
            {receipt.customer.address && (
              <div className="flex items-start gap-1.5 text-muted-foreground pt-0.5">
                <MapPin className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                <span className="line-clamp-2">{receipt.customer.address}</span>
              </div>
            )}
          </div>

          {/* Order Metadata */}
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3.5 print:bg-transparent print:border-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Detail Pesanan
            </span>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <span className="text-muted-foreground block text-[11px]">Tanggal Masuk:</span>
                <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="size-3 text-muted-foreground" />
                  {formatDate(receipt.orderDate)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Estimasi Selesai:</span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="size-3 text-muted-foreground" />
                  {formatDate(receipt.deadlineAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Garment List */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Rincian Item Busana
          </h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40 print:bg-transparent">
                <TableRow className="border-border">
                  <TableHead className="w-10 text-center font-semibold text-xs">No</TableHead>
                  <TableHead className="font-semibold text-xs">Jenis Busana & Spesifikasi</TableHead>
                  <TableHead className="text-center w-16 font-semibold text-xs">Qty</TableHead>
                  <TableHead className="text-right w-28 font-semibold text-xs">Harga Satuan</TableHead>
                  <TableHead className="text-right w-32 font-semibold text-xs">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipt.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-xs">
                      Tidak ada rincian item busana.
                    </TableCell>
                  </TableRow>
                ) : (
                  receipt.items.map((item, idx) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground text-xs">
                          {item.garmentTypeName}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-muted-foreground italic mt-0.5">
                            Catatan: {item.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-xs text-foreground">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Financial Breakdown & Settlements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left Column: Recorded Payments History */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Riwayat Pembayaran
            </h2>
            {receipt.paymentsSummary.payments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Belum ada transaksi pembayaran yang tercatat.
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40 print:bg-transparent">
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold">Jenis / Metode</TableHead>
                      <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipt.paymentsSummary.payments.map((p) => (
                      <TableRow key={p.id} className="border-border">
                        <TableCell className="text-xs py-2">
                          <div className="font-medium text-foreground">
                            {getPaymentTypeLabel(p.type)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.method ? `Metode: ${p.method}` : 'Tunai / Transfer'}
                            {p.note ? ` • ${p.note}` : ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2 whitespace-nowrap">
                          {formatDate(p.recordedAt)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium py-2">
                          {formatCurrency(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Right Column: Ledger Totals & Remaining Balance */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ringkasan Tagihan
            </h2>
            <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal Item</span>
                <span className="font-mono text-foreground font-medium">
                  {formatCurrency(receipt.totals.subtotal)}
                </span>
              </div>

              {hasAdditionalCost && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Biaya Tambahan</span>
                  <span className="font-mono text-foreground">
                    +{formatCurrency(receipt.totals.additionalCost)}
                  </span>
                </div>
              )}

              {hasExpressFee && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Biaya Kilat / Express</span>
                  <span className="font-mono text-foreground">
                    +{formatCurrency(receipt.totals.expressFee)}
                  </span>
                </div>
              )}

              {hasDiscount && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Diskon Potongan</span>
                  <span className="font-mono text-foreground">
                    -{formatCurrency(receipt.totals.discount)}
                  </span>
                </div>
              )}

              <div className="border-t border-border pt-2 flex justify-between items-center text-sm">
                <span className="font-bold text-foreground">Total Pesanan</span>
                <span className="font-mono font-bold text-base text-foreground">
                  {formatCurrency(receipt.totals.total)}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/50">
                <span>Total Sudah Dibayar</span>
                <span className="font-mono text-foreground font-medium">
                  {formatCurrency(receipt.paymentsSummary.paidTotal)}
                </span>
              </div>

              {/* Outstanding Balance Box */}
              <div
                className={`flex justify-between items-center p-2.5 rounded-md mt-2 border ${
                  isFullyPaid
                    ? 'bg-secondary/40 border-border text-foreground'
                    : 'bg-primary/5 border-primary/20 text-primary'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {isFullyPaid && <CheckCircle2 className="size-4 text-emerald-600" />}
                  <span>{isFullyPaid ? 'Status Pelunasan' : 'Sisa Tagihan (Pelunasan)'}</span>
                </div>
                <span className="font-mono font-bold text-base">
                  {isFullyPaid ? 'LUNAS' : formatCurrency(receipt.paymentsSummary.remainingBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes (if any) */}
        {receipt.notes && (
          <div className="rounded-lg border border-border/70 p-3 text-xs bg-muted/20 print:bg-transparent">
            <div className="flex items-center gap-1.5 font-semibold text-muted-foreground mb-1">
              <FileText className="size-3.5" />
              <span>Instruksi / Catatan Tambahan</span>
            </div>
            <p className="text-foreground whitespace-pre-wrap">{receipt.notes}</p>
          </div>
        )}

        {/* Receipt Policy & Footer */}
        <div className="border-t border-border pt-4 text-center space-y-1.5 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground">
            Terima kasih atas kepercayaan Anda mempercayakan busana Anda kepada {receipt.boutique.name}.
          </p>
          <p>
            Harap simpan tanda terima ini sebagai bukti saat fitting dan pengambilan pakaian.
          </p>
          <div className="text-[10px] text-muted-foreground/70 pt-2 border-t border-border/40 flex justify-between items-center">
            <span>JahitFlow Boutique OS</span>
            <span>Waktu Cetak: {formatDateTime(receipt.generatedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
