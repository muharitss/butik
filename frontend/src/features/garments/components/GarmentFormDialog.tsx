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
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertCircle,
  Loader2,
  Scissors,
} from 'lucide-react';
import type {
  GarmentType,
  GarmentMeasurementFieldInput,
  CreateGarmentTypeInput,
  UpdateGarmentTypeInput,
} from '../types/garments.types.ts';
import { createGarmentType, updateGarmentType } from '../api/garments.api.ts';

interface GarmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  garmentTypeToEdit?: GarmentType | null;
  onSuccess: (saved: GarmentType) => void;
}

const TEMPLATES: Record<string, { label: string; fields: GarmentMeasurementFieldInput[] }> = {
  atasan: {
    label: 'Atasan / Kemeja',
    fields: [
      { fieldKey: 'lingkar_dada', label: 'Lingkar Dada', unit: 'cm', isRequired: true, sortOrder: 0 },
      { fieldKey: 'panjang_baju', label: 'Panjang Baju', unit: 'cm', isRequired: true, sortOrder: 1 },
      { fieldKey: 'lebar_bahu', label: 'Lebar Bahu', unit: 'cm', isRequired: true, sortOrder: 2 },
      { fieldKey: 'panjang_lengan', label: 'Panjang Lengan', unit: 'cm', isRequired: true, sortOrder: 3 },
      { fieldKey: 'lingkar_leher', label: 'Lingkar Leher', unit: 'cm', isRequired: false, sortOrder: 4 },
    ],
  },
  bawahan: {
    label: 'Celana / Rok',
    fields: [
      { fieldKey: 'lingkar_pinggang', label: 'Lingkar Pinggang', unit: 'cm', isRequired: true, sortOrder: 0 },
      { fieldKey: 'lingkar_pinggul', label: 'Lingkar Pinggul', unit: 'cm', isRequired: true, sortOrder: 1 },
      { fieldKey: 'panjang_celana', label: 'Panjang Celana', unit: 'cm', isRequired: true, sortOrder: 2 },
      { fieldKey: 'lingkar_paha', label: 'Lingkar Paha', unit: 'cm', isRequired: false, sortOrder: 3 },
      { fieldKey: 'pesak', label: 'Tinggi Pesak', unit: 'cm', isRequired: false, sortOrder: 4 },
    ],
  },
  gamis: {
    label: 'Gamis / Gaun / Kebaya',
    fields: [
      { fieldKey: 'lingkar_dada', label: 'Lingkar Dada', unit: 'cm', isRequired: true, sortOrder: 0 },
      { fieldKey: 'lingkar_pinggang', label: 'Lingkar Pinggang', unit: 'cm', isRequired: true, sortOrder: 1 },
      { fieldKey: 'lingkar_pinggul', label: 'Lingkar Pinggul', unit: 'cm', isRequired: true, sortOrder: 2 },
      { fieldKey: 'panjang_gaun', label: 'Panjang Gaun', unit: 'cm', isRequired: true, sortOrder: 3 },
      { fieldKey: 'lebar_bahu', label: 'Lebar Bahu', unit: 'cm', isRequired: true, sortOrder: 4 },
      { fieldKey: 'panjang_lengan', label: 'Panjang Lengan', unit: 'cm', isRequired: true, sortOrder: 5 },
      { fieldKey: 'lingkar_kerung_lengan', label: 'Lingkar Kerung Lengan', unit: 'cm', isRequired: false, sortOrder: 6 },
    ],
  },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s-]+/g, '_');
}

