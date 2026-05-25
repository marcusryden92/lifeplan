import React, { useRef, useCallback } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import clsx from "clsx";
import styles from "./DraggableItem.module.css";
import { useCalendarProvider } from "@/context/CalendarProvider";
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
  const { planner, updatePlannerArray } = useCalendarProvider();
  const { setFocusedTask } = useDraggableContext();

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
      !planner ||
      !displayDragBox
    )
      return;

    moveToMiddle({
      planner,
      updatePlannerArray,
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
    planner,
    updatePlannerArray,
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

        const target = e.target as HTMLElement;
        const isEditable =
          target.closest(
            'input, textarea, select, button, [contenteditable="true"], [data-allow-select="true"]'
          ) !== null;

        if (!isEditable) {
          // Prevent text selection kickoff on drag start
          e.preventDefault();
          // Add drag selection guard immediately on mousedown
          document.body.classList.add("lp-dragging");
        }

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
