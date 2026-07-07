"use client";

import { Switch } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import {
  MIN_CHUNK_MINUTES,
  parseTaskSplitting,
  serializeTaskSplitting,
  splitCompletedMinutes,
  type TaskSplittingSettings,
} from "@/utils/taskSplitting";
import { useItem } from "../../ItemContext";
import {
  fieldStack,
  fieldLabel,
  toggleRow,
  toggleHint,
  inputsGrid,
  inputStack,
  inputCaption,
  numberInput,
  progressNote,
} from "./SplittingSection.css";

const DEFAULT_SETTINGS: TaskSplittingSettings = {
  minMinutes: 30,
  maxMinutes: 120,
  maxMinutesPerDay: null,
};

export function SplittingSection() {
  const { item, updateField } = useItem();
  const { planner } = useCalendarProvider();

  // Splittable = anything the scheduler places as a block: standalone tasks
  // and goal subtree leaves (goal-typed rows without children). Plans are
  // fixed anchors; parent containers never schedule themselves.
  const hasChildren = planner.some((p) => p.parentId === item.id);
  if (item.plannerType === "plan" || hasChildren) return null;

  const settings = parseTaskSplitting(item.splitting);
  const completed = splitCompletedMinutes(item);

  const apply = (next: TaskSplittingSettings | null) => {
    // Disabling keeps completedSegments on the row — the segments go inert
    // (no events, no completion effect) but re-enabling restores the credit.
    updateField("splitting", next ? serializeTaskSplitting(next) : null);
  };

  const patchMin = (value: number) => {
    if (!settings) return;
    const min = Math.max(MIN_CHUNK_MINUTES, Math.floor(value) || 0);
    apply({
      ...settings,
      minMinutes: min,
      maxMinutes: Math.max(min, settings.maxMinutes),
      maxMinutesPerDay:
        settings.maxMinutesPerDay === null
          ? null
          : Math.max(min, settings.maxMinutesPerDay),
    });
  };

  const patchMax = (value: number) => {
    if (!settings) return;
    const max = Math.max(settings.minMinutes, Math.floor(value) || 0);
    apply({ ...settings, maxMinutes: max });
  };

  const patchPerDay = (raw: string) => {
    if (!settings) return;
    if (raw.trim() === "") {
      apply({ ...settings, maxMinutesPerDay: null });
      return;
    }
    const perDay = Math.max(settings.minMinutes, Math.floor(Number(raw)) || 0);
    apply({ ...settings, maxMinutesPerDay: perDay });
  };

  return (
    <div className={fieldStack}>
      <span className={fieldLabel}>Split into chunks</span>
      <div className={toggleRow}>
        <Switch
          checked={settings !== null}
          onCheckedChange={(checked) =>
            apply(checked ? DEFAULT_SETTINGS : null)
          }
          aria-label="Split into chunks"
        />
        {!settings && (
          <span className={toggleHint}>
            Schedule as flexible chunks instead of one block
          </span>
        )}
      </div>
      {settings && (
        <>
          <div className={inputsGrid}>
            <div className={inputStack}>
              <span className={inputCaption}>Min (min)</span>
              <input
                className={numberInput}
                type="number"
                min={MIN_CHUNK_MINUTES}
                value={settings.minMinutes}
                onChange={(e) => patchMin(Number(e.target.value))}
                aria-label="Minimum chunk minutes"
              />
            </div>
            <div className={inputStack}>
              <span className={inputCaption}>Max (min)</span>
              <input
                className={numberInput}
                type="number"
                min={settings.minMinutes}
                value={settings.maxMinutes}
                onChange={(e) => patchMax(Number(e.target.value))}
                aria-label="Maximum chunk minutes"
              />
            </div>
            <div className={inputStack}>
              <span className={inputCaption}>Max / day</span>
              <input
                className={numberInput}
                type="number"
                min={settings.minMinutes}
                value={settings.maxMinutesPerDay ?? ""}
                placeholder="—"
                onChange={(e) => patchPerDay(e.target.value)}
                aria-label="Maximum minutes per day"
              />
            </div>
          </div>
          {completed > 0 && (
            <span className={progressNote}>
              {formatMinutesToHours(completed)} of{" "}
              {formatMinutesToHours(item.duration)} done
            </span>
          )}
        </>
      )}
    </div>
  );
}
