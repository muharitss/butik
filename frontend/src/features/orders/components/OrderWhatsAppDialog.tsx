import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { Order } from '../types/orders.types.ts';
import {
  fetchWhatsappLink,
  type WhatsappTemplate,
  type WhatsappLinkResult,
} from '../api/orders.api.ts';

interface OrderWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
}

const TEMPLATE_OPTIONS: { id: WhatsappTemplate; label: string; desc: string }[] = [
  {
    id: 'confirmation',
    label: 'Konfirmasi Pesanan',
    desc: 'Kirim rincian nota & estimasi selesai',
  },
  {
    id: 'ready',
    label: 'Siap Diambil',
    desc: 'Kabar pesanan selesai & siap diambil/fitting',
  },
  {
    id: 'payment_reminder',
    label: 'Pengingat Tagihan',
    desc: 'Informasi sisa pembayaran & batas waktu',
  },
];

export const OrderWhatsAppDialog: React.FC<OrderWhatsAppDialogProps> = ({
  open,
  onOpenChange,
  order,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsappTemplate>('confirmation');
  const [data, setData] = useState<WhatsappLinkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasPhone = Boolean(order.customer?.phone && order.customer.phone.trim().length > 0);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }

    if (!hasPhone) {
      setError('Pelanggan ini belum memiliki nomor telepon / WhatsApp yang tercatat.');
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchWhatsappLink(order.id, selectedTemplate)
      .then((res) => {
        if (isMounted) {
          setData(res);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Gagal menghasilkan template pesan WhatsApp'
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, selectedTemplate, order.id, hasPhone]);

  const handleCopy = async () => {
    if (!data?.message) return;
    try {
      await navigator.clipboard.writeText(data.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleOpenWhatsApp = () => {
    if (!data?.url) return;
    window.open(data.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" id="dialog-order-whatsapp">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Kirim Pesan WhatsApp</DialogTitle>
              <DialogDescription>
                Pilih template pesan untuk pelanggan {order.customer?.name || 'ini'}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipient Information */}
          <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border text-xs">
            <div className="space-y-0.5">
              <span className="text-muted-foreground block">Penerima Pesan:</span>
              <span className="font-semibold text-foreground">
                {order.customer?.name || 'Pelanggan'}
              </span>
            </div>
            <div>
              {hasPhone ? (
                <Badge variant="secondary" className="font-mono text-xs">
                  {order.customer?.phone}
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  Tidak Ada Nomor
                </Badge>
              )}
            </div>
          </div>

          {!hasPhone ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Nomor Telepon Tidak Tersedia</AlertTitle>
              <AlertDescription className="text-xs">
                Pesanan ini terhubung dengan pelanggan yang belum memiliki nomor telepon. Silakan
                perbarui nomor telepon pelanggan terlebih dahulu untuk mengirim pesan WhatsApp.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Template Selection */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-foreground block">Pilih Template:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {TEMPLATE_OPTIONS.map((tmpl) => {
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        className={`flex flex-col items-start p-2.5 text-left rounded-md border text-xs transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary'
                            : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <span className="font-semibold text-foreground">{tmpl.label}</span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {tmpl.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Preview Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Pratinjau Pesan:</span>
                  {data && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      title="Salin teks pesan ke clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Salin Teks</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="relative rounded-md border border-border bg-muted/30 p-3 min-h-[140px] max-h-[220px] overflow-y-auto">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-xs text-xs text-muted-foreground gap-2">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      <span>Menyiapkan template...</span>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-destructive gap-1.5">
                      <AlertTriangle className="size-4" />
                      <span>{error}</span>
                    </div>
                  ) : data ? (
                    <pre className="text-xs text-foreground font-sans whitespace-pre-wrap break-words leading-relaxed select-text">
                      {data.message}
                    </pre>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-6">
                      Pilih template untuk melihat pratinjau pesan.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            id="btn-close-whatsapp-dialog"
          >
            Tutup
          </Button>

          {hasPhone && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={loading || !data}
                id="btn-copy-whatsapp-text"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 mr-1 text-emerald-600" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 mr-1" />
                    Salin Teks
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleOpenWhatsApp}
                disabled={loading || !data?.url}
                id="btn-open-whatsapp-link"
                className="font-medium"
              >
                <ExternalLink className="size-3.5 mr-1.5" />
                Buka WhatsApp
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
