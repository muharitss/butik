import React, { useEffect, useState, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { MeasurementVersion } from '../types/measurements.types.ts';
import { fetchMeasurementHistory, fetchCurrentMeasurement } from '../api/measurements.api.ts';
import { CurrentMeasurementCard } from './CurrentMeasurementCard.tsx';
import { MeasurementHistorySection } from './MeasurementHistorySection.tsx';
import { MeasurementFormDialog } from './MeasurementFormDialog.tsx';

interface CustomerMeasurementsSectionProps {
  customerId: string;
  customerName: string;
}

export const CustomerMeasurementsSection: React.FC<CustomerMeasurementsSectionProps> = ({
  customerId,
  customerName,
}) => {
  const [currentVersion, setCurrentVersion] = useState<MeasurementVersion | null>(null);
  const [history, setHistory] = useState<MeasurementVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const loadMeasurements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both current version and full history in parallel
      const [current, allVersions] = await Promise.all([
        fetchCurrentMeasurement(customerId),
        fetchMeasurementHistory(customerId),
      ]);

      setCurrentVersion(current);
      setHistory(allVersions || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data ukuran badan pelanggan'
      );
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadMeasurements();
  }, [loadMeasurements]);

  const handleMeasurementCreated = (newVersion: MeasurementVersion) => {
    setCurrentVersion(newVersion);
    setHistory((prev) => [newVersion, ...prev.filter((v) => v.id !== newVersion.id)]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 rounded-lg border border-border bg-card text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" />
        <span className="text-sm">Memuat data ukuran badan...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Kesalahan</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="outline"
            size="xs"
            onClick={loadMeasurements}
            className="ml-4 gap-1 text-xs"
          >
            <RefreshCw className="size-3" /> Coba Lagi
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4" id={`customer-measurements-section-${customerId}`}>
      {/* Prominent Current Measurement Summary */}
      <CurrentMeasurementCard
        currentVersion={currentVersion}
        onOpenCreateDialog={() => setDialogOpen(true)}
      />

      {/* Expandable History of Past Versions */}
      <MeasurementHistorySection versions={history} />

      {/* Measurement Entry Dialog */}
      <MeasurementFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customerId={customerId}
        customerName={customerName}
        currentVersion={currentVersion}
        onSuccess={handleMeasurementCreated}
      />
    </div>
  );
};
