"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui";
import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import { MIN_CHUNK_MINUTES, type TaskSplittingSettings } from "@/utils/taskSplitting";
import {
  boxesCol,
  inputsGrid,
  inputStack,
  inputCaption,
  progressNote,
} from "./SplittingFields.css";

// The default a fresh "Split into chunks" toggle enables with.
export const DEFAULT_SPLITTING_SETTINGS: TaskSplittingSettings = {
  minMinutes: 60,
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
    <Input
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

// The chunk-bound fields shared by the item-detail SplittingSection and the
// subtask EditDrawer. Rendered only when splitting is enabled (settings
// non-null); the enabling toggle lives in each host so it can own its layout.
export function SplittingFields({
  settings,
  duration,
  completed,
  onChange,
}: {
  settings: TaskSplittingSettings;
  duration: number;
  completed: number;
  onChange: (next: TaskSplittingSettings) => void;
}) {
  const commitMin = (raw: string) => {
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed)) return;
    const min = Math.max(MIN_CHUNK_MINUTES, parsed);
    onChange({
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
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed)) return;
    onChange({ ...settings, maxMinutes: Math.max(settings.minMinutes, parsed) });
  };

  const commitPerDay = (raw: string) => {
    if (raw.trim() === "") {
      onChange({ ...settings, maxMinutesPerDay: null });
      return;
    }
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed)) return;
    onChange({ ...settings, maxMinutesPerDay: Math.max(settings.minMinutes, parsed) });
  };

  const commitSpacing = (raw: string) => {
    if (raw.trim() === "") {
      onChange({ ...settings, minSpacingMinutes: null });
      return;
    }
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed)) return;
    onChange({ ...settings, minSpacingMinutes: parsed > 0 ? parsed : null });
  };

  return (
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
          {formatMinutesToHours(completed)} of {formatMinutesToHours(duration)} done
        </span>
      )}
    </div>
  );
}
