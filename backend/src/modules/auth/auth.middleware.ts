import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { sendError } from "../../shared/http/response.js";
import {
  SESSION_COOKIE_NAME,
  parseCookies,
  verifySessionToken
} from "./auth.service.js";

// ponytail: In-memory sliding/fixed window map for login attempts.
// 10 attempts per 15 minutes per IP. Upgrade path: Redis-backed store if scaled horizontally.
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const loginLimits = new Map<string, RateLimitRecord>();

const DEFAULT_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_LOGIN_MAX = 10; // 10 attempts per 15 min per IP

export function resetLoginRateLimits(): void {
  loginLimits.clear();
}

export function rateLimitLogin(options: { windowMs?: number; max?: number } = {}) {
  const windowMs = options.windowMs ?? (Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || DEFAULT_LOGIN_WINDOW_MS);
  const max = options.max ?? (Number(process.env.RATE_LIMIT_LOGIN_MAX) || DEFAULT_LOGIN_MAX);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Bypass rate limiter in test environment unless specifically testing rate limiting
    if (process.env.NODE_ENV === "test" && !options.max) {
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
    const record = loginLimits.get(ip);

    if (!record || now >= record.resetTime) {
      loginLimits.set(ip, { count: 1, resetTime: now + windowMs });
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
        "Too many login attempts. Please try again later.",
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

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    let token = cookies[SESSION_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
      sendError(res, "UNAUTHORIZED", "Authentication required", 401);
      return;
    }

    let payload;
    try {
      payload = await verifySessionToken(token);
    } catch {
      sendError(res, "UNAUTHORIZED", "Invalid or expired session token", 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      sendError(res, "UNAUTHORIZED", "User not found or inactive", 401);
      return;
    }

    req.actorId = user.id;
    req.userRole = user.role;
    next();
  } catch (err) {
    next(err);
  }
}
