import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schemas",
  migrations: {
    path: "prisma/migrations",
    seed: "pnpm db:seed",
  },
});
