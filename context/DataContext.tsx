import { createContext, useContext, useState, ReactNode } from "react";

// Define the type for the context value
interface DataContextType {
  // Add properties that your context will manage
  someValue: string;
  setSomeValue: (value: string) => void;
}

// Create the context with a default value of `null`
const DataContext = createContext<DataContextType | null>(null);

export const DataContextProvider = ({ children }: { children: ReactNode }) => {
  const [someValue, setSomeValue] = useState<string>("Initial Value");

  const value = {
    someValue,
    setSomeValue,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// Custom hook to use the context
export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within a DataContextProvider");
  }
  return context;
};
