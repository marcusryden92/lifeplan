-- AlterTable
ALTER TABLE "public"."EventTemplates" ADD COLUMN     "locationId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."EventTemplates" ADD CONSTRAINT "EventTemplates_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
