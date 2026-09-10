import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import {
  AppError,
  ValidationError,
  NotFoundError,
  BusinessRuleViolationError,
  ConflictError,
  InternalError,
  errorHandler
} from "./index.js";

// Helper to create mock Express response
function createMockResponse() {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res as Response;
  };
  res.json = (payload: unknown) => {
    res.body = payload;
    return res as Response;
  };
  return res as Response & {
    statusCode: number;
    body: { error: { code: string; message: string; details?: unknown[] } };
  };
}

const mockReq = {} as Request;
const mockNext = () => {};

test("error classes instantiate with correct defaults per API.md table", () => {
  const base = new AppError("Base error", 500, "INTERNAL_ERROR");
  assert.equal(base.statusCode, 500);
  assert.equal(base.code, "INTERNAL_ERROR");

  const validation = new ValidationError("Invalid field", [{ field: "name", message: "Required" }]);
  assert.ok(validation instanceof AppError);
  assert.equal(validation.statusCode, 400);
  assert.equal(validation.code, "VALIDATION_ERROR");
  assert.equal(validation.message, "Invalid field");
  assert.deepEqual(validation.details, [{ field: "name", message: "Required" }]);

  const notFound = new NotFoundError("Customer not found");
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.code, "NOT_FOUND");
  assert.equal(notFound.message, "Customer not found");

  const businessRule = new BusinessRuleViolationError(
    "Cannot transition from CANCELLED to COMPLETED"
  );
  assert.equal(businessRule.statusCode, 409);
  assert.equal(businessRule.code, "BUSINESS_RULE_VIOLATION");

  const conflict = new ConflictError("Customer is inactive");
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.code, "CONFLICT");

  const internal = new InternalError();
  assert.equal(internal.statusCode, 500);
  assert.equal(internal.code, "INTERNAL_ERROR");
});

test("errorHandler correctly shapes AppError responses", () => {
  const res = createMockResponse();
  const error = new BusinessRuleViolationError("Illegal operation");

  errorHandler(error, mockReq, res, mockNext);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "BUSINESS_RULE_VIOLATION");
  assert.equal(res.body.error.message, "Illegal operation");
});

test("errorHandler maps ZodError to VALIDATION_ERROR with field details", () => {
  const res = createMockResponse();
  const schema = z.object({
    name: z.string().min(3),
    age: z.number().int().positive()
  });

  const parseResult = schema.safeParse({ name: "a", age: -5 });
  assert.equal(parseResult.success, false);

  if (!parseResult.success) {
    errorHandler(parseResult.error, mockReq, res, mockNext);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
    assert.equal(res.body.error.message, "Validation failed");
    assert.ok(Array.isArray(res.body.error.details));
    assert.equal(res.body.error.details?.length, 2);
    assert.equal((res.body.error.details?.[0] as { field: string }).field, "name");
    assert.equal((res.body.error.details?.[1] as { field: string }).field, "age");
  }
});

test("errorHandler maps Prisma P2002 to CONFLICT", () => {
  const res = createMockResponse();
  const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.19.3",
    meta: { target: ["phone"] }
  });

  errorHandler(prismaError, mockReq, res, mockNext);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "CONFLICT");
  assert.ok(res.body.error.message.includes("phone"));
});

test("errorHandler maps Prisma P2025 to NOT_FOUND", () => {
  const res = createMockResponse();
  const prismaError = new Prisma.PrismaClientKnownRequestError("Record to update not found", {
    code: "P2025",
    clientVersion: "6.19.3",
    meta: { cause: "Record to update not found." }
  });

  errorHandler(prismaError, mockReq, res, mockNext);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, "NOT_FOUND");
});

test("errorHandler maps unhandled error to INTERNAL_ERROR 500", () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const res = createMockResponse();
    const unexpected = new Error("Database network failure");

    errorHandler(unexpected, mockReq, res, mockNext);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, "INTERNAL_ERROR");
    assert.equal(res.body.error.message, "An unexpected error occurred");
  } finally {
    console.error = originalConsoleError;
  }
});
