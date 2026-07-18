"use client";

import { Check } from "lucide-react";
import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import { useFlashBoolean } from "@/hooks/useFlashAnimation";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  toggleSubtaskCompletion,
  setSubtaskCompletedAt,
} from "@/utils/goal-handlers/subtaskCompletion";
import { formatDatetimeLocal, parseDatetimeLocal } from "@/utils/datetime";
import { DateTimePicker } from "@/components/ui";
import { vars } from "@/lib/theme";
import { useItem } from "../ItemContext";
import { IdentityCard } from "../IdentityCard";
import { RecurrenceExceptionsCard } from "../RecurrenceExceptionsCard";
import { DeleteRow } from "../DeleteRow";
import {
  NextOnCalendarCard,
  EngineNotesCard,
  ConnectionsCard,
  NestIntoGoalCard,
} from "../SideCards";
import { SHAKE_DURATION_MS } from "../../_constants";
import {
  overviewRoot,
  overviewGrid,
  leftCol,
  rightCol,
  deleteDock,
  progressBlock,
  progressMeta,
  progressMetaStrong,
  progressTrack,
  progressFill,
  completeRow,
  completeLeftGroup,
  completeCheckbox,
  completeLabel,
  completeDateWrap,
  completeDateWrapFaded,
} from "./ItemDetailPage.css";

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
  const { updatePlannerArray, weekStartDay } = useCalendarProvider();
  const isGoal = item.plannerType === "goal";
  const isTask = item.plannerType === "task";
  const areaColor = category?.color ?? vars.accent.primary;
  const showProgress = isGoal && totalSubtasks > 0;

  const isCompleted = !!item.completedEndTime;
  const completedValue = formatDatetimeLocal(item.completedEndTime);

  // Completion is gated on isReady — a task can't be checked off until it's
  // been marked ready. The checkbox stays interactive so a blocked click can
  // surface a shake-and-flash instead of silently doing nothing.
  const completionLocked = !item.isReady;
  const [shakeLocked, flashShake] = useFlashBoolean(SHAKE_DURATION_MS);

  const toggleCompletion = () => {
    if (completionLocked) {
      flashShake();
      return;
    }
    updatePlannerArray((prev) => toggleSubtaskCompletion(prev, item.id));
  };

  const onCompletedAtChange = (value: string) => {
    if (completionLocked) {
      flashShake();
      return;
    }
    const iso = parseDatetimeLocal(value) || null;
    updatePlannerArray((prev) => setSubtaskCompletedAt(prev, item.id, iso));
  };

  return (
    <div className={overviewRoot}>
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
                  completionLocked ? "Mark ready before completing" : undefined
                }
              >
                {isCompleted && <Check size={14} strokeWidth={3} />}
              </button>
              <span className={completeLabel}>Completed at</span>
            </div>
            <div
              className={`${completeDateWrap} ${
                isCompleted && !completionLocked ? "" : completeDateWrapFaded
              }`}
              title={
                completionLocked ? "Mark ready before completing" : undefined
              }
            >
              <DateTimePicker
                value={completedValue}
                onChange={onCompletedAtChange}
                weekStartsOn={weekStartDay}
                clearable={isCompleted && !completionLocked}
                ariaLabel="Completed at"
              />
            </div>
          </div>
        )}
      </div>

      <div className={overviewGrid}>
        <div className={leftCol}>
          <IdentityCard />
          <RecurrenceExceptionsCard />
        </div>
        <div className={rightCol}>
          <NextOnCalendarCard />
          <EngineNotesCard />
          <ConnectionsCard />
          <NestIntoGoalCard />
        </div>
      </div>

      <div className={deleteDock}>
        <DeleteRow />
      </div>
    </div>
  );
}
