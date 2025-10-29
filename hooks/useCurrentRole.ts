import { useSession } from "next-auth/react";
import { UserRole } from "@/prisma/generated/client";

export const useCurrentRole = () => {
  const session = useSession();

  return session.data?.user?.role as UserRole | undefined;
};
