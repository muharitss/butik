import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { sendError } from "../http/response.js";
import { AppError } from "./appError.js";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // Fallback for unhandled unexpected errors
  console.error("Unhandled error:", err);
  sendError(res, "INTERNAL_ERROR", "An unexpected error occurred", 500);
};
