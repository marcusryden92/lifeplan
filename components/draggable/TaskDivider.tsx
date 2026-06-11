import React, { useState } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";

import { moveToEdge } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-move/moveToEdge";
import { Planner } from "@/types/prisma";
import {
  dropDivider,
  dropDividerActive,
} from "@/components/tasks/lumenTasks.css";

interface TaskDividerProps {
  planner: Planner[];
  updatePlannerArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  targetId: string;
  mouseLocationInItem: "top" | "bottom";
}

const TaskDivider: React.FC<TaskDividerProps> = ({
  planner,
  updatePlannerArray,
  targetId,
  mouseLocationInItem,
}) => {
  const { currentlyClickedItem, setCurrentlyClickedItem, displayDragBox } =
    useDraggableContext();
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { setFocusedTask } = useDraggableContext();

  const handleDragEnd = () => {
    if (!currentlyClickedItem || !isHovered || !displayDragBox) return;

    moveToEdge({
      planner,
      updatePlannerArray,
      currentlyClickedItem,
      targetId,
      mouseLocationInItem,
    });

    setFocusedTask(currentlyClickedItem.taskId);
    setCurrentlyClickedItem(null);
  };

  const active = currentlyClickedItem && displayDragBox;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseUp={handleDragEnd}
      className={`${dropDivider} ${active ? dropDividerActive : ""}`}
    />
  );
};

export default TaskDivider;
