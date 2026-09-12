import bcrypt from "bcryptjs";
import * as jose from "jose";
import type { SessionTokenPayload } from "./auth.schemas.js";

const DEFAULT_JWT_SECRET = "super-secret-jwt-key-minimum-32-chars-for-jahitflow-boutique";
const BCRYPT_SALT_ROUNDS = 12;

export const SESSION_COOKIE_NAME = "jahitflow_session";

function getJwtSecret(): Uint8Array {
  const secretStr = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  return new TextEncoder().encode(secretStr);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(
  payload: SessionTokenPayload,
  expiresIn = "1h"
): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionTokenPayload> {
  const { payload } = await jose.jwtVerify(token, getJwtSecret());
  return {
    userId: payload.userId as string,
    role: payload.role as string
  };
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

export function getSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const ttlMs = Number(process.env.SESSION_TTL_MS) || 60 * 60 * 1000;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    maxAge: ttlMs,
    path: "/"
  };
}
