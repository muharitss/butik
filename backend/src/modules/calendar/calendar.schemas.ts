import { z } from "zod";

export const calendarEventsQuerySchema = z
  .object({
    from: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid 'from' date format. Expected ISO-8601 or YYYY-MM-DD."
      })
      .optional(),
    to: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid 'to' date format. Expected ISO-8601 or YYYY-MM-DD."
      })
      .optional()
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from).getTime() <= new Date(data.to).getTime();
      }
      return true;
    },
    {
      message: "'from' date must be earlier than or equal to 'to' date",
      path: ["from"]
    }
  )
  .refine(
    (data) => {
      if (data.from && data.to) {
        const diffMs = new Date(data.to).getTime() - new Date(data.from).getTime();
        const maxRangeMs = 366 * 24 * 60 * 60 * 1000;
        return diffMs <= maxRangeMs;
      }
      return true;
    },
    {
      message: "Query range exceeds maximum allowable span of 366 days",
      path: ["to"]
    }
  );

export type CalendarEventsQueryParams = z.infer<typeof calendarEventsQuerySchema>;

export type CalendarEventType = "deadline" | "fitting";

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
