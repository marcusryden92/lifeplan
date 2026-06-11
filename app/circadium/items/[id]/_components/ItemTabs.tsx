"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tabsStrip, tab, tabActive, tabCount } from "./ItemTabs.css";

interface Tab {
  key: string;
  label: string;
  href: string;
  count?: number;
}

interface ItemTabsProps {
  itemId: string;
  subtaskCount: number;
}

export function ItemTabs({ itemId, subtaskCount }: ItemTabsProps) {
  const pathname = usePathname();
  const base = `/circadium/items/${itemId}`;

  const tabs: Tab[] = [
    { key: "overview", label: "Overview", href: base },
    { key: "schedule", label: "Schedule", href: `${base}/schedule` },
    {
      key: "subtasks",
      label: "Subtasks",
      href: `${base}/subtasks`,
      count: subtaskCount,
    },
    { key: "activity", label: "Activity", href: `${base}/activity` },
  ];

  return (
    <div className={tabsStrip} role="tablist">
      {tabs.map((t) => {
        const isActive =
          t.href === base
            ? pathname === base || pathname === `${base}/`
            : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.key}
            href={t.href}
            role="tab"
            aria-selected={isActive}
            className={`${tab} ${isActive ? tabActive : ""}`}
          >
            <span>{t.label}</span>
            {typeof t.count === "number" && (
              <span className={tabCount}>{t.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
