import type { PrismaConfig } from "prisma";

export default {
  schema: "prisma/schemas",
  migrations: {
    path: "prisma/migrations",
  },
} satisfies PrismaConfig;
