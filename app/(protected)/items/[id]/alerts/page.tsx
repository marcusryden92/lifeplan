"use client";

import { RootState, AppDispatch } from "@/redux/store";
import { useMemo, useCallback } from "react";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { useSelector, useDispatch } from "react-redux";
import { useItem } from "../_components/ItemContext";
import { dismissEngineMessage } from "@/redux/slices/engineOutputSlice";
import { formatLastRun } from "@/utils/timeFormatting";
import { toneColor } from "@/app/(protected)/calendar/_components/EngineConsole";
import {
  root,
  engineList,
  engineHeader,
  engineLastRun,
  engineCardContent,
  engineSummary,
  engineCardLink,
  engineCard,
  engineDismissBtn,
  engineCardHead,
  engineTag,
  engineCardTitle,
  engineCardBody,
} from "./page.css";
import { X } from "lucide-react";

import useRenderEngineMessages from "@/hooks/useRenderEngineMessage";

export default function ItemAlertsPage() {
  const { item } = useItem();
  const dispatch = useDispatch<AppDispatch>();
  const { planner, locations, queues, engineMessages, calendarEvents } =
    useCalendarProvider();
  const lastEngineRunAt = useSelector(
    (state: RootState) => state.engineOutput.lastEngineRunAt,
  );
  const renderedMessages = useRenderEngineMessages(
    planner,
    locations,
    queues,
    engineMessages,
    item.id,
  );

  const handleDismiss = useCallback(
    (id: string) => dispatch(dismissEngineMessage(id)),
    [dispatch],
  );

  const failCount = renderedMessages.filter((m) => m.tone === "fail").length;
  const warnCount = renderedMessages.filter((m) => m.tone === "warn").length;

  // Placed count is derived from live calendar state, not the SCHEDULED_OK
  // payload, so the header stays accurate after user edits (dismissed card,
  // pending regen). Both sources agree at emit time; only diverge in the
  // seam between an edit and the next regen.
  const placedCount = useMemo(
    () =>
      calendarEvents.filter((e) => e.extendedProps?.eventType === "planner")
        .length,
    [calendarEvents],
  );

  return (
    <div className={root}>
      <section>
        <div className={engineHeader}>
          <span className={engineLastRun}>
            last run · {formatLastRun(lastEngineRunAt)}
          </span>
          <div className={engineSummary}>
            {failCount} fail · {warnCount} warn · {placedCount} placed
          </div>
        </div>
        <div className={engineList}>
          {renderedMessages.map((m) => {
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
                  <div className={engineCardLink} aria-label={`${m.title}`}>
                    {m.title}
                  </div>
                )}

                <button
                  type="button"
                  className={engineDismissBtn}
                  onClick={() => handleDismiss(m.id)}
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
      </section>
    </div>
  );
}
