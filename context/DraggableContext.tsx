"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  SetStateAction,
} from "react";

interface DraggableContextType {
  currentlyHoveredItem: string;
  setCurrentlyHoveredItem: React.Dispatch<SetStateAction<string>>;
  currentlyClickedItem: string;
  setCurrentlyClickedItem: React.Dispatch<SetStateAction<string>>;
}

const DraggableContext = createContext<DraggableContextType | null>(null);

export const DraggableContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [currentlyHoveredItem, setCurrentlyHoveredItem] = useState<string>("");
  const [currentlyClickedItem, setCurrentlyClickedItem] = useState<string>("");

  useEffect(() => {
    console.log(currentlyHoveredItem);
  }, [currentlyHoveredItem]);

  const value: DraggableContextType = {
    currentlyHoveredItem,
    setCurrentlyHoveredItem,
    currentlyClickedItem,
    setCurrentlyClickedItem,
  };

  return (
    <DraggableContext.Provider value={value}>
      {children}
    </DraggableContext.Provider>
  );
};

export const useDraggableContext = () => {
  const context = useContext(DraggableContext);
  if (!context) {
    throw new Error(
      "useDraggableContext must be used within a DraggableContextProvider"
    );
  }
  return context;
};
