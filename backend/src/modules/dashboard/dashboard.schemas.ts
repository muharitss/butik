import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
  dueSoonDays: z.coerce.number().int().min(1).max(365).default(7),
  fittingsDays: z.coerce.number().int().min(1).max(365).default(7),
  recentLimit: z.coerce.number().int().min(1).max(50).default(5)
});

export type DashboardSummaryQueryParams = z.infer<typeof dashboardSummaryQuerySchema>;
