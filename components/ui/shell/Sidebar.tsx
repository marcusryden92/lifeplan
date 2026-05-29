"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "../ThemeProvider";
import { useCapture } from "./CaptureContext";
import { NAV_ITEMS } from "./nav";
import {
  sidebar,
  brand,
  brandLogo,
  brandText,
  navItem,
  navItemActive,
  navGlyph,
  navLabel,
  spacer,
  footerRow,
  avatar,
  footerText,
  footerName,
  collapseChevronIcon,
} from "./Sidebar.css";
import { caption } from "@/lib/theme";

const COLLAPSE_KEY = "circadium.sidebar.collapsed";

type Props = {
  userName?: string;
  userInitial?: string;
};

export function Sidebar({ userName = "Marcus", userInitial = "M" }: Props) {
  const pathname = usePathname() ?? "";
  const { dark, toggle } = useTheme();
  const { setOpen: setCaptureOpen } = useCapture();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed, hydrated]);

  return (
    <aside
      className={sidebar}
      data-collapsed={collapsed}
      aria-label="Main navigation"
    >
      <div className={brand} title="Circadium">
        <span className={brandLogo} aria-hidden />
        <span className={brandText}>Circadium</span>
      </div>

      {NAV_ITEMS.map((item) => {
        const isActive =
          item.kind === "route" && item.href
            ? pathname === item.href || pathname.startsWith(`${item.href}/`)
            : false;
        const className = `${navItem} ${isActive ? navItemActive : ""}`;

        const Icon = item.icon;

        if (item.kind === "capture") {
          return (
            <button
              key={item.key}
              type="button"
              className={className}
              onClick={() => setCaptureOpen(true)}
              title="Capture (⌘K)"
            >
              <span className={navGlyph}>
                <Icon size={20} strokeWidth={2} aria-hidden />
              </span>
              <span className={navLabel}>{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href ?? "#"}
            className={className}
            title={item.label}
          >
            <span className={navGlyph}>
              <Icon size={20} strokeWidth={2} aria-hidden />
            </span>
            <span className={navLabel}>{item.label}</span>
          </Link>
        );
      })}

      <div className={spacer} />

      <button
        type="button"
        className={navItem}
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
      >
        <span className={navGlyph}>
          <span className={collapseChevronIcon} aria-hidden>
            <ChevronLeft size={20} strokeWidth={2} />
          </span>
        </span>
        <span className={navLabel}>Collapse</span>
      </button>

      <button
        type="button"
        className={navItem}
        onClick={toggle}
        title={dark ? "Light mode" : "Dark mode"}
      >
        <span className={navGlyph}>
          {dark ? (
            <Sun size={20} strokeWidth={2} aria-hidden />
          ) : (
            <Moon size={20} strokeWidth={2} aria-hidden />
          )}
        </span>
        <span className={navLabel}>{dark ? "Light mode" : "Dark mode"}</span>
      </button>

      <div className={footerRow}>
        <div className={avatar} aria-hidden>
          {userInitial}
        </div>
        <div className={footerText}>
          <div className={footerName}>{userName}</div>
          <span className={caption} style={{ fontSize: 9.5 }}>
            Beta member
          </span>
        </div>
      </div>
    </aside>
  );
}
