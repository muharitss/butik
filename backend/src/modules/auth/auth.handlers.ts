import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { sendSuccess, sendError } from "../../shared/http/response.js";
import type { LoginInput } from "./auth.schemas.js";
import {
  SESSION_COOKIE_NAME,
  verifyPassword,
  signSessionToken,
  getSessionCookieOptions
} from "./auth.service.js";

const GENERIC_AUTH_ERROR_MESSAGE = "Invalid email or password";

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Inactive user or missing passwordHash returns identical generic 401
    if (!user || !user.passwordHash || !user.isActive) {
      sendError(res, "UNAUTHORIZED", GENERIC_AUTH_ERROR_MESSAGE, 401);
      return;
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      sendError(res, "UNAUTHORIZED", GENERIC_AUTH_ERROR_MESSAGE, 401);
      return;
    }

    const token = await signSessionToken({
      userId: user.id,
      role: user.role
    });

    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    sendSuccess(res, {
      id: user.id,
      name: user.name,
      role: user.role
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/"
    });

    sendSuccess(res, { loggedOut: true });
  } catch (err) {
    next(err);
  }
}

export async function meHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actorId) {
      sendError(res, "UNAUTHORIZED", "Authentication required", 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.actorId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      sendError(res, "UNAUTHORIZED", "User not found or inactive", 401);
      return;
    }

    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
