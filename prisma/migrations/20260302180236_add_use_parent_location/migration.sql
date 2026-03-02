-- AlterTable
ALTER TABLE "public"."Categories" ALTER COLUMN "createdAt" SET DEFAULT NOW()::text;

-- AlterTable
ALTER TABLE "public"."Planners" ADD COLUMN     "useParentLocation" BOOLEAN NOT NULL DEFAULT false;
