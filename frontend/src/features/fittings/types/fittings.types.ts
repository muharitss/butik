export type FittingStatus = 'SCHEDULED' | 'DONE' | 'CANCELLED';

export type FittingResult = 'APPROVED' | 'NEEDS_REVISION';

export interface Fitting {
  id: string;
  orderId: string;
  fittingNumber: number;
  status: FittingStatus;
  scheduledAt: string | null;
  occurredAt: string | null;
  result: FittingResult | null;
  notes: string | null;
  nextAction: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFittingInput {
  scheduledAt?: string | null;
  notes?: string | null;
}

export interface UpdateFittingInput {
  status?: FittingStatus;
  scheduledAt?: string | null;
  occurredAt?: string | null;
  result?: FittingResult | null;
  notes?: string | null;
  nextAction?: string | null;
}
