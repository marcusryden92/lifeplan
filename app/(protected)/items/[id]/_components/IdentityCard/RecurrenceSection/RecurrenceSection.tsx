"use client";

import { Combobox, DateTimePicker, FieldStack } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatDatetimeLocal, parseDatetimeLocal } from "@/utils/datetime";
import {
  parsePlanRecurrence,
  serializePlanRecurrence,
  type PlanRecurrenceRule,
} from "@/utils/planRecurrence";
import { useItem } from "../../ItemContext";
import { recurGrid } from "./RecurrenceSection.css";

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
      <FieldStack label="Repeats">
        <Combobox
          value={preset}
          options={(Object.keys(PRESET_LABELS) as RecurrencePreset[]).map(
            (key) => ({ value: key, label: PRESET_LABELS[key] }),
          )}
          onChange={(next) => applyRule(ruleFromPreset(next, rule?.until ?? null))}
          width="100%"
          ariaLabel="Recurrence"
        />
      </FieldStack>
      {rule && (
        <FieldStack label="Until (optional)">
          <DateTimePicker
            value={formatDatetimeLocal(rule.until)}
            onChange={(v) =>
              applyRule({ ...rule, until: parseDatetimeLocal(v) || null })
            }
            weekStartsOn={weekStartDay}
            clearable={!!rule.until}
            ariaLabel="Repeat until"
          />
        </FieldStack>
      )}
    </div>
  );
}
