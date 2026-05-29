"use client";

import type { ReactNode } from "react";
import StoreProvider from "@/context/StoreProvider";
import UserProvider from "@/context/UserProvider";
import CalendarProvider from "@/context/CalendarProvider";

export default function CalendarLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <UserProvider>
        <CalendarProvider>{children}</CalendarProvider>
      </UserProvider>
    </StoreProvider>
  );
}
