import type { Request, Response, NextFunction } from "express";
import { sendError } from "../http/response.js";
import { hasPermission, type Permission } from "./permissions.js";

export function authorize(permission: Permission | string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.userRole;

    if (!role || !hasPermission(role, permission)) {
      sendError(res, "FORBIDDEN", "Forbidden: insufficient permissions", 403);
      return;
    }

    next();
  };
}
