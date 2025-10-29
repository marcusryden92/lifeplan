import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "./generated/client";

const prisma = new PrismaClient();

async function main() {
  // Basic admin account so the app has a predictable login during development.
  const passwordHash = await bcrypt.hash("password", 10);

  await prisma.user.upsert({
    where: { email: "admin@lifeplan.com" },
    update: {
      name: "Admin User",
    },
    create: {
      email: "admin@lifeplan.com",
      name: "Admin User",
      emailVerified: new Date(),
      password: passwordHash,
      role: UserRole.ADMIN,
    },
  });
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
