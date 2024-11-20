import React, { useState, useRef, useEffect } from "react";
import { useDraggableContext } from "@/context/DraggableContext";

export default function DraggableItem({
  children,
  taskId,
}: {
  children: React.ReactNode;
  taskId: string;
}) {
  const [mouseInhabitsTopHalf, setMouseInhabitsTopHalf] = useState<
    boolean | null
  >(null);

  const ref = useRef<HTMLDivElement | null>(null);

  const {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
  } = useDraggableContext();

  function handleMouseEnter() {
    setTimeout(() => {
      setCurrentlyHoveredItem(taskId);
    }, 10);
  }

  function handleMouseLeave() {
    setCurrentlyHoveredItem("");
  }

  function handleMouseDown() {
    setTimeout(() => {
      setCurrentlyClickedItem(taskId);
    }, 10);
  }

  function updateMousePosition(e: MouseEvent) {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const middleY = rect.top + rect.height / 2;
      setMouseInhabitsTopHalf(e.clientY < middleY);
    }
  }

  useEffect(() => {
    document.addEventListener("mousemove", updateMousePosition);
    return () => {
      document.removeEventListener("mousemove", updateMousePosition);
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
    <div
      ref={ref}
      className={borderClass}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}