export const GarmentFormDialog: React.FC<GarmentFormDialogProps> = ({
  open,
  onOpenChange,
  garmentTypeToEdit,
  onSuccess,
}) => {
  const isEditing = Boolean(garmentTypeToEdit);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<GarmentMeasurementFieldInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when dialog opens or garmentTypeToEdit changes
  useEffect(() => {
    if (open) {
      setError(null);
      if (garmentTypeToEdit) {
        setName(garmentTypeToEdit.name);
        setDescription(garmentTypeToEdit.description || '');
        setFields(
          (garmentTypeToEdit.measurementFields || []).map((f) => ({
            fieldKey: f.fieldKey,
            label: f.label,
            unit: f.unit,
            isRequired: f.isRequired,
            sortOrder: f.sortOrder,
          }))
        );
      } else {
        setName('');
        setDescription('');
        setFields([]);
      }
    }
  }, [open, garmentTypeToEdit]);

  const handleAddField = () => {
    setFields((prev) => [
      ...prev,
      {
        fieldKey: '',
        label: '',
        unit: 'cm',
        isRequired: true,
        sortOrder: prev.length,
      },
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) =>
      prev.filter((_, i) => i !== index).map((f, idx) => ({ ...f, sortOrder: idx }))
    );
  };

  const handleFieldChange = (
    index: number,
    key: keyof GarmentMeasurementFieldInput,
    val: unknown
  ) => {
    setFields((prev) => {
      const next = [...prev];
      const target = { ...next[index], [key]: val };

      // Auto-suggest fieldKey from label if fieldKey was empty or matches previous auto-slug
      if (key === 'label' && typeof val === 'string') {
        const currentSlug = slugify(next[index].label);
        if (!next[index].fieldKey || next[index].fieldKey === currentSlug) {
          target.fieldKey = slugify(val);
        }
      }

      next[index] = target;
      return next;
    });
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    setFields((prev) => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;

      return next.map((f, idx) => ({ ...f, sortOrder: idx }));
    });
  };

  const handleApplyTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey];
    if (!template) return;
    setFields(template.fields.map((f, idx) => ({ ...f, sortOrder: idx })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Nama tipe busana wajib diisi.');
      return;
    }

    // Validate fields
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.label.trim()) {
        setError(`Label bidang ukuran pada baris #${i + 1} wajib diisi.`);
        return;
      }
      if (!f.fieldKey.trim()) {
        setError(`Kunci bidang (field key) pada baris #${i + 1} wajib diisi.`);
        return;
      }
      if (!/^[a-z0-9_]+$/.test(f.fieldKey.trim())) {
        setError(
          `Kunci bidang "${f.fieldKey}" pada baris #${i + 1} harus berupa huruf kecil, angka, dan garis bawah (_).`
        );
        return;
      }
      if (!f.unit.trim()) {
        setError(`Satuan ukuran pada baris #${i + 1} wajib diisi (misal: cm).`);
        return;
      }
    }

    // Check duplicate keys
    const keys = fields.map((f) => f.fieldKey.trim().toLowerCase());
    const duplicateKey = keys.find((key, idx) => keys.indexOf(key) !== idx);
    if (duplicateKey) {
      setError(`Kunci bidang "${duplicateKey}" terduplikasi. Setiap bidang harus memiliki kunci unik.`);
      return;
    }

    setSubmitting(true);
    try {
      const sanitizedFields: GarmentMeasurementFieldInput[] = fields.map((f, idx) => ({
        fieldKey: f.fieldKey.trim().toLowerCase(),
        label: f.label.trim(),
        unit: f.unit.trim(),
        isRequired: Boolean(f.isRequired),
        sortOrder: idx,
      }));

      let result: GarmentType;
      if (isEditing && garmentTypeToEdit) {
        const updateInput: UpdateGarmentTypeInput = {
          name: trimmedName,
          description: description.trim() || null,
          measurementFields: sanitizedFields,
        };
        result = await updateGarmentType(garmentTypeToEdit.id, updateInput);
      } else {
        const createInput: CreateGarmentTypeInput = {
          name: trimmedName,
          description: description.trim() || null,
          measurementFields: sanitizedFields,
        };
        result = await createGarmentType(createInput);
      }

      onSuccess(result);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan tipe busana');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-heading text-xl">
                {isEditing ? 'Ubah Tipe Busana' : 'Tambah Tipe Busana Baru'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Konfigurasi model busana serta spesifikasi bidang ukuran badan yang diperlukan saat pemesanan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Terjadi Kesalahan</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Section: Info Utama */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="garment-name" className="text-sm font-medium">
                Nama Tipe Busana <span className="text-destructive">*</span>
              </Label>
              <Input
                id="garment-name"
                placeholder="Contoh: Kebaya Modern, Jas Pria Formal, Gamis Syar'i"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="garment-description" className="text-sm font-medium">
                Deskripsi / Catatan Tambahan (Opsional)
              </Label>
              <Textarea
                id="garment-description"
                placeholder="Informasi detail mengenai model busana atau catatan penjahit..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Section: Bidang Ukuran */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  Daftar Bidang Ukuran Badan
                  <Badge variant="secondary" className="text-xs">
                    {fields.length} Bidang
                  </Badge>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bidang ukuran yang wajib diisi atau disarankan ketika pelanggan memesan tipe busana ini.
                </p>
              </div>

              {/* Template quick loader */}
              {!isEditing && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Template:
                  </span>
                  {Object.entries(TEMPLATES).map(([key, item]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => handleApplyTemplate(key)}
                      disabled={submitting}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Field Table / List */}
            {fields.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  Belum ada bidang ukuran yang ditambahkan.
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Pilih salah satu template di atas atau klik tombol di bawah untuk menambah manual.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={handleAddField}
                  disabled={submitting}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Bidang Ukuran
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                  <div className="sm:col-span-4">Label Bidang (Tampilan)</div>
                  <div className="sm:col-span-3">Kunci (Key)</div>
                  <div className="sm:col-span-2">Satuan</div>
                  <div className="sm:col-span-2 text-center">Status</div>
                  <div className="sm:col-span-1 text-right">Aksi</div>
                </div>

                {fields.map((field, idx) => (
                  <div
                    key={idx}
                    className="p-3 sm:p-2 rounded-lg border border-border bg-card/60 flex flex-col sm:grid sm:grid-cols-12 gap-2 items-start sm:items-center"
                  >
                    {/* Label */}
                    <div className="w-full sm:col-span-4">
                      <Input
                        placeholder="Contoh: Lingkar Dada"
                        value={field.label}
                        onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                        className="h-8 text-xs"
                        disabled={submitting}
                      />
                    </div>

                    {/* Field Key */}
                    <div className="w-full sm:col-span-3">
                      <Input
                        placeholder="lingkar_dada"
                        value={field.fieldKey}
                        onChange={(e) => handleFieldChange(idx, 'fieldKey', slugify(e.target.value))}
                        className="h-8 text-xs font-mono"
                        disabled={submitting}
                      />
                    </div>

                    {/* Unit */}
                    <div className="w-full sm:col-span-2">
                      <Input
                        placeholder="cm"
                        value={field.unit}
                        onChange={(e) => handleFieldChange(idx, 'unit', e.target.value)}
                        className="h-8 text-xs text-center"
                        disabled={submitting}
                      />
                    </div>

                    {/* IsRequired toggle button */}
                    <div className="w-full sm:col-span-2 flex justify-center">
                      <Button
                        type="button"
                        variant={field.isRequired ? 'default' : 'secondary'}
                        size="sm"
                        className="h-8 text-xs w-full px-2"
                        onClick={() => handleFieldChange(idx, 'isRequired', !field.isRequired)}
                        disabled={submitting}
                      >
                        {field.isRequired ? 'Wajib' : 'Opsional'}
                      </Button>
                    </div>

                    {/* Actions: Reorder & Remove */}
                    <div className="w-full sm:col-span-1 flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleMoveField(idx, 'up')}
                        disabled={idx === 0 || submitting}
                        title="Pindah ke atas"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleMoveField(idx, 'down')}
                        disabled={idx === fields.length - 1 || submitting}
                        title="Pindah ke bawah"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveField(idx)}
                        disabled={submitting}
                        title="Hapus bidang"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 mt-2"
                  onClick={handleAddField}
                  disabled={submitting}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Baris Bidang Ukuran
                </Button>
              </div>
            )}
          </div>
        </form>

        <DialogFooter className="p-4 border-t border-border bg-card flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isEditing ? 'Simpan Perubahan' : 'Simpan Tipe Busana'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
