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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Plus,
  Trash2,
  Sparkles,
  Copy,
  AlertTriangle,
  Loader2,
  Ruler,
  Calendar,
} from 'lucide-react';
import type {
  MeasurementVersion,
  CreateMeasurementVersionInput,
  MeasurementValueInput,
} from '../types/measurements.types.ts';
import {
  MEASUREMENT_VOCABULARY,
  MEASUREMENT_PRESETS,
  getFieldInfo,
} from '../constants/vocabulary.ts';
import { createMeasurementVersion } from '../api/measurements.api.ts';

interface MeasurementRow {
  fieldKey: string;
  value: string;
  unit: string;
}

interface MeasurementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  currentVersion?: MeasurementVersion | null;
  onSuccess: (newVersion: MeasurementVersion) => void;
}

// Format local datetime for datetime-local input (YYYY-MM-DDTHH:mm)
function getLocalDateTimeString(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

export const MeasurementFormDialog: React.FC<MeasurementFormDialogProps> = ({
  open,
  onOpenChange,
  customerId,
  customerName,
  currentVersion,
  onSuccess,
}) => {
  const nextVersionNumber = currentVersion ? currentVersion.versionNumber + 1 : 1;

  const [measuredAt, setMeasuredAt] = useState<string>(getLocalDateTimeString());
  const [label, setLabel] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [rows, setRows] = useState<MeasurementRow[]>([]);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setMeasuredAt(getLocalDateTimeString());
      setLabel('');
      setNotes('');
      setSelectedFieldKey('');

      // If no measurements exist yet, pre-populate default 'atasan' fields for convenience
      if (!currentVersion || currentVersion.values.length === 0) {
        const atasanPreset = MEASUREMENT_PRESETS.find((p) => p.id === 'atasan');
        if (atasanPreset) {
          setRows(
            atasanPreset.fieldKeys.map((key) => {
              const info = getFieldInfo(key);
              return {
                fieldKey: key,
                value: '',
                unit: info.unit,
              };
            })
          );
        } else {
          setRows([]);
        }
      } else {
        // Start with empty rows when previous exists, user can use preset or "Salin dari Versi N"
        setRows([]);
      }
    }
  }, [open, currentVersion]);

  // Apply a preset template
  const handleApplyPreset = (presetId: string) => {
    const preset = MEASUREMENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    // Merge: retain existing values if matching, append new fields
    const currentMap = new Map<string, string>(rows.map((r) => [r.fieldKey, r.value]));
    const newRows: MeasurementRow[] = preset.fieldKeys.map((key) => {
      const info = getFieldInfo(key);
      return {
        fieldKey: key,
        value: currentMap.get(key) || '',
        unit: info.unit,
      };
    });

    setRows(newRows);
  };

  // Copy values from current active version (useful for corrections)
  const handleCopyFromCurrent = () => {
    if (!currentVersion || !currentVersion.values.length) return;

    setRows(
      currentVersion.values.map((v) => ({
        fieldKey: v.fieldKey,
        value: String(v.value),
        unit: v.unit,
      }))
    );

    if (!label) {
      setLabel(`Koreksi Versi ${currentVersion.versionNumber}`);
    }
  };

  // Add a specific field from vocabulary
  const handleAddField = () => {
    if (!selectedFieldKey) return;
    if (rows.some((r) => r.fieldKey === selectedFieldKey)) {
      return; // Already added
    }

    const info = getFieldInfo(selectedFieldKey);
    setRows((prev) => [
      ...prev,
      {
        fieldKey: selectedFieldKey,
        value: '',
        unit: info.unit,
      },
    ]);
    setSelectedFieldKey('');
  };

  // Update value for a row
  const handleValueChange = (index: number, val: string) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: val };
      return updated;
    });
  };

  // Remove a row
  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Available fields for dropdown (excluding already added)
  const availableFields = MEASUREMENT_VOCABULARY.filter(
    (vocab) => !rows.some((r) => r.fieldKey === vocab.key)
  );

  // Group available fields by category
  const categories = [
    { id: 'atasan', name: 'Atasan / Kemeja' },
    { id: 'bawahan', name: 'Bawahan / Celana' },
    { id: 'gaun', name: 'Gaun / Gamis' },
    { id: 'umum', name: 'Umum / Lainnya' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate date
    if (!measuredAt) {
      setError('Tanggal pengukuran wajib diisi.');
      return;
    }

    // Filter filled rows
    const filledRows = rows.filter((r) => r.value.trim().length > 0);

    if (filledRows.length === 0) {
      setError('Minimal harus mengisi 1 nilai ukuran badan yang valid.');
      return;
    }

    // Parse and validate numbers
    const valuesPayload: MeasurementValueInput[] = [];
    for (const row of filledRows) {
      const num = parseFloat(row.value);
      if (isNaN(num) || num <= 0) {
        const info = getFieldInfo(row.fieldKey);
        setError(`Nilai ukuran untuk "${info.label}" harus berupa angka positif lebih dari 0.`);
        return;
      }
      if (num > 9999.99) {
        const info = getFieldInfo(row.fieldKey);
        setError(`Nilai ukuran untuk "${info.label}" melebihi batas maksimum 9999.99.`);
        return;
      }

      valuesPayload.push({
        fieldKey: row.fieldKey,
        value: num,
        unit: row.unit || 'cm',
      });
    }

    // Check unique field keys
    const keys = valuesPayload.map((v) => v.fieldKey);
    if (new Set(keys).size !== keys.length) {
      setError('Terdapat bidang ukuran ganda dalam satu versi.');
      return;
    }

    const payload: CreateMeasurementVersionInput = {
      measuredAt: new Date(measuredAt).toISOString(),
      label: label.trim().length > 0 ? label.trim() : null,
      notes: notes.trim().length > 0 ? notes.trim() : null,
      values: valuesPayload,
    };

    setSubmitting(true);
    try {
      const created = await createMeasurementVersion(customerId, payload);
      onSuccess(created);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan data ukuran badan. Pastikan data sudah benar.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="measurement-form-dialog"
        className="max-h-[90vh] overflow-y-auto max-w-2xl sm:max-w-2xl"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Ruler className="size-5" />
            </div>
            <div>
              <DialogTitle className="font-heading text-xl font-bold">
                Catat Ukuran Badan
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pelanggan: <span className="font-medium text-foreground">{customerName}</span> • Menghasilkan{' '}
                <Badge variant="secondary" className="text-[11px] font-semibold">
                  Versi {nextVersionNumber}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-xs font-semibold">Gagal Menyimpan</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label htmlFor="measured-at-input" className="text-xs font-medium flex items-center gap-1">
                <Calendar className="size-3.5 text-muted-foreground" /> Tanggal & Waktu Pengukuran
              </Label>
              <Input
                id="measured-at-input"
                type="datetime-local"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                required
                disabled={submitting}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="measurement-label-input" className="text-xs font-medium">
                Label / Sesi (Opsional)
              </Label>
              <Input
                id="measurement-label-input"
                placeholder="Contoh: Fitting Awal, Pre-Wedding, Koreksi"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={100}
                disabled={submitting}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="measurement-notes-input" className="text-xs font-medium">
                Catatan Penjahit (Opsional)
              </Label>
              <Textarea
                id="measurement-notes-input"
                placeholder="Catatan postur khusus, kelonggaran yang diinginkan, atau alasan koreksi..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                disabled={submitting}
                className="text-xs"
              />
            </div>
          </div>

          {/* Quick Presets & Copy Section */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3.5 text-primary" /> Template Ukuran Cepat:
              </span>

              {currentVersion && currentVersion.values.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="gap-1 text-xs text-primary border-primary/30 hover:bg-primary/10"
                  onClick={handleCopyFromCurrent}
                  disabled={submitting}
                  id="btn-copy-from-current"
                >
                  <Copy className="size-3" />
                  Salin dari Versi {currentVersion.versionNumber}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {MEASUREMENT_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant="secondary"
                  size="xs"
                  className="text-xs"
                  onClick={() => handleApplyPreset(preset.id)}
                  disabled={submitting}
                  title={preset.description}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Measurement Fields List */}
          <div className="border-t border-border pt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">Daftar Bidang Ukuran</Label>
                <Badge variant="outline" className="text-[11px]">
                  {rows.length} Bidang
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Kosongkan bidang yang tidak diukur
              </span>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Belum ada bidang ukuran yang dipilih.
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  Pilih salah satu template di atas atau tambahkan bidang ukuran di bawah ini.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {rows.map((row, idx) => {
                  const info = getFieldInfo(row.fieldKey);
                  return (
                    <div
                      key={row.fieldKey}
                      className="flex items-center gap-2 p-2 rounded-md border border-border bg-card/60"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {info.label}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">
                          {row.fieldKey}
                        </p>
                      </div>

                      <div className="w-28 flex items-center gap-1.5">
                        <Input
                          type="number"
                          step="any"
                          min="0.1"
                          max="9999.99"
                          inputMode="decimal"
                          placeholder="0.0"
                          value={row.value}
                          onChange={(e) => handleValueChange(idx, e.target.value)}
                          className="h-8 text-xs font-semibold text-right"
                          disabled={submitting}
                          id={`input-measure-${row.fieldKey}`}
                        />
                        <span className="text-xs text-muted-foreground font-medium shrink-0">
                          {row.unit}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="size-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={submitting}
                        title="Hapus bidang ini"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add More Fields Dropdown */}
            {availableFields.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={selectedFieldKey}
                  onChange={(e) => setSelectedFieldKey(e.target.value)}
                  disabled={submitting}
                  className="h-8 flex-1 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  id="select-add-field-key"
                >
                  <option value="">+ Pilih bidang ukuran untuk ditambahkan...</option>
                  {categories.map((cat) => {
                    const fieldsInCat = availableFields.filter((f) => f.category === cat.id);
                    if (fieldsInCat.length === 0) return null;
                    return (
                      <optgroup key={cat.id} label={cat.name}>
                        {fieldsInCat.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label} ({f.unit})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddField}
                  disabled={!selectedFieldKey || submitting}
                  className="h-8 text-xs shrink-0"
                  id="btn-add-field"
                >
                  <Plus className="size-3.5 mr-1" /> Tambah
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border pt-3 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              id="btn-save-measurement"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              {submitting ? 'Menyimpan...' : 'Simpan Ukuran Versi ' + nextVersionNumber}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
