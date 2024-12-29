import React from "react";

import { useState, useEffect } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";

import { moveToEdge } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-move/move-to-edge";
import { Planner } from "@/lib/planner-class";

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

  const [previouslyClickedItem, setPreviouslyClickedItem] = useState<{
    taskId: string;
    taskTitle: string;
  } | null>(null);

  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);

  // Handle mouse up for updating task dependencies on move
  useEffect(() => {
    if (currentlyClickedItem === previouslyClickedItem) return;
    // Keeps track of currently clicked item even if it changes before being needed
    if (currentlyClickedItem) setPreviouslyClickedItem(currentlyClickedItem);
  }, [currentlyClickedItem]);

  useEffect(() => {
    if (isHovered && currentlyClickedItem) {
      setIsHighlighted(true);
    } else setIsHighlighted(false);
  }, [isHovered]);

  // Functionality to update task dependencies when moving an object
  useEffect(() => {
    function updateDependencies() {
      if (
        currentlyClickedItem ||
        !taskArray ||
        !setTaskArray ||
        !targetId ||
        !previouslyClickedItem ||
        !mouseLocationInItem
      ) {
        return;
      }

      if (isHovered) {
        moveToEdge({
          taskArray,
          setTaskArray,
          currentlyClickedItem: previouslyClickedItem,
          targetId,
          mouseLocationInItem,
        });
      }

      // Clear all the states after successfully moving a task, just in case
      setCurrentlyClickedItem(null);
      setPreviouslyClickedItem(null);
      setIsHighlighted(false);
    }

    updateDependencies();
  }, [currentlyClickedItem]);

  return (
    <div
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      className={`w-full h-2 ${
        isHighlighted ? "bg-sky-400" : ""
      } duration-200 ease-out  `}
    ></div>
  );
};

export default TaskDivider;
