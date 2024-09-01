import { Navbar } from "@/components/ui/interface/navbar";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  // bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-200 to-orange-500

  return (
    <div className="h-full w-full flex gap-10 items-center p-10">
      <Navbar />
      {children}
    </div>
  );
};

export default ProtectedLayout;
