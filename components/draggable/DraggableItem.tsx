import React from "react";
import { useDraggableContext } from "@/context/DraggableContext";

export default function DraggableItem({
  children,
  taskId,
}: {
  children: React.ReactNode;
  taskId: string;
}) {
  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    isInTop,
  } = useDraggableContext();

  function handleMouseEnter() {
    setTimeout(() => {
      setCurrentlyHoveredItem(taskId);
    }, 10);
  }

  function handleMouseLeave() {
    setCurrentlyHoveredItem("");
  }

  function handleMouseDown() {
    setTimeout(() => {
      setCurrentlyClickedItem(taskId);
    }, 10);
  }

  return (
    <div
      id={taskId}
      className={`${
        currentlyHoveredItem === taskId && currentlyClickedItem !== taskId
          ? isInTop && "border-t-4 border-sky-400"
          : ""
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}
