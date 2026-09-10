export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown[];

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR", details?: unknown[]) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown[]) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class BusinessRuleViolationError extends AppError {
  constructor(message = "Business rule violation", details?: unknown[]) {
    super(message, 409, "BUSINESS_RULE_VIOLATION", details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict with current state of resource", details?: unknown[]) {
    super(message, 409, "CONFLICT", details);
  }
}

export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred") {
    super(message, 500, "INTERNAL_ERROR");
  }
}
