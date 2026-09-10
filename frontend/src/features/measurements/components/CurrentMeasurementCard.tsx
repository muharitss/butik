import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ruler, Plus, Calendar, Tag, FileText, CheckCircle2 } from 'lucide-react';
import type { MeasurementVersion } from '../types/measurements.types.ts';
import { getFieldInfo } from '../constants/vocabulary.ts';

interface CurrentMeasurementCardProps {
  currentVersion: MeasurementVersion | null;
  onOpenCreateDialog: () => void;
}

export const CurrentMeasurementCard: React.FC<CurrentMeasurementCardProps> = ({
  currentVersion,
  onOpenCreateDialog,
}) => {
  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  // Empty state if no measurement version exists yet
  if (!currentVersion) {
    return (
      <Card className="border-dashed" id="current-measurement-empty-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Ruler className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Ukuran Badan Terkini
                </CardTitle>
                <CardDescription className="text-xs">
                  Profil ukuran badan aktif untuk pesanan jahit
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={onOpenCreateDialog}
              id="btn-create-first-measurement"
              className="w-full sm:w-auto"
            >
              <Plus className="size-3.5 mr-1.5" />
              Catat Ukuran Pertama
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground bg-muted/10">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-2">
              <Ruler className="size-6 text-muted-foreground/80" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Belum ada ukuran badan tersimpan
            </p>
            <p className="mt-1 text-xs max-w-sm text-muted-foreground">
              Pelanggan ini belum memiliki catatan ukuran badan. Catat ukuran badan pertama
              sebagai acuan pembuatan pola dan pesanan jahit.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="current-measurement-card" className="border-primary/20 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
              <Ruler className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base font-semibold">
                  Ukuran Badan Terkini
                </CardTitle>
                <Badge variant="default" className="text-xs font-semibold gap-1">
                  <CheckCircle2 className="size-3" />
                  Versi {currentVersion.versionNumber} (Aktif)
                </Badge>
                {currentVersion.label && (
                  <Badge variant="outline" className="text-xs font-normal gap-1">
                    <Tag className="size-3 text-muted-foreground" />
                    {currentVersion.label}
                  </Badge>
                )}
              </div>
              <CardDescription className="flex items-center gap-1.5 text-xs mt-1">
                <Calendar className="size-3.5 text-muted-foreground" />
                Diukur pada: {formatDate(currentVersion.measuredAt)}
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onOpenCreateDialog}
            id="btn-create-new-version"
            className="w-full sm:w-auto text-xs shrink-0"
          >
            <Plus className="size-3.5 mr-1" />
            Catat Ukuran Baru / Koreksi
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Tailor Notes */}
        {currentVersion.notes && (
          <div className="rounded-md bg-muted/40 p-2.5 text-xs text-foreground flex items-start gap-2 border border-border/50">
            <FileText className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-semibold text-muted-foreground text-[11px] block">
                Catatan Penjahit:
              </span>
              <p className="whitespace-pre-wrap">{currentVersion.notes}</p>
            </div>
          </div>
        )}

        {/* Measurement Grid */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {currentVersion.values.map((item) => {
              const info = getFieldInfo(item.fieldKey);
              return (
                <div
                  key={item.id || item.fieldKey}
                  className="rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-primary/40"
                >
                  <p className="text-[11px] font-medium text-muted-foreground truncate" title={info.label}>
                    {info.label}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-heading text-xl font-bold tracking-tight text-foreground">
                      {String(item.value)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
