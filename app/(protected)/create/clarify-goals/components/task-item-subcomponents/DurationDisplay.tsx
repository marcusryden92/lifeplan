"use client";

import { useEffect, useState } from "react";
import { formatMinutesToHours } from "@/utils/task-array-utils";
import { useDataContext } from "@/context/DataContext";
import { totalSubtaskDuration } from "@/utils/task-array-utils";

import { DurationDisplayProps } from "@/lib/task-item";

const DurationDisplay: React.FC<DurationDisplayProps> = ({
  task,
  itemIsFocused,
  subtasksLength,
  displayEdit,
}) => {
  if (displayEdit) return null;
  const { taskArray } = useDataContext();
  const [totalTaskDuration, setTotalTaskDuration] = useState(
    totalSubtaskDuration(task.id, taskArray)
  );

  useEffect(() => {
    setTotalTaskDuration(totalSubtaskDuration(task.id, taskArray));
  }, [taskArray, task.id]);

  return (
    <div className="flex text-sm text-black pl-2  flex-shrink-0 items-start justify-end space-x-2">
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
