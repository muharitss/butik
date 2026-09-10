import { apiClient } from '../../../lib/apiClient.ts';
import { ApiClientError } from '../../../types/api.ts';
import type {
  MeasurementVersion,
  CreateMeasurementVersionInput,
} from '../types/measurements.types.ts';

/**
 * Fetches the customer's current (latest) measurement version with all its values.
 * Returns `null` if the customer does not have any recorded measurement versions yet (404 NOT_FOUND).
 */
export async function fetchCurrentMeasurement(
  customerId: string
): Promise<MeasurementVersion | null> {
  try {
    return await apiClient.get<MeasurementVersion>(
      `/customers/${customerId}/measurements/current`
    );
  } catch (err: unknown) {
    if (err instanceof ApiClientError && err.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Fetches all measurement versions for a customer, newest first.
 */
export async function fetchMeasurementHistory(
  customerId: string
): Promise<MeasurementVersion[]> {
  return apiClient.get<MeasurementVersion[]>(
    `/customers/${customerId}/measurements`
  );
}

/**
 * Creates a new measurement version (and its values) for a customer.
 * Each save is immutable and creates a new version number (versionNumber = max + 1).
 */
export async function createMeasurementVersion(
  customerId: string,
  input: CreateMeasurementVersionInput
): Promise<MeasurementVersion> {
  return apiClient.post<MeasurementVersion>(
    `/customers/${customerId}/measurements`,
    input
  );
}
