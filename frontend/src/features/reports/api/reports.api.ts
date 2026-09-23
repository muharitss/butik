import { apiClient } from '../../../lib/apiClient.ts';
import type { ReportsSummary, ReportsSummaryQueryParams } from '../types/reports.types.ts';

export async function fetchReportsSummary(
  params: ReportsSummaryQueryParams = {}
): Promise<ReportsSummary> {
  const query = new URLSearchParams();
  if (params.from && params.from.trim().length > 0) {
    query.set('from', params.from.trim());
  }
  if (params.to && params.to.trim().length > 0) {
    query.set('to', params.to.trim());
  }

  const qs = query.toString();
  const endpoint = qs ? `/reports/summary?${qs}` : '/reports/summary';

  return apiClient.get<ReportsSummary>(endpoint);
}
