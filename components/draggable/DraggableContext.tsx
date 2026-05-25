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

type ClickedItem = {
  taskId: string;
  taskTitle: string;
  parentId: string;
} | null;

// Define the type for the context state
interface DraggableContextType {
  currentlyHoveredItem: string | null;
  setCurrentlyHoveredItem: React.Dispatch<SetStateAction<string | null>>;
  currentlyClickedItem: ClickedItem | null;
  setCurrentlyClickedItem: React.Dispatch<SetStateAction<ClickedItem | null>>;
  displayDragBox: boolean;
  setDisplayDragBox: React.Dispatch<SetStateAction<boolean>>;
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
}

const DraggableContext = createContext<DraggableContextType | null>(null);

export const DraggableContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // States to track hovered and clicked items
  const [currentlyHoveredItem, setCurrentlyHoveredItem] = useState<
    string | null
  >(null);
  const [currentlyClickedItem, setCurrentlyClickedItem] =
    useState<ClickedItem>(null);
  const [displayDragBox, setDisplayDragBox] = useState<boolean>(false);
  const [focusedTask, setFocusedTask] = useState<string | null>(null);

  useEffect(() => {
    function resetDisplayDragBox() {
      setDisplayDragBox(false);
      // Always clear drag selection guard on mouseup
      document.body.classList.remove("lp-dragging");
    }

    document.addEventListener("mouseup", resetDisplayDragBox);

    return () => {
      document.removeEventListener("mouseup", resetDisplayDragBox);
    };
  }, []);

  // When the drag box is visible, ensure text selection is disabled globally
  useEffect(() => {
    if (displayDragBox) {
      document.body.classList.add("lp-dragging");
    } else {
      document.body.classList.remove("lp-dragging");
    }

    return () => {
      document.body.classList.remove("lp-dragging");
    };
  }, [displayDragBox]);

  // Context value with hover and click state setters
  const value: DraggableContextType = {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
    displayDragBox,
    setDisplayDragBox,
    focusedTask,
    setFocusedTask,
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
