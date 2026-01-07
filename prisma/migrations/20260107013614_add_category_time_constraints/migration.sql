-- AlterTable
ALTER TABLE "public"."Categories" ADD COLUMN     "isStrict" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "timeSlots" JSONB;

-- AddForeignKey
ALTER TABLE "public"."Categories" ADD CONSTRAINT "Categories_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
