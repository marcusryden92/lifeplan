"use client";

import { DurationField, FieldStack, Switch } from "@/components/ui";
import { useItem } from "../../ItemContext";
import {
  limitGrid,
  toggleRow,
  toggleHint,
  fieldRow,
} from "./DailyLimitSection.css";

const DEFAULT_DAILY_LIMIT_MINUTES = 120;

export function DailyLimitSection() {
  const { item, updateField } = useItem();

  // The cap belongs to the goal root — the engine reads it off the root
  // candidate and meters the whole subtree against one per-day ledger.
  if (item.plannerType !== "goal" || item.parentId) return null;

  const limit = item.maxMinutesPerDay;
  const enabled = typeof limit === "number" && limit > 0;

  return (
    <div className={limitGrid}>
      <FieldStack label="Daily limit">
        <div className={toggleRow}>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) =>
              updateField(
                "maxMinutesPerDay",
                checked ? DEFAULT_DAILY_LIMIT_MINUTES : null,
              )
            }
            aria-label="Daily limit"
          />
          {!enabled && (
            <span className={toggleHint}>
              Cap how much of this goal is scheduled on any one day
            </span>
          )}
        </div>
      </FieldStack>
      {enabled && (
        <FieldStack label="Max per day">
          <div className={fieldRow}>
            <DurationField
              minutes={limit}
              minMinutes={5}
              ariaLabel="Daily limit"
              onCommit={(minutes) => updateField("maxMinutesPerDay", minutes)}
            />
          </div>
        </FieldStack>
      )}
    </div>
  );
}
