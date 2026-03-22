import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schemas",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --project prisma/tsconfig.seed.json prisma/seed.ts",
  },
});
