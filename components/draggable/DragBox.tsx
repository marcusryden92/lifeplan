import React, { useRef, useEffect } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";

export default function DragBox() {
  const { currentlyClickedItem, displayDragBox, setDisplayDragBox } =
    useDraggableContext();
  const isMouseDown = useRef(false);
  const dragBoxRef = useRef<HTMLDivElement | null>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

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
  }, [currentlyClickedItem, setDisplayDragBox]);

  // Animation loop for updating position
  useEffect(() => {
    function updateElementPosition() {
      if (dragBoxRef.current) {
        const boxWidth = dragBoxRef.current.offsetWidth;
        const boxHeight = dragBoxRef.current.offsetHeight;

        dragBoxRef.current.style.top = `${
          mousePositionRef.current.y - boxHeight * 0.7
        }px`;
        dragBoxRef.current.style.left = `${
          mousePositionRef.current.x - boxWidth / 2
        }px`;
      }

      animationFrameId.current = requestAnimationFrame(updateElementPosition);
    }

    function handleMouseMove(e: MouseEvent) {
      // Only track the mouse position, don't update DOM here
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    }

    // Start the animation loop
    animationFrameId.current = requestAnimationFrame(updateElementPosition);
    // Just track mouse position on move event
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={dragBoxRef}
      style={{
        position: "fixed",
        top: "0px", // Initial position
        left: "0px", // Initial position
        opacity: displayDragBox ? "100%" : "0%",
      }}
      className="px-5 py-2 bg-sky-500 rounded-lg text-white opacity-60 z-50 pointer-events-none"
    >
      {currentlyClickedItem?.taskTitle}
    </div>
  );
}
