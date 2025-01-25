import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import clsx from "clsx";
import styles from "./DraggableItem.module.css";
import styles2 from "./DragDisableListWrapper.module.css";

export default function DraggableItem({
  children,
  taskId,
  taskTitle,
  parentId,
  taskTreeIds,
}: {
  children: React.ReactNode;
  taskId: string;
  taskTitle: string;
  parentId?: string;
  taskTreeIds?: string[];
}) {
  const ref = useRef<HTMLDivElement | null>(null); // Reference to the DOM element
  const [mouseLocationInItem, setMouseLocationInItem] = useState<
    "top" | "middle" | "bottom" | null
  >(null); // Tracks if the mouse is in the top half of the element
  const lastUpdateTime = useRef<number>(0); // Keeps track of the last time mouse position was updated
  const RAF_THRESHOLD = 1000 / 60; // Threshold for updates (~16.67ms for 60fps)

  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    mousePosition,
    displayDragBox,
  } = useDraggableContext(); // Context for draggable state and actions

  // Update mouse position relative to the element to determine if it's in the top or bottom half
  const updateMousePosition = useCallback(() => {
    if (
      ref.current &&
      currentlyClickedItem &&
      currentlyClickedItem.taskId !== taskId &&
      currentlyHoveredItem === taskId
    ) {
      const now = performance.now();
      if (now - lastUpdateTime.current < RAF_THRESHOLD) {
        return; // Skip update if within threshold
      }

      const rect = ref.current.getBoundingClientRect(); // Get element dimensions and position
      const mouseY = mousePosition.clientY; // Current Y-coordinate of the mouse

      const bufferSize = 5; // Small buffer zone around the middle
      const top25Height = rect.height * 0.25;
      const bottom25Height = rect.height * 0.25;
      const middle50Height = rect.height * 0.5;

      // Calculate the boundaries for the top, middle, and bottom sections
      const topBoundary = rect.top + top25Height + bufferSize;
      const bottomBoundary =
        rect.top + rect.height - bottom25Height - bufferSize;
      const middleTopBoundary = rect.top + top25Height + bufferSize;
      const middleBottomBoundary =
        rect.top + rect.height - bottom25Height - bufferSize;

      // Determine if mouse is in top, middle, or bottom section
      let mouseLocation = null;

      if (mouseY < topBoundary) {
        mouseLocation = "top";
      } else if (
        mouseY >= middleTopBoundary &&
        mouseY <= middleBottomBoundary
      ) {
        mouseLocation = "middle";
      } else if (mouseY > bottomBoundary) {
        mouseLocation = "bottom";
      }

      // Update state only if there's a change
      if (mouseLocation && mouseLocation !== mouseLocationInItem) {
        setMouseLocationInItem(mouseLocation as "top" | "middle" | "bottom");
      }

      lastUpdateTime.current = now; // Update the timestamp
    }
  }, [
    mousePosition,
    currentlyClickedItem,
    taskId,
    currentlyHoveredItem,
    mouseLocationInItem,
  ]);

  // Continuously track mouse position using requestAnimationFrame
  useEffect(() => {
    let rafId: number;

    const scheduleUpdate = () => {
      rafId = requestAnimationFrame(() => {
        updateMousePosition(); // Check mouse position
        scheduleUpdate(); // Schedule the next update
      });
    };

    if (currentlyClickedItem && currentlyHoveredItem === taskId) {
      scheduleUpdate(); // Start updates if the item is currently hovered
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId); // Cleanup on unmount or dependency change
      }
    };
  }, [updateMousePosition, currentlyClickedItem, currentlyHoveredItem, taskId]);

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
    [styles.grabbing]: !currentlyClickedItem, // Default grab cursor if no item is clicked
    [styles.highlightTop]:
      currentlyClickedItem &&
      currentlyClickedItem?.taskId !== taskId &&
      currentlyHoveredItem === taskId &&
      mouseLocationInItem === "top", // Highlight top border
    [styles.highlightMiddle]:
      currentlyClickedItem &&
      currentlyClickedItem?.taskId !== taskId &&
      currentlyHoveredItem === taskId &&
      mouseLocationInItem === "middle", // Highlight middle section
    [styles.highlightBottom]:
      currentlyClickedItem &&
      currentlyClickedItem?.taskId !== taskId &&
      currentlyHoveredItem === taskId &&
      mouseLocationInItem === "bottom", // Highlight bottom border
    // ["bg-[#f3f4f6]"]: currentlyClickedItem?.taskId === taskId && displayDragBox,
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
