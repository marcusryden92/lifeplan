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
  const session = await auth();
  if (session?.user?.id) {
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { onboardedAt: true },
      });
      needsOnboarding = user?.onboardedAt == null;
    } catch {
      // If the check fails, don't trap the user in setup — fall through to the
      // app; the dashboard SetupChecklist still covers resuming it.
      needsOnboarding = false;
    }
  }

  return (
    <ProtectedProviders needsOnboarding={needsOnboarding}>
      {children}
    </ProtectedProviders>
  );
}
