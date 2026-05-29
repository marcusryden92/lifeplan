"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCapture } from "./CaptureContext";
import { MOBILE_TABS } from "./nav";
import {
  tabBar,
  tab,
  tabActive,
  tabGlyph,
  tabUnderline,
  captureTabWrapper,
  captureButton,
} from "./MobileTabs.css";

export function MobileTabs() {
  const pathname = usePathname() ?? "";
  const { setOpen: setCaptureOpen } = useCapture();

  return (
    <nav className={tabBar} aria-label="Primary navigation">
      {MOBILE_TABS.map((item) => {
        const Icon = item.icon;
        if (item.key === "capture") {
          return (
            <div key={item.key} className={captureTabWrapper}>
              <button
                type="button"
                className={captureButton}
                onClick={() => setCaptureOpen(true)}
                aria-label="Capture"
              >
                <Icon size={26} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
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
            {isActive && <span aria-hidden className={tabUnderline} />}
          </Link>
        );
      })}
    </nav>
  );
}
