import { Prisma, type MeasurementVersion, type MeasurementValue } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";
import { NotFoundError } from "../../shared/errors/index.js";
import { recordAudit } from "../audit/index.js";
import type { CreateMeasurementVersionInput } from "./measurements.schemas.js";

export type MeasurementVersionWithValues = MeasurementVersion & {
  values: MeasurementValue[];
};

/**
 * Gets the current (latest) measurement version for a customer, including its values.
 * Exported per ARCHITECTURE.md §3.3 for direct cross-module use by `orders` (TASK-014).
 */
export async function getCurrentMeasurementVersion(
  customerId: string,
  tx?: Prisma.TransactionClient
): Promise<MeasurementVersionWithValues | null> {
  const client = tx ?? prisma;
  return client.measurementVersion.findFirst({
    where: { customerId },
    orderBy: { versionNumber: "desc" },
    include: {
      values: {
        orderBy: { fieldKey: "asc" }
      }
    }
  });
}

/**
 * Lists all measurement versions for a customer, newest first.
 * Throws NotFoundError if the customer does not exist or has been soft-deleted.
 */
export async function listMeasurementVersions(
  customerId: string
): Promise<MeasurementVersionWithValues[]> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null }
  });

  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  return prisma.measurementVersion.findMany({
    where: { customerId },
    orderBy: { versionNumber: "desc" },
    include: {
      values: {
        orderBy: { fieldKey: "asc" }
      }
    }
  });
}

/**
 * Creates a new measurement version for a customer in a single transaction.
 * Computes versionNumber as max(existing) + 1.
 * Strict immutability: never updates an existing version.
 */
export async function createMeasurementVersion(
  customerId: string,
  input: CreateMeasurementVersionInput
): Promise<MeasurementVersionWithValues> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null }
  });

  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  return prisma.$transaction(async (tx) => {
    const latest = await tx.measurementVersion.findFirst({
      where: { customerId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true }
    });

    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    const created = await tx.measurementVersion.create({
      data: {
        customerId,
        versionNumber,
        measuredAt: input.measuredAt,
        label: input.label ?? null,
        notes: input.notes ?? null,
        createdBy: input.createdBy ?? null,
        values: {
          create: input.values.map((v) => ({
            fieldKey: v.fieldKey,
            value: new Prisma.Decimal(v.value),
            unit: v.unit
          }))
        }
      },
      include: {
        values: {
          orderBy: { fieldKey: "asc" }
        }
      }
    });

    await recordAudit(
      {
        actorId: input.createdBy ?? null,
        entityType: "measurement_version",
        entityId: created.id,
        action: "create",
        before: null,
        after: created
      },
      tx
    );

    return created;
  });
}
