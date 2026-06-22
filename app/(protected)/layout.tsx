"use client";

import type { ReactNode } from "react";
import StoreProvider from "@/context/StoreProvider";
import UserProvider from "@/context/UserProvider";
import CalendarProvider from "@/context/CalendarProvider";
import { AppShell } from "@/components/ui";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function CircadiumLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <UserProvider>
        <CalendarProvider>
          <CircadiumShell>{children}</CircadiumShell>
        </CalendarProvider>
      </UserProvider>
    </StoreProvider>
  );
}

function CircadiumShell({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const userName = user?.name ?? user?.email ?? "";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "?";
  return (
    <AppShell userName={userName} userInitial={userInitial}>
      {children}
    </AppShell>
  );
}
