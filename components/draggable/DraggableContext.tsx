"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
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
  // Transient post-drop marker: the just-moved row flashes so it's findable
  // wherever it landed. Self-clears; separate from focusedTask, which opens
  // the edit drawer on the subtasks page.
  droppedTask: string | null;
  flashDroppedTask: (taskId: string) => void;
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
  const [droppedTask, setDroppedTask] = useState<string | null>(null);
  const droppedTimerRef = useRef<number | null>(null);

  // Duration matches the dropFlash keyframe animation in lumenTasks.css.ts.
  const flashDroppedTask = useCallback((taskId: string) => {
    if (droppedTimerRef.current !== null)
      window.clearTimeout(droppedTimerRef.current);
    setDroppedTask(taskId);
    droppedTimerRef.current = window.setTimeout(() => {
      setDroppedTask(null);
      droppedTimerRef.current = null;
    }, 700);
  }, []);

  useEffect(
    () => () => {
      if (droppedTimerRef.current !== null)
        window.clearTimeout(droppedTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    function resetDisplayDragBox() {
      setDisplayDragBox(false);
    }

    document.addEventListener("mouseup", resetDisplayDragBox);

    return () => {
      document.removeEventListener("mouseup", resetDisplayDragBox);
    };
  }, []);

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
    droppedTask,
    flashDroppedTask,
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
