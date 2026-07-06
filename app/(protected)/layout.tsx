import { type ReactNode } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProtectedProviders } from "./ProtectedProviders";

// Server component: resolve whether the user still needs first-run setup before
// the first paint, so the onboarding overlay renders in its correct state
// immediately instead of popping in after a client round-trip.
export default async function CircadiumLayout({
  children,
}: {
  children: ReactNode;
}) {
  let needsOnboarding = false;
  try {
    const session = await auth();
    if (session?.user?.id) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { onboardedAt: true },
      });
      needsOnboarding = user?.onboardedAt == null;
    }
  } catch {
    // If the session/DB check fails, don't trap the user in setup — fall
    // through to the app; every onboarding surface is reachable individually.
    needsOnboarding = false;
  }

  return (
    <ProtectedProviders needsOnboarding={needsOnboarding}>
      {children}
    </ProtectedProviders>
  );
}
