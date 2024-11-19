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
    }, 20);
  }

  function handleMouseLeave() {
    setCurrentlyHoveredItem("");
  }

  function handleMouseDown() {
    setTimeout(() => {
      setCurrentlyClickedItem(taskId);
    }, 20);
  }

  function handleMouseUp() {
    setCurrentlyClickedItem("");
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {children}
    </div>
  );
}
