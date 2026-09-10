export interface GarmentMeasurementField {
  id: string;
  garmentTypeId: string;
  fieldKey: string;
  label: string;
  unit: string;
  isRequired: boolean;
  sortOrder: number;
}

export interface GarmentType {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  measurementFields: GarmentMeasurementField[];
}

export interface GarmentMeasurementFieldInput {
  fieldKey: string;
  label: string;
  unit: string;
  isRequired: boolean;
  sortOrder: number;
}

export interface CreateGarmentTypeInput {
  name: string;
  description?: string | null;
  isActive?: boolean;
  measurementFields?: GarmentMeasurementFieldInput[];
}

export interface UpdateGarmentTypeInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  measurementFields?: GarmentMeasurementFieldInput[];
}
