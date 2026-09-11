import type { Request, Response, NextFunction } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";
import {
  NotFoundError,
  ConflictError
} from "../../shared/errors/index.js";
import { sendSuccess, buildPaginationMeta } from "../../shared/http/index.js";
import { recordAudit } from "../audit/index.js";
import { normalizePhone, canDeleteCustomer } from "./customers.rules.js";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryParams,
  CustomerIdParam
} from "./customers.schemas.js";

/**
 * GET /api/customers
 * Lists customers with pagination and optional substring search across name and phone.
 * Always filters out soft-deleted records.
 */
export async function listCustomers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as CustomerQueryParams;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null
    };

    if (query.q) {
      const trimmedQ = query.q.trim();
      const digits = trimmedQ.replace(/\D/g, "");

      const orConditions: Prisma.CustomerWhereInput[] = [
        { name: { contains: trimmedQ, mode: "insensitive" } },
        { phone: { contains: trimmedQ, mode: "insensitive" } }
      ];

      if (digits.length >= 3) {
        orConditions.push({ phone: { contains: digits } });
        if (digits.startsWith("0")) {
          orConditions.push({ phone: { contains: digits.slice(1) } });
        } else if (digits.startsWith("62")) {
          orConditions.push({ phone: { contains: digits.slice(2) } });
        }
      }

      where.OR = orConditions;
    }

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      prisma.customer.count({ where })
    ]);

    sendSuccess(res, items, buildPaginationMeta(total, page, pageSize));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/customers/:id
 * Fetches customer details plus order history placeholder.
 */
export async function getCustomerById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as CustomerIdParam;

    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        orders: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    sendSuccess(res, customer);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/customers
 * Creates a customer record. Performs a soft-duplicate phone check (warn-only).
 */
export async function createCustomer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, phone, email, address, notes } = req.body as CreateCustomerInput;

    let possibleDuplicate: { id: string; name: string } | undefined;
    const normalized = normalizePhone(phone);

    if (normalized) {
      // ponytail: In-memory scan for duplicate phone is O(n) on active customers.
      // Acceptable for boutique scale (<5,000 customers). Upgrade path: functional index or stored normalized_phone column.
      const candidates = await prisma.customer.findMany({
        where: { deletedAt: null, phone: { not: null } },
        select: { id: true, name: true, phone: true }
      });

      const match = candidates.find((c) => c.phone && normalizePhone(c.phone) === normalized);
      if (match) {
        possibleDuplicate = { id: match.id, name: match.name };
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone: phone ?? null,
        email: email ?? null,
        address: address ?? null,
        notes: notes ?? null
      }
    });

    const actorId =
      (req.headers["x-actor-id"] as string) ||
      (req as unknown as { actorId?: string }).actorId ||
      null;

    await recordAudit({
      actorId,
      entityType: "customer",
      entityId: customer.id,
      action: "create",
      before: null,
      after: customer
    });

    const meta = possibleDuplicate ? { possibleDuplicate } : undefined;
    sendSuccess(res, customer, meta, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/customers/:id
 * Partial update of customer contact information and notes.
 */
export async function updateCustomer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as CustomerIdParam;
    const body = req.body as UpdateCustomerInput;

    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundError("Customer not found");
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {})
      }
    });

    const actorId =
      (req.headers["x-actor-id"] as string) ||
      (req as unknown as { actorId?: string }).actorId ||
      null;

    await recordAudit({
      actorId,
      entityType: "customer",
      entityId: id,
      action: "update",
      before: existing,
      after: updated
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/customers/:id
 * Soft deletes customer by setting deleted_at.
 */
export async function deleteCustomer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as unknown as CustomerIdParam;

    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundError("Customer not found");
    }

    const allowed = await canDeleteCustomer(id);
    if (!allowed) {
      throw new ConflictError("Cannot delete customer with active orders");
    }

    const deleted = await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    const actorId =
      (req.headers["x-actor-id"] as string) ||
      (req as unknown as { actorId?: string }).actorId ||
      null;

    await recordAudit({
      actorId,
      entityType: "customer",
      entityId: id,
      action: "delete",
      before: existing,
      after: deleted
    });

    sendSuccess(res, { id: deleted.id, deleted: true });
  } catch (err) {
    next(err);
  }
}
