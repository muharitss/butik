import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { sendSuccess } from "../../shared/http/response.js";
import { recordAudit } from "../audit/index.js";
import { getStoreSettings } from "./settings.service.js";
import type { UpdateStoreSettingsInput, StoreSettingsDto } from "./settings.schemas.js";

/**
 * GET /api/settings
 * Returns current store settings (any authenticated user).
 */
export async function getStoreSettingsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await getStoreSettings();
    sendSuccess(res, settings);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/settings
 * Updates store settings (owner only). Partial update.
 * Logs audit trail with before/after state.
 */
export async function updateStoreSettingsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as UpdateStoreSettingsInput;
    const current = await getStoreSettings();

    const updateData: {
      name?: string;
      tagline?: string | null;
      address?: string | null;
      phone?: string | null;
      whatsappPhone?: string | null;
      email?: string | null;
      receiptFooter?: string | null;
    } = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.tagline !== undefined) {
      updateData.tagline = body.tagline ? body.tagline.trim() : null;
    }
    if (body.address !== undefined) {
      updateData.address = body.address ? body.address.trim() : null;
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone ? body.phone.trim() : null;
    }
    if (body.whatsappPhone !== undefined) {
      updateData.whatsappPhone = body.whatsappPhone ? body.whatsappPhone.trim() : null;
    }
    if (body.email !== undefined) {
      const email = body.email ? body.email.trim().toLowerCase() : null;
      updateData.email = email && email.length > 0 ? email : null;
    }
    if (body.receiptFooter !== undefined) {
      updateData.receiptFooter = body.receiptFooter ? body.receiptFooter.trim() : null;
    }

    const updatedRow = await prisma.storeSettings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        name: updateData.name ?? current.name,
        tagline: updateData.tagline ?? current.tagline,
        address: updateData.address ?? current.address,
        phone: updateData.phone ?? current.phone,
        whatsappPhone: updateData.whatsappPhone ?? current.whatsappPhone,
        email: updateData.email ?? current.email,
        receiptFooter: updateData.receiptFooter ?? current.receiptFooter
      }
    });

    const afterDto: StoreSettingsDto = {
      id: updatedRow.id,
      name: updatedRow.name,
      tagline: updatedRow.tagline,
      address: updatedRow.address,
      phone: updatedRow.phone,
      whatsappPhone: updatedRow.whatsappPhone,
      email: updatedRow.email,
      receiptFooter: updatedRow.receiptFooter,
      updatedAt: updatedRow.updatedAt
    };

    await recordAudit({
      actorId: req.actorId,
      entityType: "store_settings",
      entityId: "default",
      action: "update",
      before: current,
      after: afterDto
    });

    sendSuccess(res, afterDto);
  } catch (err) {
    next(err);
  }
}
