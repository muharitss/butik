import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { sendError } from "../http/response.js";
import { AppError } from "./appError.js";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Domain/App Errors
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message
    }));
    sendError(res, "VALIDATION_ERROR", "Validation failed", 400, details);
    return;
  }

  // Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const target = Array.isArray(err.meta?.target)
          ? (err.meta.target as string[]).join(", ")
          : "field";
        sendError(res, "CONFLICT", `Unique constraint violation on ${target}`, 409);
        return;
      }
      case "P2025": {
        const cause = typeof err.meta?.cause === "string" ? err.meta.cause : "Record not found";
        sendError(res, "NOT_FOUND", cause, 404);
        return;
      }
      case "P2003": {
        sendError(res, "CONFLICT", "Foreign key constraint violation", 409);
        return;
      }
      default:
        // Other Prisma errors fall through to internal error
        break;
    }
  }

  // Express JSON parser body syntax error
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as { status?: number }).status === 400
  ) {
    sendError(res, "VALIDATION_ERROR", "Invalid JSON payload", 400);
    return;
  }

  // Fallback for unhandled unexpected errors
  console.error("Unhandled error:", err);
  sendError(res, "INTERNAL_ERROR", "An unexpected error occurred", 500);
};
