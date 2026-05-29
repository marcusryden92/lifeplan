import type { ReactNode } from "react";
import { AppShell } from "@/components/ui";

export default function CircadiumLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell userName="Marcus" userInitial="M">
      {children}
    </AppShell>
  );
}
