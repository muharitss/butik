export interface DashboardMetrics {
  activeOrdersCount: number;
  activeOrdersByStatus: Record<string, number>;
  dueSoonCount: number;
  dueSoonDays: number;
  overdueCount: number;
  readyForPickupCount: number;
  upcomingFittingsCount: number;
  upcomingFittingsDays: number;
  unpaidOrPartialCount: number;
  totalOutstandingBalance: string;
}

export interface DashboardOrderSummary {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  status: string;
  deadlineAt?: string | null;
  total: string;
  paidTotal: string;
  remainingBalance: string;
  paymentStatus: string;
  createdAt?: string | null;
}

export interface DashboardFittingSummary {
  id: string;
  fittingNumber: number;
  scheduledAt?: string | null;
  status: string;
  notes?: string | null;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
}

export interface DashboardSummaryResponse {
  metrics: DashboardMetrics;
  dueSoonOrders: DashboardOrderSummary[];
  overdueOrders: DashboardOrderSummary[];
  readyOrders: DashboardOrderSummary[];
  upcomingFittings: DashboardFittingSummary[];
  unpaidOrders: DashboardOrderSummary[];
  recentOrders: DashboardOrderSummary[];
}

export interface DashboardQueryParams {
  dueSoonDays?: number;
  fittingsDays?: number;
  recentLimit?: number;
}
