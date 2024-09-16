import { Navbar } from "@/components/ui/interface/navbar";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  // bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-200 to-orange-500

  return (
    <div className="h-full w-full flex flex-col lg:flex-row lg:items-center bg-white">
      <Navbar />
      <div className="h-full w-full border-l border-gray-200">{children}</div>
    </div>
  );
};

export default ProtectedLayout;
