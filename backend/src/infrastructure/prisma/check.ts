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
}

check()
  .catch((err) => {
    console.error("Prisma check failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
