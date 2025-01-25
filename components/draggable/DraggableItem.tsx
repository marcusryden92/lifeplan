import React, { useRef, useCallback } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import clsx from "clsx";
import styles from "./DraggableItem.module.css";
import { useDataContext } from "@/context/DataContext";
import { moveToMiddle } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-move/move-to-middle";

export default function DraggableItem({
  children,
  taskId,
  taskTitle,
  parentId,
}: {
  children: React.ReactNode;
  taskId: string;
  taskTitle: string;
  parentId?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { taskArray, setTaskArray, focusedTask, setFocusedTask } =
    useDataContext();

  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
  } = useDraggableContext();

  // Handles mouse entering the element
  const handleMouseEnter = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setCurrentlyHoveredItem(taskId);
    },
    [taskId, setCurrentlyHoveredItem]
  );

  // Handles mouse leaving the element
  const handleMouseLeave = useCallback(() => {
    if (parentId) {
      const parentElement = document.getElementById(`draggable-${parentId}`);
      if (parentElement?.matches(":hover")) {
        setCurrentlyHoveredItem(parentId);
        return;
      }
    }
    setCurrentlyHoveredItem("");
  }, [parentId, setCurrentlyHoveredItem]);

  // Handle mouse up / drag end
  const handleMouseUp = useCallback(() => {
    if (!currentlyClickedItem || !currentlyHoveredItem || !taskArray) return;

    moveToMiddle({
      taskArray,
      setTaskArray,
      currentlyClickedItem,
      currentlyHoveredItem,
    });

    setFocusedTask(currentlyClickedItem.taskId);

    // Clear all states after moving
    setCurrentlyClickedItem(null);
    setCurrentlyHoveredItem(null);
  }, [
    currentlyClickedItem,
    currentlyHoveredItem,
    taskArray,
    setTaskArray,
    setCurrentlyClickedItem,
    setCurrentlyHoveredItem,
  ]);

  const borderClasses = clsx(styles.item, {
    [styles.grabbing]: currentlyClickedItem,
    [styles.highlightMiddle]:
      currentlyClickedItem &&
      currentlyClickedItem?.taskId !== taskId &&
      currentlyHoveredItem === taskId,
  });

  return (
    <div
      ref={ref}
      id={`draggable-${taskId}`}
      className={borderClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={(e) => {
        e.stopPropagation();
        setCurrentlyClickedItem({ taskId, taskTitle });
      }}
      onMouseUp={handleMouseUp}
    >
      {children}
    </div>
  );
}
