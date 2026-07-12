"use client";

import { FieldStack, Switch, TimePicker } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { orderedWeekDays, intToWeekday } from "@/utils/calendarUtils";
import {
  AllowedTimeRange,
  AllowedTimesSettings,
  parseAllowedTimes,
  serializeAllowedTimes,
} from "@/utils/allowedTimes";
import { useItem } from "../../ItemContext";
import {
  sectionGrid,
  toggleRow,
  toggleHint,
  detailColumn,
  dayToggles,
  dayToggle,
  dayToggleOn,
  rangeList,
  rangeRow,
  rangeDash,
  anyTimeNote,
  rowButton,
  addButton,
} from "./AllowedTimesSection.css";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_RANGE: AllowedTimeRange = { startTime: "09:00", endTime: "17:00" };

export function AllowedTimesSection() {
  const { item, updateField } = useItem();
  const { weekStartDay } = useCalendarProvider();

  // Plans are fixed anchors — they schedule at `starts`, never dynamically.
  if (item.plannerType === "plan") return null;

  const settings = parseAllowedTimes(item.allowedTimes);
  const enabled = settings !== null;

  // serializeAllowedTimes returns null when nothing constrains anymore (all
  // days selected, no time spans) — the section then collapses to its toggle.
  const apply = (next: AllowedTimesSettings | null) => {
    updateField("allowedTimes", next ? serializeAllowedTimes(next) : null);
  };

  const selectedDays = settings?.days ?? ALL_DAYS;
  const ranges = settings?.ranges ?? [];

  const toggleDay = (day: number) => {
    if (!settings) return;
    const current = new Set(selectedDays);
    if (current.has(day)) {
      // An empty day set would read as "never" but normalizes to "any day" —
      // keep at least one day selected instead of allowing the flip.
      if (current.size === 1) return;
      current.delete(day);
    } else {
      current.add(day);
    }
    const days = Array.from(current).sort((a, b) => a - b);
    apply({ ...settings, days: days.length === 7 ? null : days });
  };

  const setRange = (index: number, patch: Partial<AllowedTimeRange>) => {
    if (!settings) return;
    const next = ranges.map((r, i) => (i === index ? { ...r, ...patch } : r));
    // Equal bounds are not a valid span; keep the previous value instead of
    // letting the row vanish through normalization.
    if (next[index].startTime === next[index].endTime) return;
    apply({ ...settings, ranges: next });
  };

  const addRange = () => {
    if (!settings) return;
    apply({ ...settings, ranges: [...ranges, { ...DEFAULT_RANGE }] });
  };

  const removeRange = (index: number) => {
    if (!settings) return;
    const next = ranges.filter((_, i) => i !== index);
    apply({ ...settings, ranges: next.length ? next : null });
  };

  return (
    <div className={sectionGrid}>
      <FieldStack label="Allowed times">
        <div className={toggleRow}>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) =>
              apply(checked ? { days: null, ranges: [{ ...DEFAULT_RANGE }] } : null)
            }
            aria-label="Allowed times"
          />
          {!enabled && (
            <span className={toggleHint}>
              Limit scheduling to certain weekdays or hours
            </span>
          )}
        </div>
      </FieldStack>
      {enabled && (
        <div className={detailColumn}>
          <FieldStack label="Days">
            <div className={dayToggles}>
              {orderedWeekDays(weekStartDay).map((day) => {
                const on = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className={`${dayToggle} ${on ? dayToggleOn : ""}`}
                    aria-pressed={on}
                    aria-label={intToWeekday(day)}
                    onClick={() => toggleDay(day)}
                  >
                    {DAY_LETTERS[day]}
                  </button>
                );
              })}
            </div>
          </FieldStack>
          <FieldStack label="Time spans">
            <div className={rangeList}>
              {ranges.length === 0 && (
                <span className={anyTimeNote}>Any time of day</span>
              )}
              {ranges.map((range, index) => (
                <div key={index} className={rangeRow}>
                  <TimePicker
                    value={range.startTime}
                    onChange={(v) => setRange(index, { startTime: v })}
                    ariaLabel="Span start"
                  />
                  <span className={rangeDash}>–</span>
                  <TimePicker
                    value={range.endTime}
                    onChange={(v) => setRange(index, { endTime: v })}
                    ariaLabel="Span end"
                  />
                  <button
                    type="button"
                    className={rowButton}
                    onClick={() => removeRange(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className={addButton} onClick={addRange}>
                + Add time span
              </button>
            </div>
          </FieldStack>
        </div>
      )}
    </div>
  );
}
