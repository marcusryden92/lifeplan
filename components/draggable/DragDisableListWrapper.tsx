import React from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";

// Disables the TaskList if the parent is being dragged
export default function DragDisableListWrapper({
  children,
  taskId,
}: {
  children: React.ReactNode;
  taskId: string;
}) {
  const { currentlyClickedItem, displayDragBox } = useDraggableContext();
  return (
    <div
      className={
        taskId === currentlyClickedItem?.taskId && displayDragBox
          ? `flex-grow rounded-sm pointer-events-none bg-gray-200 opacity-40`
          : "flex-grow rounded-sm"
      }
    >
      {children}
    </div>
  );
}
