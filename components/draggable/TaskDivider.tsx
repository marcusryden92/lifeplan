import React from "react";

import { useState, useEffect } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";

import { moveToEdge } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-move/move-to-edge";
import { Planner } from "@/lib/planner-class";

import styles from "./TaskDivider.module.css";

interface TaskDividerProps {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
  targetId: string;
  mouseLocationInItem: "top" | "bottom";
}

const TaskDivider: React.FC<TaskDividerProps> = ({
  taskArray,
  setTaskArray,
  targetId,
  mouseLocationInItem,
}) => {
  const { currentlyClickedItem, setCurrentlyClickedItem } =
    useDraggableContext();
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleDragEnd = () => {
    if (!currentlyClickedItem || !isHovered) return;

    moveToEdge({
      taskArray,
      setTaskArray,
      currentlyClickedItem,
      targetId,
      mouseLocationInItem,
    });

    setCurrentlyClickedItem(null);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseUp={handleDragEnd}
      className={`w-full h-2 ${currentlyClickedItem && styles.hoverEffect}`}
    ></div>
  );
};

export default TaskDivider;
