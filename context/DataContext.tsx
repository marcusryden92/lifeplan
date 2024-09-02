import { createContext, useContext, useState, ReactNode } from "react";
import { Planner } from "@/lib/plannerClass";

interface DataContextType {
  taskArray: Planner[];
  setTaskArray: React.Dispatch<React.SetStateAction<Planner[]>>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
  const [taskArray, setTaskArray] = useState<Planner[]>([]);

  const value: DataContextType = {
    taskArray,
    setTaskArray,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within a DataContextProvider");
  }
  return context;
};
