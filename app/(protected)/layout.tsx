"use client";

import { Navbar } from "@/components/interface/navbar";
import { DraggableContextProvider } from "@/components/draggable/DraggableContext";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  return (
    <div className="flex flex-col h-auto lg:h-full flex-1 lg:flex-row lg:items-center bg-white">
      <DraggableContextProvider>
        <Navbar />
        <div className="h-full w-auto flex-1 lg:max-h-[100vh] overflow-hidden border-l border-gray-200">
          {children}
        </div>
      </DraggableContextProvider>
    </div>
  );
};

export default ProtectedLayout;
