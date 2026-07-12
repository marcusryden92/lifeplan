"use client";

import Link from "next/link";
import { Locate, X } from "lucide-react";
import { vars } from "@/components/ui";
import type { RenderedEngineMessage } from "@/utils/renderEngineMessage";
import type { EngineTone } from "@/utils/engineTones";
import { EngineControls } from "./EngineControls";
import {
  engineHeader,
  engineLastRun,
  engineSummary,
  engineList,
  engineCard,
  engineCardHead,
  engineCardLink,
  engineCardContent,
  engineDismissBtn,
  engineGoToBtn,
  engineTag,
  engineCardTitle,
  engineCardBody,
} from "../page.css";

export type ConsoleMessage = RenderedEngineMessage & {
  drillTo: string | null;
};

export function toneColor(tone: EngineTone) {
  switch (tone) {
    case "fail":
      return vars.status.error;
    case "warn":
      return vars.status.warning;
    case "done":
      return vars.status.success;
    case "info":
    default:
      return vars.status.info;
  }
}

// Compact relative timestamp for the console header. Null means the engine
// hasn't run this session (cold load renders persisted output only).
function formatLastRun(iso: string | null): string {
  if (!iso) return "—";
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type EngineConsoleProps = {
  messages: ConsoleMessage[];
  lastEngineRunAt: string | null;
  failCount: number;
  warnCount: number;
  placedCount: number;
  onDismiss: (id: string) => void;
  onGoToDate: (iso: string) => void;
};

// Header + message list + tuning controls, container-agnostic: rendered
// inside the docked engine column on desktop and the mobile bottom sheet.
export function EngineConsole({
  messages,
  lastEngineRunAt,
  failCount,
  warnCount,
  placedCount,
  onDismiss,
  onGoToDate,
}: EngineConsoleProps) {
  return (
    <>
      <div className={engineHeader}>
        <span className={engineLastRun}>
          last run · {formatLastRun(lastEngineRunAt)}
        </span>
        <div className={engineSummary}>
          {failCount} fail · {warnCount} warn · {placedCount} placed
        </div>
      </div>

      <div className={engineList}>
        {messages.map((m) => {
          const tc = toneColor(m.tone);
          return (
            <div
              key={m.id}
              className={engineCard}
              style={{
                borderColor: `color-mix(in srgb, ${tc} 60%, transparent)`,
              }}
            >
              {m.drillTo && (
                <Link
                  href={`/items/${m.drillTo}`}
                  className={engineCardLink}
                  aria-label={`Open ${m.title}`}
                >
                  {m.title}
                </Link>
              )}
              {m.goToDate && (
                <button
                  type="button"
                  className={engineGoToBtn}
                  onClick={() => onGoToDate(m.goToDate!)}
                  aria-label="Go to date in calendar"
                  title="Go to date"
                >
                  <Locate size={13} strokeWidth={2.2} />
                </button>
              )}
              <button
                type="button"
                className={engineDismissBtn}
                onClick={() => onDismiss(m.id)}
                aria-label="Dismiss message"
                title="Dismiss"
              >
                <X size={13} strokeWidth={2.2} />
              </button>
              <div className={engineCardContent}>
                <div className={engineCardHead}>
                  <span className={engineTag} style={{ background: tc }}>
                    {m.tag}
                  </span>
                  <span className={engineCardTitle}>{m.title}</span>
                </div>
                <div className={engineCardBody}>{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      <EngineControls />
    </>
  );
}
