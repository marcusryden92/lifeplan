import React from "react";
import { useDraggableContext } from "@/context/DraggableContext";

export default function DraggableItem({
  children,
  taskId,
}: {
  children: React.ReactNode;
  taskId: string;
}) {
  const { setCurrentlyHovered } = useDraggableContext();

  return (
    <div
      onTouchStart={() => {
        setCurrentlyHovered(taskId);
      }}
      onTouchEnd={() => {
        setCurrentlyHovered("");
      }}
    >
      {children}
    </div>
  );
}
