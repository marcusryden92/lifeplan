import React from "react";
import { useDraggableContext } from "@/context/DraggableContext";

export default function DraggableItem({
  children,
  taskId,
}: {
  children: React.ReactNode;
  taskId: string;
}) {
  const { setCurrentlyHoveredItem, setCurrentlyClickedItem } =
    useDraggableContext();

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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}
