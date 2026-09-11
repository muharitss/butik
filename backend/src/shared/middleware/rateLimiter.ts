import type { Request, Response, NextFunction } from "express";
import { sendError } from "../http/response.js";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// ponytail: In-memory sliding/fixed window map for single-instance boutique deployment.
// Bounded memory usage with periodic stale record cleanup.
// Upgrade path: Redis-backed store (e.g. ioredis + lua script) if multi-instance horizontal scaling is needed.
const writeLimits = new Map<string, RateLimitRecord>();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_WRITES = 120; // 120 writes per 15 minutes per IP

// Periodically clean up expired entries every 5 minutes to prevent memory leak
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of writeLimits.entries()) {
    if (now >= record.resetTime) {
      writeLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

export function resetRateLimits(): void {
  writeLimits.clear();
}

export function rateLimitWrites(
  options: { windowMs?: number; max?: number } = {}
) {
  const windowMs = options.windowMs ?? (Number(process.env.RATE_LIMIT_WINDOW_MS) || DEFAULT_WINDOW_MS);
  const max = options.max ?? (Number(process.env.RATE_LIMIT_MAX_WRITES) || DEFAULT_MAX_WRITES);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Bypass rate limiting during test executions
    if (process.env.NODE_ENV === "test") {
      next();
      return;
    }

    // Only apply rate limiting to mutating operations
    const mutatingMethods = ["POST", "PATCH", "PUT", "DELETE"];
    if (!mutatingMethods.includes(req.method.toUpperCase())) {
      next();
      return;
    }

    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : undefined) ||
      req.ip ||
      req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    const record = writeLimits.get(ip);

    if (!record || now >= record.resetTime) {
      writeLimits.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (record.count >= max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));
      sendError(
        res,
        "RATE_LIMIT_EXCEEDED",
        "Too many write requests. Please try again later.",
        429
      );
      return;
    }

    record.count += 1;
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));
    next();
  };
}
