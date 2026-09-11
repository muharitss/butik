import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import app from "../../app.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { getAuditLogs, clearAuditLogs } from "../audit/index.js";
import { setCloudinaryDestroyHandler } from "../../infrastructure/cloudinary/index.js";

test("Attachment Schema, Cloudinary Integration & API tests", async (t) => {
  let server: Server;
  let baseUrl = "";

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === "object") {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });

  const createdCustomerIds: string[] = [];
  const createdGarmentTypeIds: string[] = [];
  const createdOrderIds: string[] = [];

  t.beforeEach(() => {
    clearAuditLogs();
    setCloudinaryDestroyHandler(null);
  });

  t.after(async () => {
    server.close();

    if (createdOrderIds.length > 0) {
      await prisma.orderAttachment.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.orderMeasurementSnapshotValue.deleteMany({
        where: {
          orderMeasurementSnapshot: {
            orderId: { in: createdOrderIds }
          }
        }
      });
      await prisma.orderMeasurementSnapshot.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } }
      });
    }

    if (createdCustomerIds.length > 0) {
      await prisma.measurementValue.deleteMany({
        where: {
          measurementVersion: {
            customerId: { in: createdCustomerIds }
          }
        }
      });
      await prisma.measurementVersion.deleteMany({
        where: { customerId: { in: createdCustomerIds } }
      });
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } }
      });
    }

    if (createdGarmentTypeIds.length > 0) {
      await prisma.garmentMeasurementField.deleteMany({
        where: { garmentTypeId: { in: createdGarmentTypeIds } }
      });
      await prisma.garmentType.deleteMany({
        where: { id: { in: createdGarmentTypeIds } }
      });
    }
  });

  // Helper to create customer with measurement version
  async function createTestCustomer(): Promise<string> {
    const customer = await prisma.customer.create({
      data: {
        name: `Attachment Test Customer ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        phone: `0812${Math.floor(10000000 + Math.random() * 90000000)}`
      }
    });
    createdCustomerIds.push(customer.id);

    await prisma.measurementVersion.create({
      data: {
        customerId: customer.id,
        versionNumber: 1,
        measuredAt: new Date(),
        values: {
          create: [{ fieldKey: "chest", value: 95.5, unit: "cm" }]
        }
      }
    });

    return customer.id;
  }

  // Helper to create garment type
  async function createTestGarmentType(): Promise<string> {
    const garment = await prisma.garmentType.create({
      data: {
        name: `Garment ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        measurementFields: {
          create: [{ fieldKey: "chest", label: "Chest", unit: "cm" }]
        }
      }
    });
    createdGarmentTypeIds.push(garment.id);
    return garment.id;
  }

  // Helper to create an order
  async function createTestOrder(status = "DRAFT"): Promise<string> {
    const customerId = await createTestCustomer();
    const garmentTypeId = await createTestGarmentType();

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        deadlineAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        items: [{ garmentTypeId, quantity: 1, unitPrice: 250000 }]
      })
    });
    const { data } = (await res.json()) as { data: { id: string } };
    createdOrderIds.push(data.id);

    if (status !== "DRAFT") {
      await prisma.order.update({
        where: { id: data.id },
        data: { status }
      });
    }

    return data.id;
  }

  await t.test("POST /upload-signature generates Cloudinary signed payload scoped to folder", async () => {
    const orderId = await createTestOrder();

    const res = await fetch(`${baseUrl}/api/orders/${orderId}/attachments/upload-signature`, {
      method: "POST"
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as {
      data: {
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        folder: string;
      };
    };

    assert.ok(json.data.signature.length > 0);
    assert.ok(typeof json.data.timestamp === "number");
    assert.ok(json.data.apiKey);
    assert.ok(json.data.cloudName);
    assert.equal(json.data.folder, `jahitflow/orders/${orderId}`);
  });

  await t.test("POST /upload-signature seamlessly parses credentials from CLOUDINARY_URL", async () => {
    const originalUrl = process.env.CLOUDINARY_URL;
    process.env.CLOUDINARY_URL = "cloudinary://custom_key_123:custom_secret_456@screenshottugas";

    try {
      const orderId = await createTestOrder();
      const res = await fetch(`${baseUrl}/api/orders/${orderId}/attachments/upload-signature`, {
        method: "POST"
      });

      assert.equal(res.status, 200);
      const json = (await res.json()) as {
        data: {
          signature: string;
          apiKey: string;
          cloudName: string;
        };
      };

      assert.equal(json.data.apiKey, "custom_key_123");
      assert.equal(json.data.cloudName, "screenshottugas");
    } finally {
      if (originalUrl !== undefined) {
        process.env.CLOUDINARY_URL = originalUrl;
      } else {
        delete process.env.CLOUDINARY_URL;
      }
    }
  });

  await t.test("POST /upload-signature handles 404 and 409 error cases", async () => {
    const nonExistentOrderId = "00000000-0000-0000-0000-000000000000";
    const res404 = await fetch(
      `${baseUrl}/api/orders/${nonExistentOrderId}/attachments/upload-signature`,
      { method: "POST" }
    );
    assert.equal(res404.status, 404);

    const cancelledOrderId = await createTestOrder("CANCELLED");
    const res409 = await fetch(
      `${baseUrl}/api/orders/${cancelledOrderId}/attachments/upload-signature`,
      { method: "POST" }
    );
    assert.equal(res409.status, 409);
    const json409 = (await res409.json()) as { error: { code: string; message: string } };
    assert.equal(json409.error.code, "BUSINESS_RULE_VIOLATION");
  });

  await t.test("POST / registers metadata, enforces validations, and writes audit log", async () => {
    const orderId = await createTestOrder();

    // 1. Success case
    const payload = {
      type: "CUSTOMER_REFERENCE",
      cloudinaryPublicId: `jahitflow/orders/${orderId}/photo1`,
      secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/jahitflow/orders/photo1.jpg",
      format: "jpg",
      width: 1200,
      height: 800,
      bytes: 204800
    };

    const res = await fetch(`${baseUrl}/api/orders/${orderId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const json = (await res.json()) as {
      data: {
        id: string;
        orderId: string;
        type: string;
        cloudinaryPublicId: string;
        secureUrl: string;
        format: string;
        width: number;
        height: number;
      };
    };

    assert.equal(json.data.orderId, orderId);
    assert.equal(json.data.type, "CUSTOMER_REFERENCE");
    assert.equal(json.data.cloudinaryPublicId, payload.cloudinaryPublicId);
    assert.equal(json.data.secureUrl, payload.secureUrl);
    assert.equal(json.data.format, "jpg");
    assert.equal(json.data.width, 1200);
    assert.equal(json.data.height, 800);

    // Audit log check
    const logs = getAuditLogs();
    const auditEntry = logs.find(
      (l) => l.entityType === "order_attachment" && l.entityId === json.data.id
    );
    assert.ok(auditEntry, "Audit log entry must be recorded for uploaded attachment");
    assert.equal(auditEntry?.action, "attachment.uploaded");

    // 2. Reject invalid type enum
    const resInvalidType = await fetch(`${baseUrl}/api/orders/${orderId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        type: "INVALID_TYPE"
      })
    });
    assert.equal(resInvalidType.status, 400);

    // 3. Reject disallowed format (e.g. gif or pdf)
    const resInvalidFormat = await fetch(`${baseUrl}/api/orders/${orderId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        format: "gif"
      })
    });
    assert.equal(resInvalidFormat.status, 400);

    // 4. Reject oversized bytes (> 10MB)
    const resOversized = await fetch(`${baseUrl}/api/orders/${orderId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        bytes: 11 * 1024 * 1024
      })
    });
    assert.equal(resOversized.status, 400);

    // 5. Reject public ID not scoped to order folder
    const resInvalidFolder = await fetch(`${baseUrl}/api/orders/${orderId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        cloudinaryPublicId: "other_folder/unauthorized_asset"
      })
    });
    assert.equal(resInvalidFolder.status, 409);
  });

  await t.test("GET / lists non-deleted attachments chronologically", async () => {
    const orderId = await createTestOrder();

    // Create two attachments
    const att1 = await prisma.orderAttachment.create({
      data: {
        orderId,
        type: "GARMENT_REFERENCE",
        cloudinaryPublicId: `jahitflow/orders/${orderId}/ref1`,
        secureUrl: "https://res.cloudinary.com/demo/ref1.webp",
        format: "webp",
        uploadedAt: new Date(Date.now() - 2000)
      }
    });

    const att2 = await prisma.orderAttachment.create({
      data: {
        orderId,
        type: "RESULT",
        cloudinaryPublicId: `jahitflow/orders/${orderId}/res1`,
        secureUrl: "https://res.cloudinary.com/demo/res1.png",
        format: "png",
        uploadedAt: new Date(Date.now() - 1000)
      }
    });

    // Create a soft-deleted attachment
    await prisma.orderAttachment.create({
      data: {
        orderId,
        type: "OTHER",
        cloudinaryPublicId: `jahitflow/orders/${orderId}/deleted1`,
        secureUrl: "https://res.cloudinary.com/demo/del1.jpg",
        deletedAt: new Date()
      }
    });

    const res = await fetch(`${baseUrl}/api/orders/${orderId}/attachments`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as {
      data: Array<{ id: string; type: string; format: string }>;
    };

    assert.equal(json.data.length, 2);
    assert.equal(json.data[0].id, att1.id);
    assert.equal(json.data[1].id, att2.id);
  });

  await t.test("DELETE /:id soft deletes, writes audit log, and attempts Cloudinary destroy", async () => {
    const orderId = await createTestOrder();

    const att = await prisma.orderAttachment.create({
      data: {
        orderId,
        type: "CUSTOMER_REFERENCE",
        cloudinaryPublicId: `jahitflow/orders/${orderId}/to_delete`,
        secureUrl: "https://res.cloudinary.com/demo/delete.jpg"
      }
    });

    let destroyCalledWith = "";
    setCloudinaryDestroyHandler(async (publicId: string) => {
      destroyCalledWith = publicId;
      return { result: "ok" };
    });

    const res = await fetch(`${baseUrl}/api/orders/${orderId}/attachments/${att.id}`, {
      method: "DELETE"
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as { data: { id: string; deleted: boolean } };
    assert.equal(json.data.id, att.id);
    assert.equal(json.data.deleted, true);

    // Verify DB row is soft-deleted
    const row = await prisma.orderAttachment.findUnique({ where: { id: att.id } });
    assert.ok(row?.deletedAt !== null, "deletedAt must be populated");

    // Verify Cloudinary destroy was called
    assert.equal(destroyCalledWith, att.cloudinaryPublicId);

    // Verify audit log
    const logs = getAuditLogs();
    const auditEntry = logs.find(
      (l) => l.entityType === "order_attachment" && l.entityId === att.id && l.action === "attachment.deleted"
    );
    assert.ok(auditEntry, "Audit log entry must be recorded for deleted attachment");

    // Second DELETE returns 404 because already deleted
    const resSecond = await fetch(`${baseUrl}/api/orders/${orderId}/attachments/${att.id}`, {
      method: "DELETE"
    });
    assert.equal(resSecond.status, 404);
  });

  await t.test("DELETE /:id best-effort Cloudinary failure does not prevent DB soft-delete", async () => {
    const orderId = await createTestOrder();

    const att = await prisma.orderAttachment.create({
      data: {
        orderId,
        type: "OTHER",
        cloudinaryPublicId: `jahitflow/orders/${orderId}/fail_cleanup`,
        secureUrl: "https://res.cloudinary.com/demo/fail.jpg"
      }
    });

    // Cloudinary handler throws an error (e.g. network timeout or bad credentials)
    setCloudinaryDestroyHandler(async () => {
      throw new Error("Cloudinary API unavailable");
    });

    const res = await fetch(`${baseUrl}/api/orders/${orderId}/attachments/${att.id}`, {
      method: "DELETE"
    });

    // HTTP request still succeeds with 200
    assert.equal(res.status, 200);
    const json = (await res.json()) as { data: { id: string; deleted: boolean } };
    assert.equal(json.data.deleted, true);

    // DB row was still soft-deleted
    const row = await prisma.orderAttachment.findUnique({ where: { id: att.id } });
    assert.ok(row?.deletedAt !== null, "deletedAt must be set despite Cloudinary error");
  });

  await t.test("Order detail GET /api/orders/:id includes active attachments and excludes soft-deleted", async () => {
    const orderId = await createTestOrder();

    const activeAtt = await prisma.orderAttachment.create({
      data: {
        orderId,
        type: "RESULT",
        cloudinaryPublicId: `jahitflow/orders/${orderId}/final_result`,
        secureUrl: "https://res.cloudinary.com/demo/final.jpg"
      }
    });

    await prisma.orderAttachment.create({
      data: {
        orderId,
        type: "OTHER",
        cloudinaryPublicId: `jahitflow/orders/${orderId}/soft_deleted`,
        secureUrl: "https://res.cloudinary.com/demo/soft_deleted.jpg",
        deletedAt: new Date()
      }
    });

    const res = await fetch(`${baseUrl}/api/orders/${orderId}`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as {
      data: {
        id: string;
        attachments: Array<{ id: string; type: string }>;
      };
    };

    assert.ok(Array.isArray(json.data.attachments));
    assert.equal(json.data.attachments.length, 1);
    assert.equal(json.data.attachments[0].id, activeAtt.id);
  });
});
