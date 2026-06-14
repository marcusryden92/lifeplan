"use client";

import { useState, type ChangeEvent } from "react";
import { Check } from "lucide-react";
import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  toggleSubtaskCompletion,
  setSubtaskCompletedAt,
} from "@/utils/goal-handlers/subtaskCompletion";
import { useItem } from "./_components/ItemContext";
import { IdentityCard } from "./_components/IdentityCard";
import {
  NextOnCalendarCard,
  AIHelperCard,
  EngineNotesCard,
} from "./_components/SideCards";
import {
  overviewGrid,
  leftCol,
  rightCol,
  progressBlock,
  progressMeta,
  progressMetaStrong,
  progressTrack,
  progressFill,
  progressTick,
  completeRow,
  completeLeftGroup,
  completeCheckbox,
  completeLabel,
  completeDateInput,
  completeDateInputFaded,
} from "./page.css";

export default function ItemOverviewPage() {
  const {
    item,
    category,
    pct,
    totalDuration,
    completedDuration,
    completedSubtasks,
    totalSubtasks,
  } = useItem();
  const { updatePlannerArray } = useCalendarProvider();
  const isGoal = item.plannerType === "goal";
  const isTask = item.plannerType === "task";
  const areaColor = category?.color ?? "var(--lumen-accent-primary, #3b82f6)";
  const showProgress = isGoal && totalSubtasks > 0;

  const isCompleted = !!item.completedEndTime;
  const completedValue = (() => {
    if (!item.completedEndTime) return "";
    const d = new Date(item.completedEndTime);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  // Completion is gated on isReady — a task can't be checked off until it's
  // been marked ready. The checkbox stays interactive so a blocked click can
  // surface a shake-and-flash instead of silently doing nothing.
  const completionLocked = !item.isReady;
  const [shakeLocked, setShakeLocked] = useState(false);
  const flashShake = () => {
    setShakeLocked((s) => {
      if (s) return s;
      window.setTimeout(() => setShakeLocked(false), 420);
      return true;
    });
  };

  const toggleCompletion = () => {
    if (completionLocked) {
      flashShake();
      return;
    }
    updatePlannerArray((prev) => toggleSubtaskCompletion(prev, item.id));
  };

  const onCompletedAtChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (completionLocked) {
      flashShake();
      return;
    }
    const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
    updatePlannerArray((prev) => setSubtaskCompletedAt(prev, item.id, iso));
  };

  return (
    <>
      <div className={progressBlock}>
        {showProgress && (
          <>
            <div className={progressMeta}>
              <span className={progressMetaStrong}>
                {completedSubtasks} of {totalSubtasks} subtasks
              </span>
              {"  ·  "}
              {formatMinutesToHours(completedDuration)} out of{" "}
              {formatMinutesToHours(totalDuration)}
              {"  ·  "}
              <span className={progressMetaStrong}>{pct}%</span>
            </div>
            <div className={progressTrack}>
              <div
                className={progressFill}
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${areaColor}, color-mix(in srgb, ${areaColor} 80%, transparent))`,
                }}
              />
              {Array.from({ length: totalSubtasks - 1 }).map((_, i) => (
                <span
                  key={i}
                  className={progressTick}
                  style={{
                    left: `${((i + 1) / totalSubtasks) * 100}%`,
                  }}
                />
              ))}
            </div>
          </>
        )}
        {isTask && (
          <div className={completeRow}>
            <div className={completeLeftGroup}>
              <button
                type="button"
                className={completeCheckbox}
                data-completed={isCompleted ? "true" : "false"}
                data-locked={completionLocked ? "true" : "false"}
                data-shake={shakeLocked ? "true" : "false"}
                onClick={toggleCompletion}
                aria-pressed={isCompleted}
                aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
                title={
                  completionLocked
                    ? "Mark ready before completing"
                    : undefined
                }
              >
                {isCompleted && <Check size={14} strokeWidth={3} />}
              </button>
              <span className={completeLabel}>Completed at</span>
            </div>
            <input
              type="datetime-local"
              className={`${completeDateInput} ${
                isCompleted && !completionLocked ? "" : completeDateInputFaded
              }`}
              value={completedValue}
              onChange={onCompletedAtChange}
              title={
                completionLocked ? "Mark ready before completing" : undefined
              }
            />
          </div>
        )}
      </div>

      <div className={overviewGrid}>
        <div className={leftCol}>
          <IdentityCard />
        </div>
        <div className={rightCol}>
          <NextOnCalendarCard />
          <AIHelperCard />
          <EngineNotesCard />
        </div>
      </div>
    </>
  );
}
