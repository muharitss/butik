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
}

check()
  .catch((err) => {
    console.error("Prisma check failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
