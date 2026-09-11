import { apiClient } from '../../../lib/apiClient.ts';
import type { DashboardQueryParams, DashboardSummaryResponse } from '../types/dashboard.types.ts';

export async function fetchDashboardSummary(
  params?: DashboardQueryParams
): Promise<DashboardSummaryResponse> {
  const searchParams = new URLSearchParams();
  if (params?.dueSoonDays !== undefined) {
    searchParams.set('dueSoonDays', String(params.dueSoonDays));
  }
  if (params?.fittingsDays !== undefined) {
    searchParams.set('fittingsDays', String(params.fittingsDays));
  }
  if (params?.recentLimit !== undefined) {
    searchParams.set('recentLimit', String(params.recentLimit));
  }

  const queryString = searchParams.toString();
  const endpoint = queryString ? `/dashboard/summary?${queryString}` : '/dashboard/summary';
  return apiClient.get<DashboardSummaryResponse>(endpoint);
}
