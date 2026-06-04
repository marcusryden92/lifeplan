import { useSession } from "next-auth/react";
import { UserRole } from "@/lib/generated/db-client";

export const useCurrentRole = () => {
  const session = useSession();

  return session.data?.user?.role as UserRole;
};
