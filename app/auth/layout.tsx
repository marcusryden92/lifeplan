import Link from "next/link";
import { themeLight } from "@/lib/theme";
import { VectorField } from "@/components/landing/VectorField";
import {
  page,
  fieldPanel,
  fieldWordmark,
  formPanel,
  backLink,
} from "./auth.css";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={`${themeLight} ${page}`}>
      <div className={fieldPanel}>
        <VectorField />
        <span className={fieldWordmark}>Circadium</span>
      </div>
      <div className={formPanel}>
        <Link href="/" className={backLink}>
          ← back
        </Link>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
