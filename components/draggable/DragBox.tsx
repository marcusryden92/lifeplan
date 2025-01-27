import React, { useRef, useEffect } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";

export default function DragBox() {
  const {
    currentlyClickedItem,
    mousePosition,
    displayDragBox,
    setDisplayDragBox,
  } = useDraggableContext();
  const isMouseDown = useRef(false);
  const dragBoxRef = useRef<HTMLDivElement | null>(null);

  // Track mouse down/up states
  useEffect(() => {
    function setMouseDownTrue() {
      isMouseDown.current = true;
    }

    function setMouseDownFalse() {
      isMouseDown.current = false;
    }

    document.addEventListener("mousedown", setMouseDownTrue);
    document.addEventListener("mouseup", setMouseDownFalse);

    return () => {
      document.removeEventListener("mousedown", setMouseDownTrue);
      document.removeEventListener("mouseup", setMouseDownFalse);
    };
  }, []);

  // Adjust position after rendering the drag box
  const getAdjustedPosition = () => {
    if (!dragBoxRef.current || !mousePosition) return { top: 0, left: 0 };

    const boxWidth = dragBoxRef.current.offsetWidth;
    const boxHeight = dragBoxRef.current.offsetHeight;

    // Adjust the position to center the box over the cursor
    return {
      top: mousePosition.clientY - boxHeight * 0.7,
      left: mousePosition.clientX - boxWidth / 2,
    };
  };

  // Manage drag box display
  useEffect(() => {
    if (currentlyClickedItem) {
      const timeoutId = setTimeout(() => {
        if (isMouseDown.current) {
          setDisplayDragBox(true);
        }
      }, 150);

      return () => clearTimeout(timeoutId);
    } else {
      setDisplayDragBox(false);
    }
  }, [currentlyClickedItem]);

  // Only render if we have an item and should display
  if (!displayDragBox || !currentlyClickedItem) return null;

  return (
    <div
      ref={dragBoxRef}
      style={{
        position: "fixed",
        top: `${getAdjustedPosition().top}px`,
        left: `${getAdjustedPosition().left}px`,
      }}
      className="px-5 py-2 bg-sky-500 rounded-lg text-white opacity-60 z-50 pointer-events-none"
    >
      {currentlyClickedItem.taskTitle}
    </div>
  );
}
