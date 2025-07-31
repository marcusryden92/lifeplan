/*
  Warnings:

  - Made the column `extendedProps` on table `calendar_events` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "calendar_events" ALTER COLUMN "extendedProps" SET NOT NULL;
