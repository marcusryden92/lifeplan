"use client";

import { DateTimePicker } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatDatetimeLocal, parseDatetimeLocal } from "@/utils/datetime";
import {
  parsePlanRecurrence,
  serializePlanRecurrence,
  type PlanRecurrenceRule,
} from "@/utils/planRecurrence";
import { useItem } from "../../ItemContext";
import {
  recurGrid,
  fieldStack,
  fieldLabel,
  select,
} from "./RecurrenceSection.css";

type RecurrencePreset = "none" | "daily" | "weekly" | "biweekly" | "monthly";

const PRESET_LABELS: Record<RecurrencePreset, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

function presetFromRule(rule: PlanRecurrenceRule | null): RecurrencePreset {
  if (!rule) return "none";
  if (rule.freq === "weekly") {
    return rule.interval === 2 ? "biweekly" : "weekly";
  }
  return rule.freq;
}

function ruleFromPreset(
  preset: RecurrencePreset,
  until: string | null,
): PlanRecurrenceRule | null {
  switch (preset) {
    case "none":
      return null;
    case "daily":
      return { freq: "daily", interval: 1, until };
    case "weekly":
      return { freq: "weekly", interval: 1, until };
    case "biweekly":
      return { freq: "weekly", interval: 2, until };
    case "monthly":
      return { freq: "monthly", interval: 1, until };
  }
}

export function RecurrenceSection() {
  const { item, updateField } = useItem();
  const { weekStartDay } = useCalendarProvider();

  if (item.plannerType !== "plan") return null;

  const rule = parsePlanRecurrence(item.recurrence);
  const preset = presetFromRule(rule);

  const applyRule = (next: PlanRecurrenceRule | null) => {
    updateField(
      "recurrence",
      next ? serializePlanRecurrence(next) : null,
    );
    if (!next) updateField("recurrenceExceptions", null);
  };

  return (
    <div className={recurGrid}>
      <div className={fieldStack}>
        <span className={fieldLabel}>Repeats</span>
        <select
          className={select}
          value={preset}
          onChange={(e) =>
            applyRule(
              ruleFromPreset(
                e.target.value as RecurrencePreset,
                rule?.until ?? null,
              ),
            )
          }
          aria-label="Recurrence"
        >
          {(Object.keys(PRESET_LABELS) as RecurrencePreset[]).map((key) => (
            <option key={key} value={key}>
              {PRESET_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      {rule && (
        <div className={fieldStack}>
          <span className={fieldLabel}>Until (optional)</span>
          <DateTimePicker
            value={formatDatetimeLocal(rule.until)}
            onChange={(v) =>
              applyRule({ ...rule, until: parseDatetimeLocal(v) || null })
            }
            weekStartsOn={weekStartDay}
            clearable={!!rule.until}
            ariaLabel="Repeat until"
          />
        </div>
      )}
    </div>
  );
}
