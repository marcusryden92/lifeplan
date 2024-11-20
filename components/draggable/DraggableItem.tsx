import React, { useState, useRef, useCallback, useEffect } from "react";
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
  const ref = useRef<HTMLDivElement>(null);
  const dragTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isTopHalf, setIsTopHalf] = useState(false);
  const [isItemDragging, setIsItemDragging] = useState(false);

  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    mousePosition,
  } = useDraggableContext();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const middleY = rect.top + rect.height / 2;
        setIsTopHalf(e.clientY < middleY);

        setCurrentlyClickedItem(taskId);

        // Clear any existing timer
        if (dragTimerRef.current) {
          clearTimeout(dragTimerRef.current);
        }

        // Set a delay before marking as dragging
        dragTimerRef.current = setTimeout(() => {
          setIsItemDragging(true);
        }, 200); // 200ms delay
      }
    },
    [taskId, setCurrentlyClickedItem]
  );

  const handleMouseUp = useCallback(() => {
    // Clear the timer if mouse up happens before drag starts
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
    }
    setIsItemDragging(false);
    setCurrentlyClickedItem("");
  }, [setCurrentlyClickedItem]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    setCurrentlyHoveredItem(taskId);
  }, [taskId, setCurrentlyHoveredItem]);

  const handleMouseLeave = useCallback(() => {
    setCurrentlyHoveredItem("");
  }, [setCurrentlyHoveredItem]);

  const borderClass =
    currentlyHoveredItem === taskId &&
    currentlyClickedItem !== taskId &&
    currentlyClickedItem.length > 0
      ? isTopHalf
        ? "border-t-4 border-sky-400"
        : "border-b-4 border-sky-400"
      : "";

  return (
    <>
      {isItemDragging && (
        <div
          className="fixed px-5 py-2 bg-sky-500 rounded-lg text-white opacity-60 pointer-events-none"
          style={{
            top: mousePosition.clientY,
            left: mousePosition.clientX,
          }}
        >
          {taskTitle}
        </div>
      )}

      <div
        ref={ref}
        className={borderClass}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {children}
      </div>
    </>
  );
}
