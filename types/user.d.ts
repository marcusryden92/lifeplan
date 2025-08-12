import { UserRole } from "@/prisma/generated/client";

export type User = {
  name?: string | null;
  id?: string;
  email?: string | null;
  image?: string | null;
  role?: UserRole;
  isTwoFactorEnabled?: boolean;
};
