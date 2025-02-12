import React from "react";

import { useState } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import { useDataContext } from "@/context/DataContext";

import { moveToEdge } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-move/moveToEdge";
import { Planner } from "@/lib/plannerClass";

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
  const { currentlyClickedItem, setCurrentlyClickedItem, displayDragBox } =
    useDraggableContext();
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { setFocusedTask } = useDataContext();

  const handleDragEnd = () => {
    if (!currentlyClickedItem || !isHovered || !displayDragBox) return;

    moveToEdge({
      taskArray,
      setTaskArray,
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
      className={`w-full h-2 ${currentlyClickedItem && styles.hoverEffect}`}
    ></div>
  );
};

export default TaskDivider;
