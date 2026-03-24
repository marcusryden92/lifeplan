-- AlterEnum
ALTER TYPE "public"."PlannerType" ADD VALUE 'category';

-- AlterTable
ALTER TABLE "public"."Categories" ALTER COLUMN "createdAt" SET DEFAULT NOW()::text,
ALTER COLUMN "createdAt" SET DATA TYPE TEXT,
ALTER COLUMN "updatedAt" SET DATA TYPE TEXT;
