import { z } from "zod";

export const reportsSummaryQuerySchema = z
  .object({
    from: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid 'from' date format. Expected ISO-8601 or YYYY-MM-DD."
      })
      .optional(),
    to: z
      .string()
      .trim()
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
  );

export type ReportsSummaryQueryParams = z.infer<typeof reportsSummaryQuerySchema>;
