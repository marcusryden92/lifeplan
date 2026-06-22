import { Grain } from "@/components/ui";
import { page } from "./auth.css";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={page}>
      <Grain />
      {children}
    </div>
  );
};

export default AuthLayout;
