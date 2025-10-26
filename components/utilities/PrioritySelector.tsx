import React, { useState } from "react";
import { Planner } from "@/types/prisma";
import {
  getCompleteTaskTreeIds,
  getRootParentId,
} from "@/utils/goalPageHandlers";

interface PrioritySelectorProps {
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  taskId: string;
  initialPriority?: number;
}

export default function PrioritySelector({
  updatePlannerArray,
  taskId,
  initialPriority = 0,
}: PrioritySelectorProps) {
  const [selectedPriority, setSelectedPriority] =
    useState<number>(initialPriority);
  const legalValues = Array.from({ length: 11 }, (_, i) => i);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = Number(event.target.value);
    setSelectedPriority(newValue);

    updatePlannerArray((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;

      if (task.itemType !== "goal") {
        return prev.map((i) =>
          i.id === taskId ? { ...i, priority: newValue } : i
        );
      }

      const rootParentId = getRootParentId(prev, taskId);
      if (!rootParentId) return prev;

      const goalTreeIds = getCompleteTaskTreeIds(prev, rootParentId);

      return prev.map((i) =>
        goalTreeIds.includes(i.id) ? { ...i, priority: newValue } : i
      );
    });
  };

  return (
    <select value={selectedPriority} onChange={handleChange}>
      {legalValues.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}
