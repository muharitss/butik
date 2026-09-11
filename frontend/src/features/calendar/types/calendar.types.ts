export type CalendarEventType = 'deadline' | 'fitting';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  date: string;
  title: string;
  status: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  fittingId?: string;
  fittingNumber?: number;
  notes?: string | null;
  total?: string;
  paymentStatus?: string;
}

export interface CalendarEventsMeta {
  from: string;
  to: string;
  count: number;
  deadlinesCount: number;
  fittingsCount: number;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  meta: CalendarEventsMeta;
}

export type CalendarFilterType = 'ALL' | 'DEADLINES' | 'FITTINGS';
export type CalendarViewMode = 'month' | 'list';
