import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count === 0) {
    await prisma.user.create({
      data: {
        name: "Operator",
        role: "owner",
        isActive: true,
      },
    });
    console.log("Seeded initial operator user.");
  } else {
    console.log("Database already seeded, skipping user creation.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
