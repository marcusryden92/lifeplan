## Start Local Server

pnpm run dev

## Prisma Database

# Generate Prisma Client (update types and client code)

pnpm run prisma:dev -- generate

# Apply migrations to dev server

pnpm run prisma:dev -- migrate dev --name example_name
pnpm run prisma:dev -- migrate deploy

# Apply migrations to prod server

pnpm run prisma:prod -- migrate dev --name example_name
pnpm run prisma:prod -- migrate deploy
