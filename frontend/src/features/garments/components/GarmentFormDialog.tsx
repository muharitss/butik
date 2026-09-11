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
    label: 'Top / Shirt',
    fields: [
      { fieldKey: 'chest', label: 'Chest Circumference', unit: 'cm', isRequired: true, sortOrder: 0 },
      { fieldKey: 'shirt_length', label: 'Shirt Length', unit: 'cm', isRequired: true, sortOrder: 1 },
      { fieldKey: 'shoulder_width', label: 'Shoulder Width', unit: 'cm', isRequired: true, sortOrder: 2 },
      { fieldKey: 'sleeve_length', label: 'Sleeve Length', unit: 'cm', isRequired: true, sortOrder: 3 },
      { fieldKey: 'neck_circumference', label: 'Neck Circumference', unit: 'cm', isRequired: false, sortOrder: 4 },
    ],
  },
  bawahan: {
    label: 'Pants / Skirt',
    fields: [
      { fieldKey: 'waist', label: 'Waist Circumference', unit: 'cm', isRequired: true, sortOrder: 0 },
      { fieldKey: 'hip', label: 'Hip Circumference', unit: 'cm', isRequired: true, sortOrder: 1 },
      { fieldKey: 'pants_length', label: 'Pants Length', unit: 'cm', isRequired: true, sortOrder: 2 },
      { fieldKey: 'thigh', label: 'Thigh Circumference', unit: 'cm', isRequired: false, sortOrder: 3 },
      { fieldKey: 'crotch', label: 'Crotch / Rise', unit: 'cm', isRequired: false, sortOrder: 4 },
    ],
  },
  gamis: {
    label: 'Dress / Gown',
    fields: [
      { fieldKey: 'chest', label: 'Chest Circumference', unit: 'cm', isRequired: true, sortOrder: 0 },
      { fieldKey: 'waist', label: 'Waist Circumference', unit: 'cm', isRequired: true, sortOrder: 1 },
      { fieldKey: 'hip', label: 'Hip Circumference', unit: 'cm', isRequired: true, sortOrder: 2 },
      { fieldKey: 'dress_length', label: 'Dress Length', unit: 'cm', isRequired: true, sortOrder: 3 },
      { fieldKey: 'shoulder_width', label: 'Shoulder Width', unit: 'cm', isRequired: true, sortOrder: 4 },
      { fieldKey: 'sleeve_length', label: 'Sleeve Length', unit: 'cm', isRequired: true, sortOrder: 5 },
      { fieldKey: 'armhole', label: 'Armhole Circumference', unit: 'cm', isRequired: false, sortOrder: 6 },
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
      setError('Garment type name is required.');
      return;
    }

    // Validate fields
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.label.trim()) {
        setError(`Field label on row #${i + 1} is required.`);
        return;
      }
      if (!f.fieldKey.trim()) {
        setError(`Field key on row #${i + 1} is required.`);
        return;
      }
      if (!/^[a-z0-9_]+$/.test(f.fieldKey.trim())) {
        setError(
          `Field key "${f.fieldKey}" on row #${i + 1} must contain only lowercase letters, numbers, and underscores (_).`
        );
        return;
      }
      if (!f.unit.trim()) {
        setError(`Measurement unit on row #${i + 1} is required (e.g., cm).`);
        return;
      }
    }

    // Check duplicate keys
    const keys = fields.map((f) => f.fieldKey.trim().toLowerCase());
    const duplicateKey = keys.find((key, idx) => keys.indexOf(key) !== idx);
    if (duplicateKey) {
      setError(`Duplicate field key "${duplicateKey}". Each measurement field must have a unique key.`);
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
      setError(err instanceof Error ? err.message : 'Failed to save garment type');
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
                {isEditing ? 'Edit Garment Type' : 'Add New Garment Type'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure the garment model and body measurement specifications required during order creation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Section: Main Info */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="garment-name" className="text-sm font-medium">
                Garment Type Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="garment-name"
                placeholder="e.g. Modern Kebaya, Men's Formal Suit, Evening Gown"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="garment-description" className="text-sm font-medium">
                Description / Additional Notes (Optional)
              </Label>
              <Textarea
                id="garment-description"
                placeholder="Detailed info about the garment model or tailor notes..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Section: Measurement Fields */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  Body Measurement Fields
                  <Badge variant="secondary" className="text-xs">
                    {fields.length} {fields.length === 1 ? 'Field' : 'Fields'}
                  </Badge>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Measurement fields required or suggested when customers order this garment type.
                </p>
              </div>

              {/* Template quick loader */}
              {!isEditing && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Templates:
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
                  No measurement fields added yet.
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Select a template above or click the button below to add fields manually.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={handleAddField}
                  disabled={submitting}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Measurement Field
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                  <div className="sm:col-span-4">Field Label</div>
                  <div className="sm:col-span-3">Field Key</div>
                  <div className="sm:col-span-2">Unit</div>
                  <div className="sm:col-span-2 text-center">Required?</div>
                  <div className="sm:col-span-1 text-right">Actions</div>
                </div>

                {fields.map((field, idx) => (
                  <div
                    key={idx}
                    className="p-3 sm:p-2 rounded-lg border border-border bg-card/60 flex flex-col sm:grid sm:grid-cols-12 gap-2 items-start sm:items-center"
                  >
                    {/* Label */}
                    <div className="w-full sm:col-span-4">
                      <Input
                        placeholder="e.g. Chest Circumference"
                        value={field.label}
                        onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                        className="h-8 text-xs"
                        disabled={submitting}
                      />
                    </div>

                    {/* Field Key */}
                    <div className="w-full sm:col-span-3">
                      <Input
                        placeholder="chest"
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
                        {field.isRequired ? 'Required' : 'Optional'}
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
                        title="Move up"
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
                        title="Move down"
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
                        title="Delete field"
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
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Measurement Field
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
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Save Garment Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
