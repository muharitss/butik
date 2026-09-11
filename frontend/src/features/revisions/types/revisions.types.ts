export type RevisionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';

export interface Revision {
  id: string;
  orderId: string;
  fittingId: string | null;
  issue: string;
  requestedChange: string | null;
  status: RevisionStatus;
  notes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRevisionInput {
  fittingId?: string | null;
  issue: string;
  requestedChange?: string | null;
  notes?: string | null;
}

export interface UpdateRevisionInput {
  status?: RevisionStatus;
  notes?: string | null;
  requestedChange?: string | null;
  resolvedAt?: string | null;
}

export interface RevisionTransitionMeta {
  remainingOpenRevisions?: number;
  allRevisionsResolved?: boolean;
}
