import assert from "node:assert";
import { prisma } from "./client.js";

async function check() {
  const users = await prisma.user.findMany();
  assert(users.length >= 1, "Expected at least one user in database");
  const operator = users.find((u) => u.role === "owner");
  assert(operator, "Expected an operator user with role 'owner'");
  assert(typeof operator.id === "string" && operator.id.length > 0, "Expected valid UUID id");
  assert(operator.isActive === true, "Expected operator to be active");
  console.log(`Prisma check passed. Found ${users.length} user(s). Operator id: ${operator.id}`);

  // Customer round-trip verification
  const testCustomer = await prisma.customer.create({
    data: {
      name: "Sanity Check Customer",
      phone: "081234567890",
      email: "customer@example.com",
      address: "Jl. Tailor No. 1",
      notes: "Test customer for db:check",
    },
  });
  assert(typeof testCustomer.id === "string" && testCustomer.id.length > 0, "Expected valid customer UUID");
  assert(testCustomer.name === "Sanity Check Customer", "Expected customer name to match");
  assert(testCustomer.phone === "081234567890", "Expected customer phone to match");
  assert(testCustomer.createdAt instanceof Date, "Expected createdAt to be Date");
  assert(testCustomer.updatedAt instanceof Date, "Expected updatedAt to be Date");
  assert(testCustomer.deletedAt === null, "Expected deletedAt to be null by default");

  const fetchedCustomer = await prisma.customer.findUnique({
    where: { id: testCustomer.id },
  });
  assert(fetchedCustomer !== null, "Expected to find created customer");

  await prisma.customer.delete({
    where: { id: testCustomer.id },
  });
  console.log("Customer model check passed. Successfully created, fetched, and deleted test customer.");

  // GarmentType & GarmentMeasurementField round-trip verification
  const testGarment = await prisma.garmentType.create({
    data: {
      name: "Sanity Check Kemeja",
      description: "Test garment type for db:check",
      measurementFields: {
        create: [
          {
            fieldKey: "chest",
            label: "Lingkar Dada",
            unit: "cm",
            isRequired: true,
            sortOrder: 1,
          },
          {
            fieldKey: "waist",
            label: "Lingkar Pinggang",
            unit: "cm",
            isRequired: false,
            sortOrder: 2,
          },
        ],
      },
    },
    include: {
      measurementFields: true,
    },
  });

  assert(typeof testGarment.id === "string" && testGarment.id.length > 0, "Expected valid garment UUID");
  assert(testGarment.name === "Sanity Check Kemeja", "Expected garment name to match");
  assert(testGarment.isActive === true, "Expected isActive to default to true");
  assert(testGarment.deletedAt === null, "Expected deletedAt to be null by default");
  assert(testGarment.createdAt instanceof Date, "Expected createdAt to be Date");
  assert(testGarment.updatedAt instanceof Date, "Expected updatedAt to be Date");
  assert(testGarment.measurementFields.length === 2, "Expected 2 nested measurement fields created");

  // Verify unique garment name constraint
  let duplicateNameRejected = false;
  try {
    await prisma.garmentType.create({
      data: { name: "Sanity Check Kemeja" },
    });
  } catch {
    duplicateNameRejected = true;
  }
  assert(duplicateNameRejected, "Expected duplicate garment name to be rejected");

  // Verify unique (garment_type_id, field_key) constraint
  let duplicateFieldRejected = false;
  try {
    await prisma.garmentMeasurementField.create({
      data: {
        garmentTypeId: testGarment.id,
        fieldKey: "chest",
        label: "Duplicate Chest",
        unit: "cm",
      },
    });
  } catch {
    duplicateFieldRejected = true;
  }
  assert(duplicateFieldRejected, "Expected duplicate (garmentTypeId, fieldKey) to be rejected");

  // Verify cascade delete: deleting garment type automatically deletes its fields
  await prisma.garmentType.delete({
    where: { id: testGarment.id },
  });
  const remainingFields = await prisma.garmentMeasurementField.count({
    where: { garmentTypeId: testGarment.id },
  });
  assert(remainingFields === 0, "Expected cascade deletion of garment measurement fields");
  console.log("GarmentType & GarmentMeasurementField check passed. Successfully verified constraints and cascade delete.");

  // MeasurementVersion & MeasurementValue round-trip verification
  const measurementCustomer = await prisma.customer.create({
    data: {
      name: "Measurement Test Customer",
      phone: "081299998888",
    },
  });

  const testVersion = await prisma.measurementVersion.create({
    data: {
      customerId: measurementCustomer.id,
      versionNumber: 1,
      label: "Initial Fit",
      notes: "Measured after lunch",
      measuredAt: new Date("2026-09-10T12:00:00Z"),
      createdBy: operator.id,
      values: {
        create: [
          {
            fieldKey: "chest",
            value: "96.50",
            unit: "cm",
          },
          {
            fieldKey: "waist",
            value: "82.00",
            unit: "cm",
          },
        ],
      },
    },
    include: {
      values: true,
    },
  });

  assert(typeof testVersion.id === "string" && testVersion.id.length > 0, "Expected valid version UUID");
  assert(testVersion.customerId === measurementCustomer.id, "Expected customerId to match");
  assert(testVersion.versionNumber === 1, "Expected versionNumber to be 1");
  assert(testVersion.label === "Initial Fit", "Expected label to match");
  assert(testVersion.notes === "Measured after lunch", "Expected notes to match");
  assert(testVersion.measuredAt instanceof Date, "Expected measuredAt to be Date");
  assert(testVersion.createdAt instanceof Date, "Expected createdAt to be Date");
  assert(testVersion.createdBy === operator.id, "Expected createdBy to match operator id");
  assert(testVersion.values.length === 2, "Expected 2 nested measurement values created");
  assert(Number(testVersion.values[0].value) === 96.5, "Expected numeric value to match 96.50");
  assert(testVersion.values[0].unit === "cm", "Expected unit to be cm");

  // Verify unique (customerId, versionNumber) constraint
  let duplicateVersionRejected = false;
  try {
    await prisma.measurementVersion.create({
      data: {
        customerId: measurementCustomer.id,
        versionNumber: 1,
        measuredAt: new Date(),
      },
    });
  } catch {
    duplicateVersionRejected = true;
  }
  assert(duplicateVersionRejected, "Expected duplicate (customerId, versionNumber) to be rejected");

  // Verify unique (measurementVersionId, fieldKey) constraint
  let duplicateValueKeyRejected = false;
  try {
    await prisma.measurementValue.create({
      data: {
        measurementVersionId: testVersion.id,
        fieldKey: "chest",
        value: "97.00",
        unit: "cm",
      },
    });
  } catch {
    duplicateValueKeyRejected = true;
  }
  assert(duplicateValueKeyRejected, "Expected duplicate (measurementVersionId, fieldKey) to be rejected");

  // Verify cascade delete: deleting measurement version cascades to measurement values
  await prisma.measurementVersion.delete({
    where: { id: testVersion.id },
  });
  const remainingValues = await prisma.measurementValue.count({
    where: { measurementVersionId: testVersion.id },
  });
  assert(remainingValues === 0, "Expected cascade deletion of measurement values");

  await prisma.customer.delete({
    where: { id: measurementCustomer.id },
  });
  console.log("MeasurementVersion & MeasurementValue check passed. Successfully verified constraints and cascade delete.");

  // Order, OrderItem, OrderNumberCounter, OrderMeasurementSnapshot, OrderMeasurementSnapshotValue, OrderStatusHistory verification
  const checkYear = 9999;
  await prisma.orderNumberCounter.deleteMany({ where: { year: checkYear } });
  const counter = await prisma.orderNumberCounter.create({
    data: {
      year: checkYear,
      lastValue: 0,
    },
  });
  assert(counter.year === checkYear, `Expected counter year to be ${checkYear}`);
  assert(counter.lastValue === 0, "Expected initial lastValue to be 0");

  const incrementedCounter = await prisma.orderNumberCounter.update({
    where: { year: checkYear },
    data: { lastValue: { increment: 1 } },
  });
  assert(incrementedCounter.lastValue === 1, "Expected incremented lastValue to be 1");

  // 2. Setup prerequisite customer, garment type, and measurement version
  const orderCustomer = await prisma.customer.create({
    data: {
      name: "Order Test Customer",
      phone: "081122334455",
    },
  });

  const orderGarment = await prisma.garmentType.create({
    data: {
      name: "Jas Formal Test",
      measurementFields: {
        create: [
          { fieldKey: "chest", label: "Lingkar Dada", unit: "cm", isRequired: true, sortOrder: 1 },
        ],
      },
    },
  });

  const orderVersion = await prisma.measurementVersion.create({
    data: {
      customerId: orderCustomer.id,
      versionNumber: 1,
      measuredAt: new Date("2026-09-10T14:00:00Z"),
      createdBy: operator.id,
      values: {
        create: [{ fieldKey: "chest", value: "96.50", unit: "cm" }],
      },
    },
  });

  // 3. Create Order with nested OrderItems
  const deadline = new Date(Date.now() + 7 * 86400000);
  const testOrder = await prisma.order.create({
    data: {
      orderNumber: "JF-2026-001",
      customerId: orderCustomer.id,
      status: "DRAFT",
      requiresFitting: true,
      deadlineAt: deadline,
      subtotal: "350000.00",
      additionalCost: "25000.00",
      expressFee: "50000.00",
      discount: "10000.00",
      total: "415000.00",
      paidTotalCache: "0.00",
      paymentStatusCache: "UNPAID",
      notes: "Test order note",
      items: {
        create: [
          {
            garmentTypeId: orderGarment.id,
            quantity: 1,
            unitPrice: "350000.00",
            subtotal: "350000.00",
            notes: "Custom lapel",
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  assert(typeof testOrder.id === "string" && testOrder.id.length > 0, "Expected valid order UUID");
  assert(testOrder.orderNumber === "JF-2026-001", "Expected orderNumber to match");
  assert(testOrder.status === "DRAFT", "Expected status to default to DRAFT");
  assert(testOrder.requiresFitting === true, "Expected requiresFitting to default to true");
  assert(Number(testOrder.subtotal) === 350000, "Expected subtotal to match 350000");
  assert(Number(testOrder.additionalCost) === 25000, "Expected additionalCost to match 25000");
  assert(Number(testOrder.expressFee) === 50000, "Expected expressFee to match 50000");
  assert(Number(testOrder.discount) === 10000, "Expected discount to match 10000");
  assert(Number(testOrder.total) === 415000, "Expected total to match 415000");
  assert(Number(testOrder.paidTotalCache) === 0, "Expected paidTotalCache to default to 0");
  assert(testOrder.paymentStatusCache === "UNPAID", "Expected paymentStatusCache to default to UNPAID");
  assert(testOrder.items.length === 1, "Expected 1 order item created");
  assert(testOrder.items[0].garmentTypeId === orderGarment.id, "Expected garmentTypeId to match");
  assert(Number(testOrder.items[0].unitPrice) === 350000, "Expected unitPrice to match");

  // 4. Verify unique order_number constraint
  let duplicateOrderNumberRejected = false;
  try {
    await prisma.order.create({
      data: {
        orderNumber: "JF-2026-001",
        customerId: orderCustomer.id,
        deadlineAt: deadline,
        subtotal: "100000.00",
        total: "100000.00",
      },
    });
  } catch {
    duplicateOrderNumberRejected = true;
  }
  assert(duplicateOrderNumberRejected, "Expected duplicate orderNumber to be rejected");

  // 5. OrderStatusHistory creation
  const history = await prisma.orderStatusHistory.create({
    data: {
      orderId: testOrder.id,
      fromStatus: null,
      toStatus: "DRAFT",
      changedBy: operator.id,
      reason: "Initial order creation",
    },
  });
  assert(history.orderId === testOrder.id, "Expected status history orderId to match");
  assert(history.fromStatus === null, "Expected fromStatus to be null for initial draft");
  assert(history.toStatus === "DRAFT", "Expected toStatus to be DRAFT");
  assert(history.changedBy === operator.id, "Expected changedBy to match operator");
  assert(history.reason === "Initial order creation", "Expected reason to match");

  // 6. OrderMeasurementSnapshot & OrderMeasurementSnapshotValue
  const activeSnapshot1 = await prisma.orderMeasurementSnapshot.create({
    data: {
      orderId: testOrder.id,
      sourceMeasurementVersionId: orderVersion.id,
      supersededByResnapshotAt: null,
      values: {
        create: [
          {
            fieldKey: "chest",
            value: "96.50",
            unit: "cm",
          },
        ],
      },
    },
    include: {
      values: true,
    },
  });
  assert(activeSnapshot1.orderId === testOrder.id, "Expected snapshot orderId to match");
  assert(activeSnapshot1.sourceMeasurementVersionId === orderVersion.id, "Expected versionId to match");
  assert(activeSnapshot1.supersededByResnapshotAt === null, "Expected active snapshot supersededAt to be null");
  assert(activeSnapshot1.values.length === 1, "Expected 1 snapshot value");
  assert(Number(activeSnapshot1.values[0].value) === 96.5, "Expected snapshot value to match 96.50");

  // 7. Verify unique (order_measurement_snapshot_id, field_key) constraint
  let duplicateSnapshotValueRejected = false;
  try {
    await prisma.orderMeasurementSnapshotValue.create({
      data: {
        orderMeasurementSnapshotId: activeSnapshot1.id,
        fieldKey: "chest",
        value: "97.00",
        unit: "cm",
      },
    });
  } catch {
    duplicateSnapshotValueRejected = true;
  }
  assert(duplicateSnapshotValueRejected, "Expected duplicate fieldKey on same snapshot to be rejected");

  // 8. Partial Unique Index Check (UNIQUE(order_id) WHERE superseded_by_resnapshot_at IS NULL)
  // Attempting to insert a second active snapshot for the same order MUST fail
  let duplicateActiveSnapshotRejected = false;
  try {
    await prisma.orderMeasurementSnapshot.create({
      data: {
        orderId: testOrder.id,
        sourceMeasurementVersionId: orderVersion.id,
        supersededByResnapshotAt: null,
      },
    });
  } catch {
    duplicateActiveSnapshotRejected = true;
  }
  assert(
    duplicateActiveSnapshotRejected,
    "Expected second active snapshot for the same order to be rejected by partial unique index"
  );

  // Now supersede the first snapshot
  const supersededTime = new Date();
  await prisma.orderMeasurementSnapshot.update({
    where: { id: activeSnapshot1.id },
    data: { supersededByResnapshotAt: supersededTime },
  });

  // Now inserting a new active snapshot for the same order MUST succeed
  const activeSnapshot2 = await prisma.orderMeasurementSnapshot.create({
    data: {
      orderId: testOrder.id,
      sourceMeasurementVersionId: orderVersion.id,
      supersededByResnapshotAt: null,
      values: {
        create: [
          {
            fieldKey: "chest",
            value: "98.00",
            unit: "cm",
          },
        ],
      },
    },
    include: {
      values: true,
    },
  });
  assert(typeof activeSnapshot2.id === "string", "Expected second active snapshot to succeed after first is superseded");
  assert(Number(activeSnapshot2.values[0].value) === 98, "Expected new active snapshot value to match 98.00");

  // Attempting a third active snapshot while activeSnapshot2 is active must fail
  let thirdActiveSnapshotRejected = false;
  try {
    await prisma.orderMeasurementSnapshot.create({
      data: {
        orderId: testOrder.id,
        sourceMeasurementVersionId: orderVersion.id,
        supersededByResnapshotAt: null,
      },
    });
  } catch {
    thirdActiveSnapshotRejected = true;
  }
  assert(thirdActiveSnapshotRejected, "Expected third active snapshot to be rejected while second is active");

  // 9. Cascade delete checks:
  // Deleting activeSnapshot2 cascades to its snapshot values
  await prisma.orderMeasurementSnapshot.delete({
    where: { id: activeSnapshot2.id },
  });
  const remainingSnapshotValues = await prisma.orderMeasurementSnapshotValue.count({
    where: { orderMeasurementSnapshotId: activeSnapshot2.id },
  });
  assert(remainingSnapshotValues === 0, "Expected cascade deletion of snapshot values when snapshot deleted");

  // Clean up remaining snapshot, history, and order
  await prisma.orderMeasurementSnapshot.delete({
    where: { id: activeSnapshot1.id },
  });
  await prisma.orderStatusHistory.delete({
    where: { id: history.id },
  });

  // Deleting order cascades to order_items
  await prisma.order.delete({
    where: { id: testOrder.id },
  });
  const remainingOrderItems = await prisma.orderItem.count({
    where: { orderId: testOrder.id },
  });
  assert(remainingOrderItems === 0, "Expected cascade deletion of order items when order deleted");

  // Clean up remaining prerequisites
  await prisma.measurementVersion.delete({ where: { id: orderVersion.id } });
  await prisma.customer.delete({ where: { id: orderCustomer.id } });
  await prisma.garmentType.delete({ where: { id: orderGarment.id } });
  await prisma.orderNumberCounter.deleteMany({ where: { year: checkYear } });

  console.log("Order models and partial unique index check passed. Successfully verified constraints, partial index, and cascade delete.");
}

check()
  .catch((err) => {
    console.error("Prisma check failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
