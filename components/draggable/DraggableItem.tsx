import React, { useState, useRef, useEffect } from "react";
import { useDraggableContext } from "@/context/DraggableContext";

export default function DraggableItem({
  children,
  taskId,
  taskTitle,
}: {
  children: React.ReactNode;
  taskId: string;
  taskTitle: string;
}) {
  const [mouseInhabitsTopHalf, setMouseInhabitsTopHalf] =
    useState<boolean>(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    mousePosition,
  } = useDraggableContext();

  // Functions to set hovered item to this item when hovering it, and clearing when leaving
  function handleMouseEnter(event: React.MouseEvent) {
    event.stopPropagation(); // Prevent hover propagation to parent
    setTimeout(() => {
      setCurrentlyHoveredItem(taskId);
    }, 10);
  }

  function handleMouseLeave() {
    setCurrentlyHoveredItem("");
  }

  // Function to set clicked item to this item. Clearing happens in DraggableContext
  function handleMouseDown(event: React.MouseEvent) {
    event.stopPropagation(); // Prevent click propagation to parent
    setTimeout(() => {
      setCurrentlyClickedItem({ taskId, taskTitle });
    }, 10);
  }

  // Check if the mouse is on the bottom or top part of the div
  useEffect(() => {
    document.addEventListener("mousemove", updateMousePosition);
    return () => {
      document.removeEventListener("mousemove", updateMousePosition);
    };
  }, []);

  function updateMousePosition() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const middleY = rect.top + rect.height / 2;
      setMouseInhabitsTopHalf(mousePosition.clientY < middleY);
    }
  }

  const borderClass =
    currentlyHoveredItem === taskId &&
    currentlyClickedItem &&
    currentlyClickedItem.taskId !== taskId
      ? mouseInhabitsTopHalf
        ? "border-t-4 border-sky-400"
        : "border-b-4 border-sky-400"
      : "";

  return (
    <>
      <div
        ref={ref}
        className={`${borderClass} border `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </>
  );
}
