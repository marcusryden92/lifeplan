"use client";

import Link from "next/link";
import { Locate, X } from "lucide-react";
import { vars } from "@/components/ui";
import type { RenderedEngineMessage } from "@/utils/renderEngineMessage";
import type { EngineTone } from "@/utils/engineTones";
import { EngineControls } from "./EngineControls";
import { formatLastRun } from "@/utils/timeFormatting";
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
