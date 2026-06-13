"use client";

import type { ReactNode } from "react";
import StoreProvider from "@/context/StoreProvider";
import UserProvider from "@/context/UserProvider";
import CalendarProvider from "@/context/CalendarProvider";
import { AppShell } from "@/components/ui";

export default function CircadiumLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <UserProvider>
        <CalendarProvider>
          <AppShell userName="Marcus" userInitial="M">
            {children}
          </AppShell>
        </CalendarProvider>
      </UserProvider>
    </StoreProvider>
  );
}
