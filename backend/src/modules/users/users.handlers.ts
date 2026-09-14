import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { sendSuccess, sendError } from "../../shared/http/response.js";
import { hashPassword } from "../auth/auth.service.js";
import {
  USER_SAFE_SELECT,
  type CreateUserInput,
  type UpdateUserInput,
  type ResetPasswordInput
} from "./users.schemas.js";

export async function listUsersHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: USER_SAFE_SELECT,
      orderBy: { createdAt: "desc" }
    });

    sendSuccess(res, users);
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, phone, role, temporaryPassword } = req.body as CreateUserInput;

    const normalizedEmail = email && email.trim() ? email.trim().toLowerCase() : null;

    if (normalizedEmail) {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
      if (existing) {
        sendError(res, "CONFLICT", "User with this email already exists", 409);
        return;
      }
    }

    const passwordHash = await hashPassword(temporaryPassword);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: phone && phone.trim() ? phone.trim() : null,
        role,
        passwordHash,
        isActive: true
      },
      select: USER_SAFE_SELECT
    });

    sendSuccess(res, user, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body as UpdateUserInput;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT
    });

    if (!existingUser) {
      sendError(res, "NOT_FOUND", "User not found", 404);
      return;
    }

    // Business rule: Cannot demote the only active owner to staff
    if (role === "staff" && existingUser.role === "owner" && existingUser.isActive) {
      const activeOwners = await prisma.user.count({
        where: { role: "owner", isActive: true }
      });
      if (activeOwners <= 1) {
        sendError(
          res,
          "BUSINESS_RULE_VIOLATION",
          "Cannot demote the only active owner",
          409
        );
        return;
      }
    }

    const updateData: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      role?: string;
    } = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email && email.trim() ? email.trim().toLowerCase() : null;
      if (normalizedEmail && normalizedEmail !== existingUser.email) {
        const conflict = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        });
        if (conflict) {
          sendError(res, "CONFLICT", "User with this email already exists", 409);
          return;
        }
      }
      updateData.email = normalizedEmail;
    }

    if (phone !== undefined) {
      updateData.phone = phone && phone.trim() ? phone.trim() : null;
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SAFE_SELECT
    });

    sendSuccess(res, updatedUser);
  } catch (err) {
    next(err);
  }
}

export async function deactivateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Safety guard: Owner cannot deactivate themselves
    if (req.actorId === id) {
      sendError(res, "CONFLICT", "Cannot deactivate your own account", 409);
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT
    });

    if (!existingUser) {
      sendError(res, "NOT_FOUND", "User not found", 404);
      return;
    }

    // Safety guard: Cannot deactivate the only active owner
    if (existingUser.role === "owner" && existingUser.isActive) {
      const activeOwners = await prisma.user.count({
        where: { role: "owner", isActive: true }
      });
      if (activeOwners <= 1) {
        sendError(
          res,
          "BUSINESS_RULE_VIOLATION",
          "Cannot deactivate the only active owner",
          409
        );
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SAFE_SELECT
    });

    sendSuccess(res, updatedUser);
  } catch (err) {
    next(err);
  }
}

export async function activateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT
    });

    if (!existingUser) {
      sendError(res, "NOT_FOUND", "User not found", 404);
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: USER_SAFE_SELECT
    });

    sendSuccess(res, updatedUser);
  } catch (err) {
    next(err);
  }
}

export async function resetUserPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { newPassword } = req.body as ResetPasswordInput;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingUser) {
      sendError(res, "NOT_FOUND", "User not found", 404);
      return;
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    sendSuccess(res, { message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
}
