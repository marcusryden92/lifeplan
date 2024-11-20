import React, { useState, useRef, useEffect } from "react";
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
  //
  const [mouseInhabitsTopHalf, setMouseInhabitsTopHalf] = useState<
    boolean | null
  >(null);
  const [displayDragBox, setDisplayDragBox] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    mousePosition,
  } = useDraggableContext();

  // Functions to set hovered item to this item when hovering it, and clearing when leaving
  function handleMouseEnter() {
    setTimeout(() => {
      setCurrentlyHoveredItem(taskId);
    }, 10);
  }

  function handleMouseLeave() {
    setCurrentlyHoveredItem("");
  }

  // Function to set clicked item to this item. Clearing happens in DraggablContext
  function handleMouseDown() {
    setTimeout(() => {
      setCurrentlyClickedItem(taskId);
    }, 10);
  }

  // Check if the mouse is on the bottom or top part of the div

  useEffect(() => {
    document.addEventListener("mousemove", updateMousePosition);
    return () => {
      document.removeEventListener("mousemove", updateMousePosition);
    };
  }, []);

  function updateMousePosition() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const middleY = rect.top + rect.height / 2;
      setMouseInhabitsTopHalf(mousePosition.clientY < middleY);
    }
  }

  // Enable the dragbox when clicking the div
  useEffect(() => {
    function setDragBox() {
      setTimeout(() => {
        if (
          currentlyClickedItem.length > 0 &&
          currentlyClickedItem === taskId
        ) {
          setDisplayDragBox(true);
        }
      }, 200);
    }

    function clearDragBox() {
      setDisplayDragBox(false);
    }
    document.addEventListener("mousedown", setDragBox);
    document.addEventListener("mouseup", clearDragBox);

    return () => {
      document.removeEventListener("mousedown", setDragBox);
      document.removeEventListener("mouseup", clearDragBox);
    };
  }, []);

  const borderClass =
    currentlyHoveredItem === taskId &&
    currentlyClickedItem !== taskId &&
    currentlyClickedItem.length > 0
      ? mouseInhabitsTopHalf
        ? "border-t-4 border-sky-400"
        : "border-b-4 border-sky-400"
      : "";

  return (
    <>
      {displayDragBox && (
        <div
          style={{
            position: "fixed",
            top: mousePosition.clientY,
            left: mousePosition.clientX,
          }}
          className="px-5 py-2 bg-sky-500 rounded-lg text-white opacity-60"
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
      >
        {children}
      </div>
    </>
  );
}
