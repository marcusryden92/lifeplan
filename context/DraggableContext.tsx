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
  currentlyHovered: string;
  setCurrentlyHovered: React.Dispatch<SetStateAction<string>>;
}

const DraggableContext = createContext<DraggableContextType | null>(null);

export const DraggableContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [currentlyHovered, setCurrentlyHovered] = useState<string>("");

  useEffect(() => {
    console.log(currentlyHovered);
  }, [currentlyHovered]);

  const value: DraggableContextType = {
    currentlyHovered,
    setCurrentlyHovered,
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
