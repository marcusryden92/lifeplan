import React, { useRef, useCallback } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { moveToMiddle } from "@/utils/goal-handlers/update-dependencies/update-dependencies-on-move/moveToMiddle";
import {
  draggable,
  draggableHover,
  draggableGrabbing,
  draggableDropTarget,
} from "@/components/tasks/lumenTasks.css";

export default function DraggableItem({
  children,
  taskId,
  parentId,
  className,
}: {
  children: React.ReactNode;
  taskId: string;
  parentId?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { planner, updatePlannerArray } = useCalendarProvider();
  const { setFocusedTask } = useDraggableContext();

  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    displayDragBox,
  } = useDraggableContext();

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setCurrentlyHoveredItem(taskId);
    },
    [taskId, setCurrentlyHoveredItem],
  );

  const handleMouseLeave = useCallback(() => {
    if (parentId) {
      const parentElement = document.getElementById(`draggable-${parentId}`);
      if (parentElement?.matches(":hover")) {
        setCurrentlyHoveredItem(parentId);
        return;
      }
    }
    setCurrentlyHoveredItem("");
  }, [parentId, setCurrentlyHoveredItem]);

  const handleMouseUp = useCallback(() => {
    if (
      !currentlyClickedItem ||
      !currentlyHoveredItem ||
      !planner ||
      !displayDragBox
    )
      return;

    moveToMiddle({
      planner,
      updatePlannerArray,
      currentlyClickedItem,
      currentlyHoveredItem,
    });

    setFocusedTask(currentlyClickedItem.taskId);
    setCurrentlyClickedItem(null);
    setCurrentlyHoveredItem(null);
  }, [
    currentlyClickedItem,
    currentlyHoveredItem,
    planner,
    updatePlannerArray,
    setCurrentlyClickedItem,
    setCurrentlyHoveredItem,
  ]);

  const isGrabbing = !!currentlyClickedItem && displayDragBox;
  const isDropTarget =
    isGrabbing &&
    currentlyClickedItem?.taskId !== taskId &&
    currentlyHoveredItem === taskId &&
    currentlyClickedItem?.parentId !== taskId;

  const cls = [
    draggable,
    draggableHover,
    isGrabbing ? draggableGrabbing : "",
    isDropTarget ? draggableDropTarget : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      id={`draggable-${taskId}`}
      className={cls}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
    >
      {children}
    </div>
  );
}
