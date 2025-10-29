import React from "react";

import { useState } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";

import { moveToEdge } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-move/moveToEdge";
import { Planner } from "@/types/prisma";

import styles from "./TaskDivider.module.css";

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

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseUp={handleDragEnd}
      className={`w-full h-2 ${currentlyClickedItem && displayDragBox && styles.hoverEffect}`}
    ></div>
  );
};

export default TaskDivider;
