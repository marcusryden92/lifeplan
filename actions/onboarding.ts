"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function completeOnboarding(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.user.update({
    where: { id: session.user.id },
    data: { onboardedAt: new Date() },
  });
}

export async function getOnboardingStatus(): Promise<{ onboarded: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboardedAt: true },
  });

  return { onboarded: user?.onboardedAt != null };
}
