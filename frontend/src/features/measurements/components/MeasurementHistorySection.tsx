import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  History,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import type { MeasurementVersion } from '../types/measurements.types.ts';
import { getFieldInfo } from '../constants/vocabulary.ts';

interface MeasurementHistorySectionProps {
  versions: MeasurementVersion[];
}

export const MeasurementHistorySection: React.FC<MeasurementHistorySectionProps> = ({
  versions,
}) => {
  // Store expanded version IDs (default: newest is expanded if <= 2 versions, collapsed if more)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(versions.length <= 2 ? versions.map((v) => v.id) : [versions[0]?.id].filter(Boolean))
  );

  if (versions.length === 0) {
    return null;
  }

  const latestVersionNumber = Math.max(...versions.map((v) => v.versionNumber));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  return (
    <Card id="measurement-history-section">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <History className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Riwayat Versi Ukuran Badan
              </CardTitle>
              <CardDescription className="text-xs">
                Arsip perubahan ukuran bersifat permanen (immutable) untuk rekam jejak pesanan
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {versions.length} Versi
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-1">
        {versions.map((ver) => {
          const isCurrent = ver.versionNumber === latestVersionNumber;
          const isExpanded = expandedIds.has(ver.id);

          return (
            <div
              key={ver.id}
              className={`rounded-lg border transition-colors ${
                isCurrent
                  ? 'border-primary/30 bg-card'
                  : 'border-border bg-card/60'
              }`}
              id={`measurement-version-${ver.versionNumber}`}
            >
              {/* Version Row Header / Toggle */}
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2 cursor-pointer hover:bg-muted/30 select-none rounded-lg"
                onClick={() => toggleExpand(ver.id)}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-base font-bold text-foreground">
                      Versi {ver.versionNumber}
                    </span>
                    {isCurrent && (
                      <Badge variant="default" className="text-[11px] h-5 gap-1">
                        <CheckCircle2 className="size-3" />
                        Terkini (Aktif)
                      </Badge>
                    )}
                    {ver.label && (
                      <Badge variant="outline" className="text-[11px] h-5 gap-1">
                        <Tag className="size-2.5 text-muted-foreground" />
                        {ver.label}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      • {ver.values.length} Bidang
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    <span>Diukur: {formatDate(ver.measuredAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(ver.id);
                    }}
                    id={`btn-toggle-version-${ver.versionNumber}`}
                  >
                    {isExpanded ? (
                      <>
                        <span>Tutup</span>
                        <ChevronUp className="size-4" />
                      </>
                    ) : (
                      <>
                        <span>Lihat Ukuran</span>
                        <ChevronDown className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Expandable Values Grid */}
              {isExpanded && (
                <div className="border-t border-border/70 p-3.5 space-y-3 bg-muted/10 rounded-b-lg">
                  {ver.notes && (
                    <div className="rounded-md bg-muted/40 p-2 text-xs text-foreground flex items-start gap-1.5 border border-border/40">
                      <FileText className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-muted-foreground text-[11px]">
                          Catatan:
                        </span>{' '}
                        <span>{ver.notes}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {ver.values.map((v) => {
                      const info = getFieldInfo(v.fieldKey);
                      return (
                        <div
                          key={v.id || v.fieldKey}
                          className="rounded-md border border-border/80 bg-background p-2"
                        >
                          <p className="text-[11px] text-muted-foreground truncate" title={info.label}>
                            {info.label}
                          </p>
                          <p className="mt-0.5 font-medium text-foreground text-sm flex items-baseline gap-1">
                            <span className="font-bold">{String(v.value)}</span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              {v.unit}
                            </span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
