import { Navbar } from "@/components/interface/navbar";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  return (
    <div className="h-full w-full flex flex-col lg:flex-row lg:items-center bg-slate-600">
      <Navbar />
      <div className="h-full w-full border-l border-gray-200">{children}</div>
    </div>
  );
};

export default ProtectedLayout;
