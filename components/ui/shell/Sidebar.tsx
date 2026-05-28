"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "../ThemeProvider";
import { useCapture } from "./CaptureContext";
import { NAV_ITEMS } from "./nav";
import {
  sidebar,
  sidebarWidth,
  brand,
  brandCollapsed,
  navItem,
  navItemActive,
  navItemCollapsed,
  navGlyph,
  navLabel,
  spacer,
  footerRow,
  footerRowCollapsed,
  avatar,
  footerText,
  footerName,
  collapseChevron,
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
      className={`${sidebar} ${collapsed ? sidebarWidth.collapsed : sidebarWidth.expanded}`}
      aria-label="Main navigation"
    >
      <button
        type="button"
        className={collapseChevron}
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "›" : "‹"}
      </button>

      <div
        className={`${brand} ${collapsed ? brandCollapsed : ""}`}
        title="Circadium"
      >
        {collapsed ? "c" : "circadium"}
      </div>

      {NAV_ITEMS.map((item) => {
        const isActive =
          item.kind === "route" && item.href
            ? pathname === item.href || pathname.startsWith(`${item.href}/`)
            : false;
        const className = `${navItem} ${isActive ? navItemActive : ""} ${collapsed ? navItemCollapsed : ""}`;

        if (item.kind === "capture") {
          return (
            <button
              key={item.key}
              type="button"
              className={className}
              onClick={() => setCaptureOpen(true)}
              title="Capture (⌘K)"
            >
              <span className={navGlyph}>{item.glyph}</span>
              {!collapsed && <span className={navLabel}>{item.label}</span>}
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
            <span className={navGlyph}>{item.glyph}</span>
            {!collapsed && <span className={navLabel}>{item.label}</span>}
          </Link>
        );
      })}

      <div className={spacer} />

      <button
        type="button"
        className={`${navItem} ${collapsed ? navItemCollapsed : ""}`}
        onClick={toggle}
        title={dark ? "Light mode" : "Dark mode"}
      >
        <span className={navGlyph}>{dark ? "☀" : "☾"}</span>
        {!collapsed && (
          <span className={navLabel}>{dark ? "Light mode" : "Dark mode"}</span>
        )}
      </button>

      <div className={`${footerRow} ${collapsed ? footerRowCollapsed : ""}`}>
        <div className={avatar} aria-hidden>
          {userInitial}
        </div>
        {!collapsed && (
          <div className={footerText}>
            <div className={footerName}>{userName}</div>
            <span className={caption} style={{ fontSize: 9.5 }}>
              Beta member
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
