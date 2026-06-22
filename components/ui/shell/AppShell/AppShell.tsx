"use client";

import { type ReactNode } from "react";
import { Backdrop } from "../../Backdrop";
import { Grain } from "../../Grain";
import { Sidebar } from "../Sidebar";
import { MobileTabs } from "../MobileTabs";
import { CaptureProvider } from "../CaptureContext";
import { CapturePalette } from "../CapturePalette";
import {
  bezelFrame,
  canvas,
  contentRow,
  mainColumn,
  desktopOnly,
  mobileOnly,
} from "./AppShell.css";

type Props = {
  children: ReactNode;
  backdrop?: "blob" | "pinstripe" | "both" | "none";
  userName?: string;
  userInitial?: string;
};

export function AppShell({
  children,
  backdrop = "blob",
  userName,
  userInitial,
}: Props) {
  return (
    <CaptureProvider>
      <div className={bezelFrame}>
        <div className={canvas}>
          <Backdrop variant={backdrop} />
          <Grain />
          <div className={contentRow}>
            <div className={desktopOnly}>
              <Sidebar userName={userName} userInitial={userInitial} />
            </div>
            <div className={mainColumn}>{children}</div>
          </div>
          <div className={mobileOnly}>
            <MobileTabs />
          </div>
          <CapturePalette />
        </div>
      </div>
    </CaptureProvider>
  );
}
