"use client";

import type { ReactNode } from "react";
import StoreProvider from "@/context/StoreProvider";
import UserProvider from "@/context/UserProvider";
import { AppShell } from "@/components/ui";

export default function CircadiumLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <UserProvider>
        <AppShell userName="Marcus" userInitial="M">
          {children}
        </AppShell>
      </UserProvider>
    </StoreProvider>
  );
}
