"use client";

import { Navbar } from "@/components/interface/navbar";
import { DraggableContextProvider } from "@/components/draggable/DraggableContext";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  return (
    <div className="lg:h-full w-full flex flex-col lg:flex-row lg:items-center bg-white">
      <DraggableContextProvider>
        <Navbar />
        <div className="h-full w-full border-l border-gray-200">
          {children}
        </div>{" "}
      </DraggableContextProvider>
    </div>
  );
};

export default ProtectedLayout;
