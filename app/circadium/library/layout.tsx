"use client";

import type { ReactNode } from "react";
import CalendarProvider from "@/context/CalendarProvider";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return <CalendarProvider>{children}</CalendarProvider>;
}
