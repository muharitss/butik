import React from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import { Button, buttonVariants } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Clock,
  Ruler,
  ExternalLink,
  User,
  Phone,
  MessageSquare,
  FileText,
  CreditCard,
} from 'lucide-react';
import { formatFullDate, formatEventTime } from '../lib/calendar.utils.ts';
import type { CalendarEvent } from '../types/calendar.types.ts';

interface CalendarEventDetailDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CalendarEventDetailDialog: React.FC<CalendarEventDetailDialogProps> = ({
  event,
  open,
  onOpenChange,
}) => {
  if (!event) return null;

  const isDeadline = event.type === 'deadline';
  const fullDate = formatFullDate(event.date);
  const time = formatEventTime(event.date);

  // Clean phone number for WhatsApp deep link if valid
  const cleanPhone = event.customerPhone ? event.customerPhone.replace(/\D/g, '') : null;
  const waPhone = cleanPhone?.startsWith('0')
    ? `62${cleanPhone.slice(1)}`
    : cleanPhone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`p-1.5 rounded-md ${
                isDeadline
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {isDeadline ? <Clock className="h-4 w-4" /> : <Ruler className="h-4 w-4" />}
            </div>
            <DialogTitle className="text-base font-semibold">
              {isDeadline ? 'Order Deadline' : `Fitting #${event.fittingNumber}`}
            </DialogTitle>
            <Badge
              variant={isDeadline ? 'default' : 'secondary'}
              className="ml-auto text-[10px] px-2 py-0.5"
            >
              {event.status}
            </Badge>
          </div>
          <DialogDescription>
            {isDeadline
              ? 'Target promised delivery date for customer order.'
              : 'Scheduled garment fitting consultation session.'}
          </DialogDescription>
        </DialogHeader>

        {/* Content Details */}
        <div className="flex flex-col gap-3 py-2 text-sm">
          {/* Order reference */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
            <div>
              <span className="text-xs text-muted-foreground block">Order Number</span>
              <span className="font-semibold font-heading text-base text-foreground">
                {event.orderNumber}
              </span>
            </div>
            <Link
              to={`/orders/${event.orderId}`}
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-xs flex items-center gap-1' })}
            >
              Open Order
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Date & Time */}
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-xs text-muted-foreground block">Date & Time</span>
              <span className="font-medium text-foreground">
                {fullDate} {time ? `at ${time}` : ''}
              </span>
            </div>
          </div>

          {/* Customer info */}
          <div className="flex items-start gap-2.5">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="w-full">
              <span className="text-xs text-muted-foreground block">Customer</span>
              <span className="font-medium text-foreground">{event.customerName}</span>
              {event.customerPhone && (
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {event.customerPhone}
                  </span>
                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      <MessageSquare className="h-3 w-3" />
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Financial info (for orders) */}
          {event.total && (
            <div className="flex items-start gap-2.5">
              <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-xs text-muted-foreground block">Order Total & Payment</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-medium text-foreground">
                    Rp {Number(event.total).toLocaleString('id-ID')}
                  </span>
                  {event.paymentStatus && (
                    <Badge variant="outline" className="text-[10px]">
                      {event.paymentStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes (for fittings) */}
          {event.notes && (
            <div className="flex items-start gap-2.5">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-xs text-muted-foreground block">Fitting Notes</span>
                <p className="text-xs text-foreground bg-muted/40 p-2 rounded-md mt-1 italic">
                  {event.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>
          <Link
            to={`/orders/${event.orderId}`}
            className={buttonVariants({ variant: 'default', size: 'default', className: 'text-xs' })}
          >
            View Full Order
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
