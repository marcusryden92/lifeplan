"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Settings, Moon, Sun, LogOut } from "lucide-react";
import { useShellOverlayOpen } from "../ShellOverlayContext";
import { useTheme } from "../../ThemeProvider";
import { BottomSheet } from "../../BottomSheet";
import { MOBILE_TABS } from "../nav";
import {
  tabBar,
  tab,
  tabActive,
  tabGlyph,
  tabUnderline,
  tabUnderlineActive,
  captureTabWrapper,
  captureButton,
  sheetItem,
  sheetItemDanger,
  sheetItemIcon,
} from "./MobileTabs.css";

export function MobileTabs() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const overlayOpen = useShellOverlayOpen();
  const [moreOpen, setMoreOpen] = useState(false);

  // A full-screen shell surface (AI assistant, WeekStructureModal) is open —
  // step the floating menu out of the way instead of floating over it.
  if (overlayOpen) return null;

  const goSettings = () => {
    setMoreOpen(false);
    router.push("/settings");
  };

  return (
    <>
      <nav className={tabBar} aria-label="Primary navigation">
        {MOBILE_TABS.map((item) => {
          const Icon = item.icon;
          if (item.key === "capture") {
            return (
              <div key={item.key} className={captureTabWrapper}>
                <button
                  type="button"
                  className={captureButton}
                  onClick={() => router.push("/capture")}
                  aria-label="Capture"
                >
                  <Icon size={26} strokeWidth={2.5} aria-hidden />
                </button>
              </div>
            );
          }
          if (item.key === "more") {
            const isActive = pathname.startsWith("/settings");
            return (
              <button
                key={item.key}
                type="button"
                className={`${tab} ${isActive || moreOpen ? tabActive : ""}`}
                onClick={() => setMoreOpen(true)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
              >
                <span className={tabGlyph}>
                  <Icon size={20} strokeWidth={2} aria-hidden />
                </span>
                <span>{item.label}</span>
                <span
                  aria-hidden
                  className={`${tabUnderline} ${isActive ? tabUnderlineActive : ""}`}
                />
              </button>
            );
          }
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.key}
              href={item.href ?? "#"}
              className={`${tab} ${isActive ? tabActive : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={tabGlyph}>
                <Icon size={20} strokeWidth={2} aria-hidden />
              </span>
              <span>{item.label}</span>
              <span
                aria-hidden
                className={`${tabUnderline} ${isActive ? tabUnderlineActive : ""}`}
              />
            </Link>
          );
        })}
      </nav>

      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="More">
        <button type="button" className={sheetItem} onClick={goSettings}>
          <span className={sheetItemIcon}>
            <Settings size={18} strokeWidth={2} aria-hidden />
          </span>
          Settings
        </button>
        <button type="button" className={sheetItem} onClick={toggle}>
          <span className={sheetItemIcon}>
            {dark ? (
              <Sun size={18} strokeWidth={2} aria-hidden />
            ) : (
              <Moon size={18} strokeWidth={2} aria-hidden />
            )}
          </span>
          {dark ? "Light mode" : "Dark mode"}
        </button>
        <button
          type="button"
          className={`${sheetItem} ${sheetItemDanger}`}
          onClick={() => signOut()}
        >
          <span className={sheetItemIcon}>
            <LogOut size={18} strokeWidth={2} aria-hidden />
          </span>
          Sign out
        </button>
      </BottomSheet>
    </>
  );
}
