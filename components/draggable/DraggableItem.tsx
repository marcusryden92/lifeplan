import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDraggableContext } from "@/context/DraggableContext";
import clsx from "clsx";

export default function DraggableItem({
  children,
  taskId,
  taskTitle,
}: {
  children: React.ReactNode;
  taskId: string;
  taskTitle: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mouseInhabitsTopHalf, setMouseInhabitsTopHalf] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    mousePosition,
  } = useDraggableContext();

  // Mouse position check, with debounce for performance
  const updateMousePosition = useCallback(() => {
    if (
      ref.current &&
      currentlyClickedItem &&
      currentlyClickedItem.taskId !== taskId
    ) {
      const rect = ref.current.getBoundingClientRect();
      const middleY = rect.top + rect.height / 2;
      setMouseInhabitsTopHalf(mousePosition.clientY < middleY);
    }
  }, [mousePosition, currentlyClickedItem, taskId]);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(updateMousePosition, 16); // ~60fps

    return () => {
      clearTimeout(debounceTimer.current);
    };
  }, [mousePosition, updateMousePosition]);

  // Sets currently hovered item
  const handleMouseEnter = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Timeout to prevent interference from clearing of previous item
    setTimeout(() => {
      setCurrentlyHoveredItem(taskId);
    });
  };

  // Clears currently hovered item
  const handleMouseLeave = () => {
    setCurrentlyHoveredItem("");
  };

  // Update currently clicked item ID & title
  // (state is cleared on mouseUp in DraggableContext)
  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    setCurrentlyClickedItem({ taskId, taskTitle });
  };

  // Use clsx to simplify the border logic
  const borderClasses = clsx({
    "cursor-grab": !currentlyClickedItem, // Use cursor-grab when not clicked
    "cursor-grabbing": currentlyClickedItem, // Use cursor-grabbing when clicked

    // Apply styles when item is clicked but not currently clicked, hovered and mouse in top half
    "border-t-4 border-sky-400":
      currentlyClickedItem &&
      currentlyClickedItem?.taskId !== taskId &&
      currentlyHoveredItem === taskId &&
      mouseInhabitsTopHalf,

    // Apply styles when item is clicked but not currently clicked, hovered and mouse in bottom half
    "border-b-4 border-sky-400":
      currentlyClickedItem &&
      currentlyClickedItem?.taskId !== taskId &&
      currentlyHoveredItem === taskId &&
      !mouseInhabitsTopHalf,

    // Apply styles when item is both clicked and hovered
    "bg-red-100":
      currentlyClickedItem &&
      currentlyClickedItem?.taskId === taskId &&
      currentlyHoveredItem === taskId,
  });

  return (
    <div
      ref={ref}
      className={borderClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}
