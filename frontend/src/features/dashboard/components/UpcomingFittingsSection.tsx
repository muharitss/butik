import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.tsx';
import { buttonVariants } from '@/components/ui/button.tsx';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table.tsx';
import {
  CalendarDays,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import type { DashboardFittingSummary } from '../types/dashboard.types.ts';
import { formatDateTime } from '@/features/orders/constants/orderRules.ts';

interface UpcomingFittingsSectionProps {
  fittings: DashboardFittingSummary[];
  daysWindow: number;
}

export const UpcomingFittingsSection: React.FC<UpcomingFittingsSectionProps> = ({
  fittings,
  daysWindow,
}) => {
  return (
    <Card id="section-upcoming-fittings">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Upcoming Fittings (Next {daysWindow} Days)
              </CardTitle>
              <CardDescription>
                Client fitting sessions and try-on appointments
              </CardDescription>
            </div>
          </div>
          <Link to="/fittings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            All Fittings <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {fittings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">No fittings scheduled in this window.</p>
            <p className="text-xs">Schedule new fittings from an order in production or fitting status.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fitting #</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Scheduled Time</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[80px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fittings.map((fitting) => (
                <TableRow key={fitting.id} id={`row-fitting-${fitting.id}`}>
                  <TableCell className="font-medium">
                    Fitting {fitting.fittingNumber}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/orders/${fitting.orderId}`}
                      className="hover:underline flex items-center gap-1 font-semibold text-foreground"
                    >
                      {fitting.orderNumber}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{fitting.customerName}</div>
                    {fitting.customerPhone && (
                      <div className="text-xs text-muted-foreground">{fitting.customerPhone}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium">
                      {formatDateTime(fitting.scheduledAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground italic truncate max-w-[150px] inline-block">
                      {fitting.notes || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={`/orders/${fitting.orderId}`}
                      className={buttonVariants({ variant: 'ghost', size: 'xs' })}
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
