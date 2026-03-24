-- CreateEnum
CREATE TYPE "public"."TransportMode" AS ENUM ('DRIVING', 'TRANSIT', 'BICYCLING', 'WALKING');

-- AlterEnum
ALTER TYPE "public"."PlannerType" ADD VALUE 'travel';

-- AlterTable
ALTER TABLE "public"."Planners" ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "public"."UserSchedulingPreferences" ADD COLUMN     "defaultTransportMode" "public"."TransportMode" NOT NULL DEFAULT 'DRIVING',
ALTER COLUMN "bufferTimeMinutes" SET DEFAULT 10;

-- CreateTable
CREATE TABLE "public"."Locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TravelTimes" (
    "id" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "transportMode" "public"."TransportMode" NOT NULL,
    "googleRushHourMinutes" INTEGER NOT NULL,
    "googleRegularMinutes" INTEGER NOT NULL,
    "googleNightMinutes" INTEGER NOT NULL,
    "customRushHourMinutes" INTEGER,
    "customRegularMinutes" INTEGER,
    "customNightMinutes" INTEGER,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelTimes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Locations_userId_placeId_key" ON "public"."Locations"("userId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelTimes_fromLocationId_toLocationId_transportMode_key" ON "public"."TravelTimes"("fromLocationId", "toLocationId", "transportMode");

-- AddForeignKey
ALTER TABLE "public"."Planners" ADD CONSTRAINT "Planners_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Locations" ADD CONSTRAINT "Locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TravelTimes" ADD CONSTRAINT "TravelTimes_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "public"."Locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TravelTimes" ADD CONSTRAINT "TravelTimes_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "public"."Locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
