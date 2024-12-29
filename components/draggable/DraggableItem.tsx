import React, { useState, useRef, useEffect, useCallback } from "react";
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
  const ref = useRef<HTMLDivElement | null>(null); // Reference to the DOM element

  const [previouslyClickedItem, setPreviouslyClickedItem] = useState<{
    taskId: string;
    taskTitle: string;
  } | null>(null);

  const { taskArray, setTaskArray } = useDataContext();

  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    displayDragBox,
  } = useDraggableContext(); // Context for draggable state and actions

  // Handle mouse up for updating task dependencies on move
  useEffect(() => {
    if (currentlyClickedItem === previouslyClickedItem) return;
    // Keeps track of currently clicked item even if it changes before being needed
    if (currentlyClickedItem) setPreviouslyClickedItem(currentlyClickedItem);
  }, [currentlyClickedItem]);

  // Functionality to update task dependencies when moving an object
  useEffect(() => {
    function updateDependencies() {
      if (
        currentlyClickedItem ||
        !taskArray ||
        !setTaskArray ||
        !currentlyHoveredItem ||
        !previouslyClickedItem
      ) {
        return;
      }

      moveToMiddle({
        taskArray,
        setTaskArray,
        currentlyClickedItem: previouslyClickedItem,
        currentlyHoveredItem,
      });

      // Clear all the states after successfully moving a task, just in case
      setCurrentlyClickedItem(null);
      setCurrentlyHoveredItem(null);
      setPreviouslyClickedItem(null);
    }

    updateDependencies();
  }, [currentlyClickedItem]);

  // Handles mouse entering the element
  const handleMouseEnter = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent bubbling to parent elements

      setCurrentlyHoveredItem(taskId); // Mark this item as hovered
    },
    [taskId, setCurrentlyHoveredItem]
  );

  // Handles mouse leaving the element
  const handleMouseLeave = useCallback(() => {
    if (parentId) {
      const parentElement = document.getElementById(`draggable-${parentId}`);
      if (parentElement?.matches(":hover")) {
        setCurrentlyHoveredItem(parentId); // Set hover state to parent if still hovered
        return;
      }
    }
    setCurrentlyHoveredItem(""); // Clear hover state if no parent or no hover
  }, [parentId, setCurrentlyHoveredItem]);

  const borderClasses = clsx(styles.item, {
    [styles.grabbing]: currentlyClickedItem, // Default grab cursor if no item is clicked
    [styles.highlightMiddle]:
      currentlyClickedItem &&
      currentlyClickedItem?.taskId !== taskId &&
      currentlyHoveredItem === taskId, // Highlight middle section

    ["bg-[#f3f4f6]"]: currentlyClickedItem?.taskId === taskId && displayDragBox,
  });

  return (
    <div
      ref={ref}
      id={`draggable-${taskId}`}
      className={borderClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={(e) => {
        e.stopPropagation(); // Prevent bubbling
        setCurrentlyClickedItem({ taskId, taskTitle }); // Set clicked state
      }}
    >
      {children} {/* Render children */}
    </div>
  );
}
