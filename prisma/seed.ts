import * as dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../lib/generated/db-client";
import { generateTemplates } from "./seed-helpers/generateTemplates";
import {
  generatePlanners,
  plannerSeedData,
} from "./seed-helpers/generatePlanners";
import {
  /* generatePlans, */ planSeedData,
} from "./seed-helpers/generatePlans";
import {
  generateLocations,
  generateTravelTimes,
} from "./seed-helpers/generateLocations";
import { generateCategories } from "./seed-helpers/generateCategories";

// Prisma 7 requires a driver adapter at construction time. Matches the
// pattern used by lib/db.ts so the seed talks to the DB the same way the app
// does. DIRECT_URL is preferred (bypasses pooling for bulk writes), falling
// back to DATABASE_URL.
const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

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

  // Clear existing data (order matters for foreign keys)
  await prisma.planner.deleteMany({});
  await prisma.eventTemplate.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.travelTime.deleteMany({});
  await prisma.location.deleteMany({});

  // Seed locations first (templates reference them)
  const locations = generateLocations(userId);
  await prisma.location.createMany({ data: locations });

  // Seed travel times
  const travelTimes = generateTravelTimes(userId);
  await prisma.travelTime.createMany({ data: travelTimes });

  // Seed categories (createMany doesn't support nested relations, so use individual creates)
  const categories = generateCategories(userId);
  for (const category of categories) {
    await prisma.category.create({ data: category });
  }

  // Seed event templates
  const templates = generateTemplates(userId);
  await prisma.eventTemplate.createMany({ data: templates });

  // Seed planner goals
  const planners = generatePlanners(userId);
  await prisma.planner.createMany({ data: planners });

  // Seed plans (scheduled tasks)
  /*  const plans = generatePlans(userId);
  await prisma.planner.createMany({ data: plans }); */

  console.log("âœ“ Seeding completed successfully");
  console.log(`  - User: admin@lifeplan.com`);
  console.log(`  - Locations: ${locations.length}`);
  console.log(`  - Travel times: ${travelTimes.length}`);
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
