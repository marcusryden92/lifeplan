-- AlterTable
ALTER TABLE "public"."Planners" ALTER COLUMN "deadline" DROP NOT NULL,
ALTER COLUMN "starts" DROP NOT NULL,
ALTER COLUMN "completedStartTime" DROP NOT NULL,
ALTER COLUMN "completedEndTime" DROP NOT NULL;
