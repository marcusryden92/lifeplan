import React, { useState, useRef, useEffect } from "react";
import { useDraggableContext } from "@/context/DraggableContext";

export default function DragBox() {
  const { currentlyClickedItem, mousePosition } = useDraggableContext();
  const [displayDragBox, setDisplayDragBox] = useState<boolean>(false);
  const isMouseDown = useRef(false); // Track mouse state
  const dragBoxRef = useRef<HTMLDivElement | null>(null); // Reference to the drag box

  useEffect(() => {
    if (currentlyClickedItem) {
      setTimeout(() => {
        if (isMouseDown) setDisplayDragBox(true);
      }, 200);
    } else setDisplayDragBox(false);
  }, [currentlyClickedItem]);

  // Enable the dragbox when clicking the div
  useEffect(() => {
    function setMouseDownTrue() {
      isMouseDown.current = true; // Update the ref
    }

    function setMouseDownFalse() {
      isMouseDown.current = false; // Update the ref
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
    if (!dragBoxRef.current)
      return { top: mousePosition.clientY, left: mousePosition.clientX };

    const boxWidth = dragBoxRef.current.offsetWidth;
    const boxHeight = dragBoxRef.current.offsetHeight;

    // Adjust the position to center the box over the cursor
    return {
      top: mousePosition.clientY - boxHeight / 2,
      left: mousePosition.clientX - boxWidth / 2,
    };
  };

  return (
    <>
      {displayDragBox && currentlyClickedItem && (
        <div
          ref={dragBoxRef}
          style={{
            position: "fixed",
            top: getAdjustedPosition().top,
            left: getAdjustedPosition().left,
          }}
          className="px-5 py-2 bg-sky-500 rounded-lg text-white opacity-60"
        >
          {currentlyClickedItem.taskTitle}
        </div>
      )}
    </>
  );
}
