import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";

test("Database Constraints — Order Number Uniqueness & Partial Active Snapshot Index", async (t) => {
  const createdCustomerIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdVersionIds: string[] = [];

  t.after(async () => {
    if (createdOrderIds.length > 0) {
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
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } }
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } }
      });
    }

    if (createdVersionIds.length > 0) {
      await prisma.measurementValue.deleteMany({
        where: { measurementVersionId: { in: createdVersionIds } }
      });
      await prisma.measurementVersion.deleteMany({
        where: { id: { in: createdVersionIds } }
      });
    }

    if (createdCustomerIds.length > 0) {
      await prisma.customer.deleteMany({
        where: { id: { in: createdCustomerIds } }
      });
    }
  });

  // Helper setup
  const customer = await prisma.customer.create({
    data: {
      name: `Constraint Test Customer ${Date.now()}`,
      phone: `0819${Math.floor(10000000 + Math.random() * 90000000)}`
    }
  });
  createdCustomerIds.push(customer.id);

  const version = await prisma.measurementVersion.create({
    data: {
      customerId: customer.id,
      versionNumber: 1,
      measuredAt: new Date(),
      values: {
        create: [{ fieldKey: "chest", value: 92, unit: "cm" }]
      }
    }
  });
  createdVersionIds.push(version.id);

  await t.test("Order Number Uniqueness: rejects duplicate order_number via unique constraint P2002", async () => {
    const duplicateOrderNumber = `TEST-UNIQUE-${Date.now()}`;

    const order1 = await prisma.order.create({
      data: {
        orderNumber: duplicateOrderNumber,
        customerId: customer.id,
        deadlineAt: new Date(Date.now() + 86400000),
        subtotal: 100000,
        total: 100000
      }
    });
    createdOrderIds.push(order1.id);

    // Attempt to insert duplicate order number
    await assert.rejects(
      async () => {
        await prisma.order.create({
          data: {
            orderNumber: duplicateOrderNumber,
            customerId: customer.id,
            deadlineAt: new Date(Date.now() + 86400000),
            subtotal: 150000,
            total: 150000
          }
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof Prisma.PrismaClientKnownRequestError);
        assert.equal(err.code, "P2002", "Expected P2002 Unique constraint violation");
        return true;
      }
    );
  });

  await t.test(
    "Partial Unique Index: prevents multiple active snapshots for same order, but allows resnapshotting",
    async () => {
      const order = await prisma.order.create({
        data: {
          orderNumber: `TEST-SNAP-${Date.now()}`,
          customerId: customer.id,
          deadlineAt: new Date(Date.now() + 86400000),
          subtotal: 100000,
          total: 100000
        }
      });
      createdOrderIds.push(order.id);

      // 1. First active snapshot (superseded_by_resnapshot_at IS NULL)
      const snap1 = await prisma.orderMeasurementSnapshot.create({
        data: {
          orderId: order.id,
          sourceMeasurementVersionId: version.id,
          supersededByResnapshotAt: null
        }
      });
      assert.ok(snap1.id);

      // 2. Attempting to insert a second active snapshot without superseding must violate the partial unique index
      await assert.rejects(
        async () => {
          await prisma.orderMeasurementSnapshot.create({
            data: {
              orderId: order.id,
              sourceMeasurementVersionId: version.id,
              supersededByResnapshotAt: null
            }
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof Prisma.PrismaClientKnownRequestError);
          assert.equal(err.code, "P2002");
          return true;
        }
      );

      // 3. Mark snap1 as superseded
      await prisma.orderMeasurementSnapshot.update({
        where: { id: snap1.id },
        data: { supersededByResnapshotAt: new Date() }
      });

      // 4. Now inserting a new active snapshot must succeed
      const snap2 = await prisma.orderMeasurementSnapshot.create({
        data: {
          orderId: order.id,
          sourceMeasurementVersionId: version.id,
          supersededByResnapshotAt: null
        }
      });
      assert.ok(snap2.id);
      assert.notEqual(snap2.id, snap1.id);
    }
  );
});
