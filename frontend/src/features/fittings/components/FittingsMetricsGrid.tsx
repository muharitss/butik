import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Scissors, CheckCircle2 } from 'lucide-react';

export interface FittingsMetrics {
  scheduledFittingsCount: number;
  inProgressOrdersCount: number;
  inRevisionOrdersCount: number;
  approvedFittingsCount: number;
}

interface FittingsMetricsGridProps {
  metrics: FittingsMetrics;
}

export const FittingsMetricsGrid: React.FC<FittingsMetricsGridProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="fittings-metrics-grid">
      {/* Metric 1: Scheduled Appointments */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            Scheduled Trials
          </CardTitle>
          <Calendar className="size-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-xl font-bold text-foreground">
            {metrics.scheduledFittingsCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Upcoming fitting sessions awaiting trial
          </p>
        </CardContent>
      </Card>

      {/* Metric 2: Ready for First Trial */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            In Production
          </CardTitle>
          <Clock className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-xl font-bold text-foreground">
            {metrics.inProgressOrdersCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Bespoke orders in progress requiring fitting
          </p>
        </CardContent>
      </Card>

      {/* Metric 3: In Alteration / Revision */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            Under Revision
          </CardTitle>
          <Scissors className="size-4 text-destructive" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-xl font-bold text-destructive">
            {metrics.inRevisionOrdersCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Garments requiring tailor adjustments
          </p>
        </CardContent>
      </Card>

      {/* Metric 4: Approved Fits */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            Approved Fits
          </CardTitle>
          <CheckCircle2 className="size-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-mono text-xl font-bold text-primary">
            {metrics.approvedFittingsCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Fitting trials verified and approved
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
