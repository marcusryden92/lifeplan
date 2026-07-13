"use client";

import { type ReactNode } from "react";
import StoreProvider from "@/context/StoreProvider";
import UserProvider from "@/context/UserProvider";
import CalendarProvider from "@/context/CalendarProvider";
import { AppShell, AssistantProvider } from "@/components/ui";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import { GlobalAssistant } from "@/components/draft/GlobalAssistant";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { OnboardingOverlay } from "./onboarding/OnboardingOverlay";

export function ProtectedProviders({
  children,
  needsOnboarding,
}: {
  children: ReactNode;
  needsOnboarding: boolean;
}) {
  return (
    <StoreProvider>
      <UserProvider>
        <CalendarProvider>
          <CircadiumShell needsOnboarding={needsOnboarding}>
            {children}
          </CircadiumShell>
        </CalendarProvider>
      </UserProvider>
    </StoreProvider>
  );
}

function CircadiumShell({
  children,
  needsOnboarding,
}: {
  children: ReactNode;
  needsOnboarding: boolean;
}) {
  const user = useCurrentUser();
  const userName = user?.name ?? user?.email ?? "";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "?";
  return (
    <AssistantProvider>
      <AppShell
        userName={userName}
        userInitial={userInitial}
        assistantSlot={<GlobalAssistant />}
        // First-run setup renders as an opaque overlay inside the shell canvas
        // (covers the sidebar, clips to the shell rounding). Its initial state
        // is resolved on the server, so there is no post-hydration flash.
        overlaySlot={
          <OnboardingOverlay initialNeedsOnboarding={needsOnboarding} />
        }
        loadingSlot={<AppLoadingScreen />}
      >
        {children}
      </AppShell>
    </AssistantProvider>
  );
}
