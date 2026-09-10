/**
 * API types matching JahitFlow API.md and backend shared/http conventions.
 */

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown[];
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown[];

  constructor(code: string, message: string, statusCode: number, details?: unknown[]) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
