"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui";
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
  splitGrid,
  fieldStack,
  fieldLabel,
  toggleRow,
  toggleHint,
  boxesCol,
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
  minSpacingMinutes: null,
};

// Free typing, clamp on commit — clamping per keystroke fights the user
// (typing "90" clamps the intermediate "9" up to the minimum and the digits
// land on the clamped value).
function CommitNumberInput({
  value,
  placeholder,
  ariaLabel,
  onCommit,
}: {
  value: number | null;
  placeholder?: string;
  ariaLabel: string;
  onCommit: (raw: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commit = () => {
    if (draft === null) return;
    onCommit(draft);
    setDraft(null);
  };

  return (
    <input
      className={numberInput}
      type="number"
      value={draft ?? (value === null ? "" : String(value))}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(null);
      }}
      aria-label={ariaLabel}
    />
  );
}

export function SplittingSection() {
  const { item, updateField } = useItem();

  // Splittable = a task the scheduler places as a single block. Plans are
  // fixed anchors and goals are containers (their leaf tasks get split, not the
  // container), so chunking is exposed on task-typed rows only.
  if (item.plannerType !== "task") return null;

  const settings = parseTaskSplitting(item.splitting);
  const completed = splitCompletedMinutes(item);

  const apply = (next: TaskSplittingSettings | null) => {
    // Disabling keeps completedSegments on the row — the segments go inert
    // (no events, no completion effect) but re-enabling restores the credit.
    updateField("splitting", next ? serializeTaskSplitting(next) : null);
  };

  const commitMin = (raw: string) => {
    if (!settings) return;
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed)) return;
    const min = Math.max(MIN_CHUNK_MINUTES, parsed);
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

  const commitMax = (raw: string) => {
    if (!settings) return;
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed)) return;
    apply({ ...settings, maxMinutes: Math.max(settings.minMinutes, parsed) });
  };

  const commitPerDay = (raw: string) => {
    if (!settings) return;
    if (raw.trim() === "") {
      apply({ ...settings, maxMinutesPerDay: null });
      return;
    }
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed)) return;
    apply({
      ...settings,
      maxMinutesPerDay: Math.max(settings.minMinutes, parsed),
    });
  };

  const commitSpacing = (raw: string) => {
    if (!settings) return;
    if (raw.trim() === "") {
      apply({ ...settings, minSpacingMinutes: null });
      return;
    }
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed)) return;
    apply({ ...settings, minSpacingMinutes: parsed > 0 ? parsed : null });
  };

  return (
    <div className={splitGrid}>
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
      </div>
      {settings && (
        <div className={boxesCol}>
          <div className={inputsGrid}>
            <div className={inputStack}>
              <span className={inputCaption}>Min (min)</span>
              <CommitNumberInput
                value={settings.minMinutes}
                ariaLabel="Minimum chunk minutes"
                onCommit={commitMin}
              />
            </div>
            <div className={inputStack}>
              <span className={inputCaption}>Max (min)</span>
              <CommitNumberInput
                value={settings.maxMinutes}
                ariaLabel="Maximum chunk minutes"
                onCommit={commitMax}
              />
            </div>
            <div className={inputStack}>
              <span className={inputCaption}>Max / day</span>
              <CommitNumberInput
                value={settings.maxMinutesPerDay}
                placeholder="—"
                ariaLabel="Maximum minutes per day"
                onCommit={commitPerDay}
              />
            </div>
            <div className={inputStack}>
              <span className={inputCaption}>Min gap</span>
              <CommitNumberInput
                value={settings.minSpacingMinutes ?? null}
                placeholder="—"
                ariaLabel="Minimum minutes between chunks"
                onCommit={commitSpacing}
              />
            </div>
          </div>
          {completed > 0 && (
            <span className={progressNote}>
              {formatMinutesToHours(completed)} of{" "}
              {formatMinutesToHours(item.duration)} done
            </span>
          )}
        </div>
      )}
    </div>
  );
}
