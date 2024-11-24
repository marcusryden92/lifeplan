import React from "react";
import { useDraggableContext } from "@/context/DraggableContext";

import styles from "./DragDisableListWrapper.module.css";

// Disables the TaskList if the parent is being dragged
export default function DragDisableListWrapper({
  children,
  taskId,
}: {
  children: React.ReactNode;
  taskId: string;
}) {
  const { currentlyClickedItem } = useDraggableContext();
  return (
    <div
      className={
        taskId === currentlyClickedItem?.taskId
          ? `pointer-events-none ${styles["striated-background"]}`
          : ""
      }
    >
      {children}
    </div>
  );
}
