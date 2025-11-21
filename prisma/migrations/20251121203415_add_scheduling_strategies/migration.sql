-- CreateEnum
CREATE TYPE "public"."StrategyRuleType" AS ENUM ('URGENCY', 'EARLIEST_SLOT', 'PREFERRED_TIME', 'TASK_TYPE_PREFERENCE', 'CONFLICT_AVOIDANCE', 'ENERGY_LEVEL', 'DAY_PREFERENCE', 'BUFFER_TIME');

-- CreateEnum
CREATE TYPE "public"."TaskTypeEnum" AS ENUM ('EXERCISE', 'DEEP_WORK', 'ADMIN', 'MEETING', 'CREATIVE', 'ROUTINE', 'HABIT', 'SOCIAL');

-- CreateEnum
CREATE TYPE "public"."PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."EnergyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "public"."SchedulingStrategies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingStrategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StrategyRules" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "ruleType" "public"."StrategyRuleType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "config" JSONB NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "StrategyRules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskPreferences" (
    "id" TEXT NOT NULL,
    "plannerId" TEXT NOT NULL,
    "taskType" "public"."TaskTypeEnum",
    "preferredDays" INTEGER[],
    "preferredStartTime" TEXT,
    "preferredEndTime" TEXT,
    "avoidDays" INTEGER[],
    "priority" "public"."PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "energyLevel" "public"."EnergyLevel",
    "allowFlexibility" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TaskPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskPreferences_plannerId_key" ON "public"."TaskPreferences"("plannerId");

-- AddForeignKey
ALTER TABLE "public"."SchedulingStrategies" ADD CONSTRAINT "SchedulingStrategies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StrategyRules" ADD CONSTRAINT "StrategyRules_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "public"."SchedulingStrategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
