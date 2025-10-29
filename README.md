## Start Local Server

pnpm run dev

## Prisma Database

# Generate Prisma Client (update types and client code)

pnpm run prisma generate

# Apply migrations to dev server

pnpm run prisma migrate dev --name example_name
pnpm run prisma migrate deploy

## Local Postgres Workflow

- `pnpm db:start` spins up Dockerized Postgres for development.
- `pnpm db:stop` shuts it down.
- `pnpm db:seed` runs the Prisma seed script with `.env.development.local` loaded (use it whenever you need baseline data).
- `pnpm prisma:migrate:deploy` applies migrations against the Docker database with `.env.development.local`.
- `pnpm db:reset:dev` wipes the Docker volume, restarts Postgres, runs pending migrations, and then re-seeds with `pnpm db:seed`.
