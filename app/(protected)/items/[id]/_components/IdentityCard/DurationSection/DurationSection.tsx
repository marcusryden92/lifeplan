"use client";

import { DurationField } from "@/components/ui";
import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import { useItem } from "../../ItemContext";
import { fieldStack, fieldLabel, fieldValue } from "./DurationSection.css";

export function DurationSection() {
  const { item, totalDuration, updateField } = useItem();
  const isGoal = item.plannerType === "goal";

  return (
    <div className={fieldStack}>
      <span className={fieldLabel}>{isGoal ? "Total duration" : "Duration"}</span>
      {isGoal ? (
        <span className={fieldValue}>
          {formatMinutesToHours(totalDuration)}
        </span>
      ) : (
        <DurationField
          minutes={item.duration}
          minMinutes={1}
          ariaLabel="Duration"
          onCommit={(minutes) => updateField("duration", minutes)}
        />
      )}
    </div>
  );
}
