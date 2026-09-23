export interface ReportsSummary {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: string;
  totalCollected: string;
  outstandingBalance: string;
  newCustomers: number;
}

export interface ReportsSummaryQueryParams {
  from?: string;
  to?: string;
}

export type DateRangePreset = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL_TIME' | 'CUSTOM';
