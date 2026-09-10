/**
 * Measurement module type definitions matching backend schemas and API envelopes.
 */

export interface MeasurementValue {
  id: string;
  measurementVersionId: string;
  fieldKey: string;
  value: number | string; // serialized Decimal from Prisma can be string or number in JSON
  unit: string;
}

export interface MeasurementVersion {
  id: string;
  customerId: string;
  versionNumber: number;
  measuredAt: string; // ISO date string
  label?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string; // ISO date string
  values: MeasurementValue[];
}

export interface MeasurementValueInput {
  fieldKey: string;
  value: number;
  unit: string;
}

export interface CreateMeasurementVersionInput {
  measuredAt: string;
  label?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  values: MeasurementValueInput[];
}

export interface VocabularyField {
  key: string;
  label: string;
  unit: string;
  category: 'atasan' | 'bawahan' | 'gaun' | 'umum';
}

export interface MeasurementPreset {
  id: string;
  label: string;
  description: string;
  fieldKeys: string[];
}
