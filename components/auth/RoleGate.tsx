"use client";

import { useCurrentRole } from "@/hooks/useCurrentRole";
import { UserRole } from "@/prisma/generated/client";
import { FormError } from "@/components/ui/FormError";

interface RoleGateProps {
  children: React.ReactNode;
  allowedRole: UserRole;
}

export const RoleGate = ({ children, allowedRole }: RoleGateProps) => {
  const role = useCurrentRole();

  if (role != allowedRole) {
    return (
      <FormError message="You do not have permission to view this page!"></FormError>
    );
  }

  return <>{children}</>;
};
