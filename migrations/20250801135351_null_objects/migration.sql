/*
  Warnings:

  - You are about to drop the `event_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `planners` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `simple_events` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "event_templates" DROP CONSTRAINT "event_templates_userId_fkey";

-- DropForeignKey
ALTER TABLE "planners" DROP CONSTRAINT "planners_userId_fkey";

-- DropForeignKey
ALTER TABLE "simple_events" DROP CONSTRAINT "simple_events_userId_fkey";

-- DropTable
DROP TABLE "event_templates";

-- DropTable
DROP TABLE "planners";

-- DropTable
DROP TABLE "simple_events";

-- CreateTable
CREATE TABLE "SimpleEvents" (
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

    CONSTRAINT "SimpleEvents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "PlanType",
    "isReady" BOOLEAN,
    "duration" INTEGER,
    "deadline" TIMESTAMP(3),
    "starts" TIMESTAMP(3),
    "dependency" TEXT,
    "completedStartTime" TIMESTAMP(3),
    "completedEndTime" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "Planners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTemplates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDay" "WeekDayType" NOT NULL,
    "startTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EventTemplates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SimpleEvents" ADD CONSTRAINT "SimpleEvents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planners" ADD CONSTRAINT "Planners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTemplates" ADD CONSTRAINT "EventTemplates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
