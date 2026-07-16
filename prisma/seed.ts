import * as dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../generated/client";

// User calendar data seeding is deactivated so a reseeded account lands in
// first-run onboarding with an empty calendar. Re-enable the imports below
// alongside the seeding blocks in main() to restore the demo dataset.
// import { generateTemplates } from "./seed-helpers/generateTemplates";
// import { generatePlanners } from "./seed-helpers/generatePlanners";
// import {
//   generateLocations,
//   generateTravelTimes,
// } from "./seed-helpers/generateLocations";
// import { generateCategories } from "./seed-helpers/generateCategories";

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
      // Reset so a reseeded admin runs through first-run onboarding again.
      onboardedAt: null,
    },
    create: {
      id: userId,
      email: "admin@lifeplan.com",
      name: "Admin User",
      emailVerified: new Date(),
      password: passwordHash,
      role: UserRole.ADMIN,
      // onboardedAt left null: first login funnels through onboarding.
    },
  });

  // Clear any existing calendar data so the account starts empty (onboarding
  // begins from a blank calendar). The admin is upserted rather than deleted,
  // so every per-user table the app reads (see fetchCalendarData) must be
  // cleared explicitly here — a table that only cascades on User delete would
  // otherwise survive the reseed. Order matters for foreign keys.
  //
  // Engine-derived output first. categoryEvents would cascade with their
  // Category but the explicit delete is cheap insurance; travelEvents would
  // otherwise be left with null location FKs when Location is dropped below
  // (onDelete: SetNull), producing orphans; simpleEvents (calendar) and
  // engineMessages only cascade on User delete.
  await prisma.categoryEvent.deleteMany({});
  await prisma.travelEvent.deleteMany({});
  await prisma.simpleEvent.deleteMany({}); // cascades EventExtendedProps
  await prisma.engineMessage.deleteMany({});
  // Precedence graph. QueueMembers and PlannerDependencies cascade from the
  // Planner delete below, but a Queue row has no Planner FK (it only cascades
  // on User delete), so stale queues would linger without this.
  await prisma.plannerDependency.deleteMany({});
  await prisma.queue.deleteMany({}); // cascades QueueMember
  // User-authored inputs.
  await prisma.planner.deleteMany({});
  await prisma.eventTemplate.deleteMany({});
  await prisma.category.deleteMany({}); // cascades CategoryTimeWindow
  await prisma.travelTime.deleteMany({});
  await prisma.location.deleteMany({});
  // AI-assistant chat history, so a reseeded account has no leftover chats.
  await prisma.draftConversation.deleteMany({});

  // User calendar data seeding is deactivated: onboarding needs an empty
  // calendar. Re-enable this block (and the imports at the top) to restore the
  // demo dataset of locations, travel times, categories, templates, planners,
  // and past uncompleted items.
  //
  // const locations = generateLocations(userId);
  // await prisma.location.createMany({ data: locations });
  //
  // const travelTimes = generateTravelTimes(userId);
  // await prisma.travelTime.createMany({ data: travelTimes });
  //
  // const categories = generateCategories(userId);
  // for (const category of categories) {
  //   await prisma.category.create({ data: category });
  // }
  //
  // const templates = generateTemplates(userId);
  // await prisma.eventTemplate.createMany({ data: templates });
  //
  // const planners = generatePlanners(userId);
  // await prisma.planner.createMany({ data: planners });

  console.log("Seeding completed: admin account only (empty calendar).");
  console.log(`  - User: admin@lifeplan.com (not onboarded)`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
