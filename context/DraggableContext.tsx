"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  SetStateAction,
} from "react";

// Define the type for the context state
interface DraggableContextType {
  currentlyHoveredItem: string;
  setCurrentlyHoveredItem: React.Dispatch<SetStateAction<string>>;
  currentlyClickedItem: string;
  setCurrentlyClickedItem: React.Dispatch<SetStateAction<string>>;
  isInTop: boolean;
}

const DraggableContext = createContext<DraggableContextType | null>(null);

export const DraggableContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // States to track hovered and clicked items
  const [currentlyHoveredItem, setCurrentlyHoveredItem] = useState<string>("");
  const [currentlyClickedItem, setCurrentlyClickedItem] = useState<string>("");
  const [isInTop, setIsInTop] = useState<boolean>(false);

  const [mousePosition, setMousePosition] = useState<{ clientY: number }>({
    clientY: 0,
  });

  // Track mouse position
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ clientY: e.clientY });
    };

    // Listen to mouse move events
    document.addEventListener("mousemove", updateMousePosition);

    return () => {
      document.removeEventListener("mousemove", updateMousePosition);
    };
  }, []);

  // Update `currentlyClickedItem` when mouse is released
  useEffect(() => {
    const handleMouseUp = () => {
      if (currentlyClickedItem.length > 0) {
        setCurrentlyClickedItem("");
      }
    };

    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [currentlyClickedItem]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (currentlyHoveredItem.length > 0) {
        const element = document.getElementById(currentlyHoveredItem); // Access the element by id

        if (element) {
          const rect = element.getBoundingClientRect();
          const isInTop = mousePosition.clientY < rect.top + rect.height / 2;
          setIsInTop(isInTop);
        }
      }
    }, 10);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  useEffect(() => {
    console.log(currentlyHoveredItem);
  }, [currentlyHoveredItem]);

  // Context value with hover and click state setters
  const value: DraggableContextType = {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    isInTop,
  };

  return (
    <DraggableContext.Provider value={value}>
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
