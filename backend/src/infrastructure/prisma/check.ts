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
}

check()
  .catch((err) => {
    console.error("Prisma check failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
