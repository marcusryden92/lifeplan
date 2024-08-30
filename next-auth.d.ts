import { UserRole } from "@prisma/client";
import NextAuth, { type DefaultSession } from "next-auth";

export type ExtendedUser = DefaultSession["user"] & {
  role: UserRole;
  isTwoFactorEnabled: boolean;
  isOAuth: boolean;
};

declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }
}

/* import { JWT } from "@auth/core/jwt";

declare module "@auth/core/jwt" {
  interface JWT {
    role?: "ADMIN" | "USER";
  }
}
 */

export type User = {
  id: string; // The unique identifier for the user, with a default value generated by cuid().
  name?: string; // Optional user name.
  email?: string; // Optional email, must be unique.
  emailVerified?: Date; // Optional email verification date, mapped to "email_verified" in the database.
  image?: string; // Optional user image URL.
  password?: string; // Optional user password.
  role: UserRole; // User role, defaults to USER.
  accounts: Account[]; // An array of Account objects related to this user.
  isTwoFactorEnabled: boolean; // Indicates if two-factor authentication is enabled, defaults to false.
  twoFactorConfirmation?: TwoFactorConfirmation; // Optional two-factor authentication confirmation.
};

export type SettingsPageUser = {
  name?: string; // Optional user name.
  email?: string; // Optional email, must be unique.
  image?: string; // Optional user image URL.
  id: string; // The unique identifier for the user, with a default value generated by cuid().
  role: UserRole; // User role, defaults to USER.
  isTwoFactorEnabled: boolean; // Indicates if two-factor authentication is enabled, defaults to false.
  isOAuth?: boolean;
};

type Account = {
  id: string; // The unique identifier for the account, with a default value generated by cuid().
  userId: string; // The user ID this account is associated with, mapped to "user_id" in the database.
  type: string; // Type of the account (e.g., OAuth, etc.).
  provider: string; // The provider of the account (e.g., Google, Facebook).
  providerAccountId: string; // The unique identifier for the account provided by the provider, mapped to "provider_account_id" in the database.
  refresh_token?: string; // Optional refresh token, stored as text in the database.
  access_token?: string; // Optional access token, stored as text in the database.
  expires_at?: number; // Optional expiration timestamp for the access token.
  token_type?: string; // Optional token type (e.g., Bearer).
  scope?: string; // Optional scope of the access granted by the token.
  id_token?: string; // Optional ID token, stored as text in the database.
  session_state?: string; // Optional session state.

  user: User; // The user this account is associated with.
};
