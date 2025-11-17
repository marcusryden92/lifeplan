import bcrypt from "bcryptjs";
import { EventTemplate, PrismaClient, UserRole } from "./generated/client";
import { WeekDayType } from "@/types/calendarTypes";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

const days = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const generateTemplate = () => {
  const templateArray: EventTemplate[] = [];

  for (let i = 0; i < days.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId: "1", // Replace with actual user ID after creation
      title: "Sleep",
      startDay: days[i] as WeekDayType,
      startTime: "00:00",
      duration: 360,
      color: "#0c3055ff",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  for (let i = 0; i < days.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId: "1", // Replace with actual user ID after creation
      title: "Sleep",
      startDay: days[i] as WeekDayType,
      startTime: "21:00",
      duration: 180,
      color: "#0c3055ff",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  for (let i = 0; i < days.length; i++) {
    templateArray.push({
      id: uuidv4(),
      userId: "1", // Replace with actual user ID after creation
      title: "Lunch Break",
      startDay: days[i] as WeekDayType,
      startTime: "12:00",
      duration: 60,
      color: "#0c3055ff",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return templateArray;
};

async function main() {
  // Basic admin account so the app has a predictable login during development.
  const passwordHash = await bcrypt.hash("password", 10);

  await prisma.user.upsert({
    where: { email: "admin@lifeplan.com" },
    update: {
      name: "Admin User",
    },
    create: {
      id: "1",
      email: "admin@lifeplan.com",
      name: "Admin User",
      emailVerified: new Date(),
      password: passwordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.eventTemplate.createMany({ data: generateTemplate() });
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
