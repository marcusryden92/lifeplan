"use client";

import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import { useItem } from "../../ItemContext";
import {
  fieldStack,
  fieldLabel,
  fieldValue,
  numberInput,
} from "./DurationSection.css";

export function DurationSection() {
  const { item, totalDuration, updateField } = useItem();
  const isGoal = item.plannerType === "goal";

  return (
    <div className={fieldStack}>
      <span className={fieldLabel}>
        {isGoal ? "Total duration" : "Duration (min)"}
      </span>
      {isGoal ? (
        <span className={fieldValue}>
          {formatMinutesToHours(totalDuration)}
        </span>
      ) : (
        <input
          className={numberInput}
          type="number"
          min={1}
          value={item.duration}
          onChange={(e) => updateField("duration", Number(e.target.value))}
        />
      )}
    </div>
  );
}
