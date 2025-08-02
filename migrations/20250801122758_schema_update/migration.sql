/*
  Warnings:

  - The `deadline` column on the `planners` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `starts` column on the `planners` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `completedEndTime` column on the `planners` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `completedStartTime` column on the `planners` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `calendar_events` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_userId_fkey";

-- AlterTable
ALTER TABLE "planners" DROP COLUMN "deadline",
ADD COLUMN     "deadline" TIMESTAMP(3),
DROP COLUMN "starts",
ADD COLUMN     "starts" TIMESTAMP(3),
DROP COLUMN "completedEndTime",
ADD COLUMN     "completedEndTime" TIMESTAMP(3),
DROP COLUMN "completedStartTime",
ADD COLUMN     "completedStartTime" TIMESTAMP(3);

-- DropTable
DROP TABLE "calendar_events";

-- CreateTable
CREATE TABLE "simple_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "userId" TEXT NOT NULL,
    "rrule" TEXT,
    "isTemplateItem" BOOLEAN NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "borderColor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simple_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "simple_events" ADD CONSTRAINT "simple_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
