"use client";

import { useEffect, useState } from "react";
import { formatMinutesToHours } from "@/utils/taskArrayUtils";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { totalSubtaskDuration } from "@/utils/taskArrayUtils";

import { DurationDisplayProps } from "@/lib/taskItem";

const DurationDisplay: React.FC<DurationDisplayProps> = ({
  task,
  itemIsFocused,
  subtasksLength,
}) => {
  const { planner } = useCalendarProvider();
  const [totalTaskDuration, setTotalTaskDuration] = useState(
    totalSubtaskDuration(task.id, planner)
  );

  useEffect(() => {
    setTotalTaskDuration(totalSubtaskDuration(task.id, planner));
  }, [planner, task.id]);

  return (
    <div className="flex text-sm text-black pl-2 pr-4  flex-shrink-0 items-start justify-end space-x-2">
      <div className={`${itemIsFocused && "text-sky-500"}`}>
        {formatMinutesToHours(
          subtasksLength === 0 ? task.duration || 0 : totalTaskDuration
        )}
        {}
      </div>
    </div>
  );
};

export default DurationDisplay;
