import React, { useRef, useEffect } from "react";
import { useDraggableContext } from "@/components/draggable/DraggableContext";

export default function DragBox() {
  const { currentlyClickedItem, displayDragBox, setDisplayDragBox } =
    useDraggableContext();
  const isMouseDown = useRef(false);
  const dragBoxRef = useRef<HTMLDivElement | null>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

  const taskTitle = useRef<string>("");

  if (currentlyClickedItem) taskTitle.current = currentlyClickedItem.taskTitle;

  // Manage drag box display
  useEffect(() => {
    if (currentlyClickedItem) {
      const timeoutId = setTimeout(() => {
        if (isMouseDown.current) {
          setDisplayDragBox(true);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      setDisplayDragBox(false);
    }
  }, [currentlyClickedItem, displayDragBox]);

  // Animation loop for updating position
  useEffect(() => {
    // Mouse tracking
    function handleMouseMove(e: MouseEvent) {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    }

    function setMouseDownTrue() {
      isMouseDown.current = true;
    }

    function setMouseDownFalse() {
      isMouseDown.current = false;
    }

    document.addEventListener("mousedown", setMouseDownTrue);
    document.addEventListener("mouseup", setMouseDownFalse);
    document.addEventListener("mousemove", handleMouseMove);

    // Set animation frame for position and opacity
    function animationFrame() {
      if (dragBoxRef.current) {
        const boxWidth = dragBoxRef.current.offsetWidth;
        const boxHeight = dragBoxRef.current.offsetHeight;

        const top = `${mousePositionRef.current.y - boxHeight * 0.7}px`;
        const left = `${mousePositionRef.current.x - boxWidth / 2}px`;

        const style = dragBoxRef.current.style;

        style.top = top;
        style.left = left;
      }

      // Request the next animation frame
      animationFrameId.current = requestAnimationFrame(animationFrame);
    }

    // Start the animation loop
    animationFrameId.current = requestAnimationFrame(animationFrame);

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", setMouseDownTrue);
      document.removeEventListener("mouseup", setMouseDownFalse);
    };
  }, []);

  return (
    <div
      ref={dragBoxRef}
      style={{
        position: "fixed",
        opacity: displayDragBox ? "0.7" : "0",
        top: "0px", // Initial position
        left: "0px", // Initial position
      }}
      className="px-5 py-2 bg-sky-500 rounded-lg text-white z-50 pointer-events-none"
    >
      {taskTitle.current}
    </div>
  );
}
