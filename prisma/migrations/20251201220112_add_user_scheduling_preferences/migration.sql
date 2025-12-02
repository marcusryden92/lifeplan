-- CreateTable
CREATE TABLE "public"."UserSchedulingPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bufferTimeMinutes" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSchedulingPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSchedulingPreferences_userId_key" ON "public"."UserSchedulingPreferences"("userId");
