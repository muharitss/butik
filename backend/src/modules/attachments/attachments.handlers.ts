import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import {
  NotFoundError,
  BusinessRuleViolationError
} from "../../shared/errors/index.js";
import { sendSuccess } from "../../shared/http/index.js";
import { recordAudit } from "../audit/index.js";
import {
  generateUploadSignature,
  destroyCloudinaryAsset
} from "../../infrastructure/cloudinary/index.js";
import {
  isValidPublicIdForOrder,
  getAttachmentFolder
} from "./attachments.rules.js";
import type {
  OrderIdParam,
  AttachmentIdParam,
  CreateAttachmentInput
} from "./attachments.schemas.js";

/**
 * POST /api/orders/:orderId/attachments/upload-signature
 * Returns a signed Cloudinary upload payload scoped to the order folder.
 */
export async function getUploadSignatureHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.status === "CANCELLED") {
      throw new BusinessRuleViolationError(
        "Cannot request upload signature for a cancelled order"
      );
    }

    const payload = generateUploadSignature(orderId);
    sendSuccess(res, payload);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:orderId/attachments
 * Registers attachment metadata after a successful client upload to Cloudinary.
 */
export async function createAttachmentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;
    const body = req.body as CreateAttachmentInput;
    const actorId =
      (req.headers["x-actor-id"] as string) ||
      (req as unknown as { actorId?: string }).actorId ||
      null;

    if (!isValidPublicIdForOrder(body.cloudinaryPublicId, orderId)) {
      throw new BusinessRuleViolationError(
        `Attachment public ID must be scoped to folder: ${getAttachmentFolder(orderId)}/`
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new NotFoundError("Order not found");
      }

      if (order.status === "CANCELLED") {
        throw new BusinessRuleViolationError(
          "Cannot add attachment to a cancelled order"
        );
      }

      // If actorId provided, verify it exists in users table, else set to null
      let validUploadedBy: string | null = null;
      if (actorId) {
        const user = await tx.user.findUnique({ where: { id: actorId } });
        if (user) {
          validUploadedBy = user.id;
        }
      }

      const attachment = await tx.orderAttachment.create({
        data: {
          orderId,
          type: body.type,
          cloudinaryPublicId: body.cloudinaryPublicId,
          secureUrl: body.secureUrl,
          format: body.format ?? null,
          width: body.width ?? null,
          height: body.height ?? null,
          uploadedBy: validUploadedBy
        }
      });

      await recordAudit(
        {
          actorId: validUploadedBy,
          entityType: "order_attachment",
          entityId: attachment.id,
          action: "attachment.uploaded",
          after: attachment
        },
        tx
      );

      return attachment;
    });

    sendSuccess(res, created, undefined, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/:orderId/attachments
 * Lists non-deleted attachments for an order.
 */
export async function listAttachmentsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId } = req.params as unknown as OrderIdParam;

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    const attachments = await prisma.orderAttachment.findMany({
      where: {
        orderId,
        deletedAt: null
      },
      orderBy: { uploadedAt: "asc" }
    });

    sendSuccess(res, attachments);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/orders/:orderId/attachments/:id
 * Soft-deletes attachment metadata and attempts a best-effort Cloudinary destroy.
 */
export async function deleteAttachmentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderId, id } = req.params as unknown as AttachmentIdParam;
    const actorId =
      (req.headers["x-actor-id"] as string) ||
      (req as unknown as { actorId?: string }).actorId ||
      null;

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.status === "CANCELLED") {
      throw new BusinessRuleViolationError(
        "Cannot delete attachment from a cancelled order"
      );
    }

    const existing = await prisma.orderAttachment.findFirst({
      where: { id, orderId, deletedAt: null }
    });

    if (!existing) {
      throw new NotFoundError("Attachment not found");
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const updated = await tx.orderAttachment.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      await recordAudit(
        {
          actorId,
          entityType: "order_attachment",
          entityId: id,
          action: "attachment.deleted",
          before: existing,
          after: updated
        },
        tx
      );

      return updated;
    });

    // Best-effort Cloudinary destroy after successful DB soft-delete per DECISIONS.md#D-006
    await destroyCloudinaryAsset(existing.cloudinaryPublicId);

    sendSuccess(res, { id: deleted.id, deleted: true });
  } catch (err) {
    next(err);
  }
}
