"use client";

import { PRIORITY_LEVELS } from "@/utils/plannerPriority";
import { useItem } from "../../ItemContext";
import {
  cardHeader,
  cardTitle,
  priorityRow,
  priorityPill,
} from "./PrioritySection.css";

export function PrioritySection() {
  const { item, updateField } = useItem();

  return (
    <div className={cardHeader}>
      <span className={cardTitle}>Priority</span>
      <div className={priorityRow}>
        {PRIORITY_LEVELS.map((p) => (
          <button
            key={p}
            type="button"
            className={priorityPill}
            aria-pressed={item.priority === p}
            onClick={() => updateField("priority", p)}
            aria-label={`Priority ${p}`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
