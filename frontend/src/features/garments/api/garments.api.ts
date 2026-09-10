import { apiClient } from '../../../lib/apiClient.ts';
import type {
  GarmentType,
  CreateGarmentTypeInput,
  UpdateGarmentTypeInput
} from '../types/garments.types.ts';

export async function fetchGarmentTypes(params: {
  includeInactive?: boolean;
  q?: string;
} = {}): Promise<GarmentType[]> {
  const query = new URLSearchParams();
  if (params.includeInactive) {
    query.set('includeInactive', 'true');
  }
  if (params.q && params.q.trim().length > 0) {
    query.set('q', params.q.trim());
  }

  const qs = query.toString();
  const endpoint = qs ? `/garment-types?${qs}` : '/garment-types';

  return apiClient.get<GarmentType[]>(endpoint);
}

export async function fetchGarmentType(id: string): Promise<GarmentType> {
  return apiClient.get<GarmentType>(`/garment-types/${id}`);
}

export async function createGarmentType(input: CreateGarmentTypeInput): Promise<GarmentType> {
  return apiClient.post<GarmentType>('/garment-types', input);
}

export async function updateGarmentType(
  id: string,
  input: UpdateGarmentTypeInput
): Promise<GarmentType> {
  return apiClient.patch<GarmentType>(`/garment-types/${id}`, input);
}

export async function deactivateGarmentType(id: string): Promise<GarmentType> {
  return apiClient.patch<GarmentType>(`/garment-types/${id}/deactivate`);
}
