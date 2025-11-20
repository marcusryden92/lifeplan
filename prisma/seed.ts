import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "./generated/client";
import { generateTemplates } from "./seed-helpers/generateTemplates";
import {
  generatePlanners,
  plannerSeedData,
} from "./seed-helpers/generatePlanners";
import { generatePlans, planSeedData } from "./seed-helpers/generatePlans";

const prisma = new PrismaClient();

async function main() {
  const userId = "1";

  // Basic admin account so the app has a predictable login during development.
  const passwordHash = await bcrypt.hash("password", 10);

  await prisma.user.upsert({
    where: { email: "admin@lifeplan.com" },
    update: {
      name: "Admin User",
    },
    create: {
      id: userId,
      email: "admin@lifeplan.com",
      name: "Admin User",
      emailVerified: new Date(),
      password: passwordHash,
      role: UserRole.ADMIN,
    },
  });

  // Seed event templates
  const templates = generateTemplates(userId);
  await prisma.eventTemplate.createMany({ data: templates });

  // Seed planner goals
  const planners = generatePlanners(userId);
  await prisma.planner.createMany({ data: planners });

  // Seed plans (scheduled tasks)
  const plans = generatePlans(userId);
  await prisma.planner.createMany({ data: plans });

  console.log("✓ Seeding completed successfully");
  console.log(`  - User: admin@lifeplan.com`);
  console.log(`  - Event templates: ${templates.length}`);
  console.log(`  - Planner goals: ${plannerSeedData.length}`);
  console.log(`  - Planner plans: ${planSeedData.length}`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
