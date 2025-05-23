import React, { useRef, useCallback } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import clsx from "clsx";
import styles from "./DraggableItem.module.css";
import { useDataContext } from "@/context/DataContext";
import { moveToMiddle } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-move/moveToMiddle";

export default function DraggableItem({
  children,
  taskId,
  taskTitle,
  parentId,
  className,
}: {
  children: React.ReactNode;
  taskId: string;
  taskTitle: string;
  parentId?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { mainPlanner, setMainPlanner, setFocusedTask } = useDataContext();

  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    displayDragBox,
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
    if (
      !currentlyClickedItem ||
      !currentlyHoveredItem ||
      !mainPlanner ||
      !displayDragBox
    )
      return;

    moveToMiddle({
      mainPlanner,
      setMainPlanner,
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
    mainPlanner,
    setMainPlanner,
    setCurrentlyClickedItem,
    setCurrentlyHoveredItem,
  ]);

  const borderClasses = clsx(styles.item, {
    [styles.grabbing]: currentlyClickedItem && displayDragBox,
    [styles.highlightMiddle]:
      currentlyClickedItem &&
      displayDragBox &&
      currentlyClickedItem?.taskId !== taskId &&
      currentlyHoveredItem === taskId &&
      currentlyClickedItem.parentId !== taskId,
  });

  return (
    <div
      ref={ref}
      id={`draggable-${taskId}`}
      className={
        borderClasses +
        ` ${className} rounded-sm flex-1 cursor-pointer ${
          currentlyClickedItem?.parentId !== taskId && `hover:bg-gray-50`
        }`
      }
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={(e) => {
        e.stopPropagation();
        setCurrentlyClickedItem({
          taskId,
          taskTitle,
          parentId: parentId || "",
        });
      }}
      onMouseUp={handleMouseUp}
    >
      {children}
    </div>
  );
}
