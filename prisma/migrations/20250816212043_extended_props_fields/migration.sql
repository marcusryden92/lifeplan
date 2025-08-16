/*
  Warnings:

  - You are about to drop the column `isTemplateItem` on the `SimpleEvents` table. All the data in the column will be lost.
  - Added the required column `extendedProps_isTemplateItem` to the `SimpleEvents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."SimpleEvents" DROP COLUMN "isTemplateItem",
ADD COLUMN     "extendedProps_isTemplateItem" BOOLEAN NOT NULL;
