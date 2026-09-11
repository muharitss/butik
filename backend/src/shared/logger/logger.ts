import type { Request, Response, NextFunction } from "express";

export type LogLevel = "info" | "warn" | "error" | "debug";

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apikey",
  "apisecret",
  "authorization",
  "cookie",
  "signature",
  "cloudinary_url",
  "database_url"
]);

/**
 * Recursively redacts sensitive keys and values from logging metadata.
 */
export function sanitizeMeta(data: unknown, depth = 0): unknown {
  if (depth > 5 || data === null || data === undefined) {
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMeta(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeMeta(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function outputLog(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  // In test environment, keep console clean unless debug is forced
  if (process.env.NODE_ENV === "test" && !process.env.DEBUG_TESTS) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: sanitizeMeta(meta) } : {})
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    outputLog("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    outputLog("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>): void {
    outputLog("error", message, meta);
  },
  debug(message: string, meta?: Record<string, unknown>): void {
    outputLog("debug", message, meta);
  }
};

/**
 * Express middleware for structured HTTP access logging.
 * Logs method, route, status code, and latency in milliseconds.
 * Strictly avoids logging request bodies to protect customer PII and sensitive inputs.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const statusCode = res.statusCode;

    const meta: Record<string, unknown> = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs
    };

    if (statusCode >= 500) {
      logger.error("HTTP Request Error", meta);
    } else if (statusCode >= 400) {
      logger.warn("HTTP Client Error", meta);
    } else {
      logger.info("HTTP Request Completed", meta);
    }
  });

  next();
}
