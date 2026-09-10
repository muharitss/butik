import type { Response } from "express";

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown>,
  statusCode = 200
): Response {
  const payload: ApiResponse<T> = { data };
  if (meta !== undefined) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 500,
  details?: unknown[]
): Response {
  const payload: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details !== undefined && details.length > 0 ? { details } : {})
    }
  };
  return res.status(statusCode).json(payload);
}
