/*
  Warnings:

  - You are about to drop the `SchedulingStrategies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StrategyRules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."SchedulingStrategies" DROP CONSTRAINT "SchedulingStrategies_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."StrategyRules" DROP CONSTRAINT "StrategyRules_strategyId_fkey";

-- DropTable
DROP TABLE "public"."SchedulingStrategies";

-- DropTable
DROP TABLE "public"."StrategyRules";

-- DropEnum
DROP TYPE "public"."StrategyRuleType";
