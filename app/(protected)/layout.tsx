import { Navbar } from "@/components/ui/interface/navbar";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  // bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-200 to-orange-500

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-5 p-2 lg:gap-10 lg:p-10 lg:items-center">
      <Navbar />
      {children}
    </div>
  );
};

export default ProtectedLayout;
