import { Navbar } from "@/components/ui/interface/navbar";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  return (
    <div className="h-full w-full flex flex-col gap-y-10 items-center justify-center bg-[radial-gradient(ellipse_at_left_top,_var(--tw-gradient-stops))] from-orange-200 to-orange-500">
      <Navbar />
      {children}
    </div>
  );
};

export default ProtectedLayout;
