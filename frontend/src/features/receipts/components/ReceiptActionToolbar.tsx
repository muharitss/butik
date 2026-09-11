import React from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Printer,
  ArrowLeft,
  Share2,
  Check,
  RotateCw,
} from 'lucide-react';
import type { ReceiptDTO } from '../types/receipts.types.ts';
import { formatCurrency } from '../constants/receiptRules.ts';

interface ReceiptActionToolbarProps {
  receipt: ReceiptDTO;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const ReceiptActionToolbar: React.FC<ReceiptActionToolbarProps> = ({
  receipt,
  onRefresh,
  refreshing = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = async () => {
    try {
      const summaryText = [
        `*${receipt.boutique.name} - ORDER RECEIPT*`,
        `Order No: ${receipt.orderNumber}`,
        `Customer: ${receipt.customer.name}`,
        `Total: ${formatCurrency(receipt.totals.total)}`,
        `Paid: ${formatCurrency(receipt.paymentsSummary.paidTotal)}`,
        `Balance: ${formatCurrency(receipt.paymentsSummary.remainingBalance)}`,
        `Status: ${receipt.status}`,
      ].join('\n');

      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      id="receipt-action-toolbar"
      className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/40 border border-border rounded-lg p-3 sm:p-4 max-w-3xl mx-auto shadow-xs"
    >
      <div className="flex items-center gap-2">
        <Link
          to={`/orders/${receipt.orderId}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          id="btn-back-to-order"
        >
          <ArrowLeft className="size-3.5 mr-1.5" />
          Order Details
        </Link>
        <Link
          to="/receipts"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          id="btn-all-receipts"
        >
          All Receipts
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            id="btn-refresh-receipt"
            title="Reload Receipt Data"
          >
            <RotateCw className={`size-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopySummary}
          id="btn-copy-receipt-summary"
        >
          {copied ? (
            <>
              <Check className="size-3.5 mr-1.5 text-emerald-600" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="size-3.5 mr-1.5" />
              Copy Summary
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handlePrint}
          id="btn-trigger-print"
          className="font-semibold shadow-xs"
        >
          <Printer className="size-3.5 mr-1.5" />
          Print Receipt / PDF
        </Button>
      </div>
    </div>
  );
};
