/*
  Warnings:

  - You are about to drop the column `completed` on the `planners` table. All the data in the column will be lost.
  - The `type` column on the `planners` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('task', 'plan', 'goal');

-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "extendedProps" TEXT,
ALTER COLUMN "start" SET DATA TYPE TEXT,
ALTER COLUMN "end" SET DATA TYPE TEXT,
ALTER COLUMN "rrule" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "planners" DROP COLUMN "completed",
ADD COLUMN     "completedEndTime" TEXT,
ADD COLUMN     "completedStartTime" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "PlanType",
ALTER COLUMN "deadline" SET DATA TYPE TEXT,
ALTER COLUMN "starts" SET DATA TYPE TEXT;
