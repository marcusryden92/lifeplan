"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  SetStateAction,
} from "react";

import DragBox from "@/components/draggable/DragBox";

type ClickedItem = { taskId: string; taskTitle: string } | undefined;

// Define the type for the context state
interface DraggableContextType {
  currentlyHoveredItem: string;
  setCurrentlyHoveredItem: React.Dispatch<SetStateAction<string>>;
  currentlyClickedItem: ClickedItem;
  setCurrentlyClickedItem: React.Dispatch<SetStateAction<ClickedItem>>;
  mousePosition: {
    clientX: number;
    clientY: number;
  };
  displayDragBox: boolean;
  setDisplayDragBox: React.Dispatch<SetStateAction<boolean>>;
}

const DraggableContext = createContext<DraggableContextType | null>(null);

export const DraggableContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // States to track hovered and clicked items
  const [currentlyHoveredItem, setCurrentlyHoveredItem] = useState<string>("");
  const [currentlyClickedItem, setCurrentlyClickedItem] =
    useState<ClickedItem>(undefined);
  const [displayDragBox, setDisplayDragBox] = useState<boolean>(false);

  const [mousePosition, setMousePosition] = useState<{
    clientX: number;
    clientY: number;
  }>({
    clientX: 0,
    clientY: 0,
  });

  // Track mouse position
  useEffect(() => {
    let animationFrameId: number;
    let lastKnownMousePosition = { clientX: 0, clientY: 0 };

    const updateMousePosition = (e: MouseEvent) => {
      lastKnownMousePosition = { clientX: e.clientX, clientY: e.clientY };
    };

    const trackMouse = () => {
      setMousePosition(lastKnownMousePosition);
      animationFrameId = requestAnimationFrame(trackMouse);
    };

    // Listen to mouse move events
    document.addEventListener("mousemove", updateMousePosition);

    // Start tracking on mount
    animationFrameId = requestAnimationFrame(trackMouse);

    return () => {
      // Clean up
      document.removeEventListener("mousemove", updateMousePosition);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Update `currentlyClickedItem` when mouse is released
  useEffect(() => {
    const handleMouseUp = () => {
      if (currentlyClickedItem) {
        /*Input task-list sorting functionality here*
         *
         *
         *
         *
         *
         */
        setCurrentlyClickedItem(undefined);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [currentlyClickedItem]);

  // Context value with hover and click state setters
  const value: DraggableContextType = {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    mousePosition,
    displayDragBox,
    setDisplayDragBox,
  };

  return (
    <DraggableContext.Provider value={value}>
      <DragBox />

      {children}
    </DraggableContext.Provider>
  );
};

// Hook to use the context in other components
export const useDraggableContext = () => {
  const context = useContext(DraggableContext);
  if (!context) {
    throw new Error(
      "useDraggableContext must be used within a DraggableContextProvider"
    );
  }
  return context;
};
