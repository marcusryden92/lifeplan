import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDraggableContext } from "@/context/DraggableContext";
import clsx from "clsx";

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
  const [mouseInhabitsTopHalf, setMouseInhabitsTopHalf] = useState(false); // Tracks if the mouse is in the top half of the element
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
      const middleY = rect.top + rect.height / 2;
      const upperBound = middleY + bufferSize;
      const lowerBound = middleY - bufferSize;

      // Update only if the mouse is clearly in the top or bottom half
      if (mouseY < lowerBound || mouseY > upperBound) {
        setMouseInhabitsTopHalf(mouseY < middleY); // Set state based on position
        lastUpdateTime.current = now; // Update the timestamp
      }
    }
  }, [mousePosition, currentlyClickedItem, taskId, currentlyHoveredItem]);

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
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        const middleY = rect.top + rect.height / 2;
        setMouseInhabitsTopHalf(event.clientY < middleY); // Determine if mouse is in top half
      }
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

  // Define dynamic border classes based on the drag state
  const borderClasses = clsx({
    "cursor-grab": !currentlyClickedItem, // Default grab cursor
    "cursor-grabbing": currentlyClickedItem, // Grabbing cursor when item is clicked
    // Highlight top border when mouse is in top half
    "border-t-4 border-sky-400":
      currentlyClickedItem &&
      currentlyClickedItem?.taskId !== taskId &&
      currentlyHoveredItem === taskId &&
      mouseInhabitsTopHalf,
    // Highlight bottom border when mouse is in bottom half
    "border-b-4 border-sky-400":
      currentlyClickedItem &&
      currentlyClickedItem?.taskId !== taskId &&
      currentlyHoveredItem === taskId &&
      !mouseInhabitsTopHalf,
    // Highlight background for the currently clicked item
    "bg-neutral-100":
      currentlyClickedItem &&
      currentlyClickedItem?.taskId === taskId &&
      displayDragBox &&
      (currentlyHoveredItem === taskId ||
        taskTreeIds?.includes(currentlyHoveredItem)),
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
      <div
        className={`${
          currentlyClickedItem?.taskId === taskId &&
          taskTreeIds?.includes(currentlyHoveredItem) &&
          displayDragBox &&
          "pointer-events-none" // Disable pointer events for descendants if necessary
        }`}
      >
        {children} {/* Render children */}
      </div>
    </div>
  );
}
