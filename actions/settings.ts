"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";

import { SettingsSchema } from "@/schemas";
import { db } from "@/lib/db";
import { getUserByEmail, getUserById } from "@/data/user";

import { currentUser } from "@/lib/auth";
import { generateVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";

export const settings = async (values: z.infer<typeof SettingsSchema>) => {
  const user = await currentUser();

  if (!user) {
    return { error: "Unauthorized." };
  }

  const dbUser = await getUserById(user.id as string);

  if (!dbUser) {
    return { error: "Unauthorized." };
  }

  // Runtime validation — the z.infer type is compile-time only, so a caller
  // can send arbitrary User columns without this.
  const parsed = SettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Invalid fields." };
  }
  const data = parsed.data;

  if (user.isOAuth) {
    data.email = undefined;
    data.password = undefined;
    data.newPassword = undefined;
    data.isTwoFactorEnabled = undefined;
  }

  if (data.email && data.email !== user.email) {
    const existingUser = await getUserByEmail(data.email);

    if (existingUser && existingUser.id !== user.id) {
      return { error: "Email already in use!" };
    }

    // Bind the token to the user id — the new email doesn't resolve to any
    // user row yet, so newVerification can't look the account up by email.
    const verificationToken = await generateVerificationToken(
      data.email,
      dbUser.id,
    );

    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token
    );

    return { success: "Verification email sent!" };
  }

  // Explicit whitelist — never spread client input into the update. The User
  // row also carries role, emailVerified, and the OCC dataVersion counter;
  // none of those are settable from here.
  const update: {
    name?: string;
    password?: string;
    isTwoFactorEnabled?: boolean;
  } = {};

  if (data.name !== undefined) {
    update.name = data.name;
  }
  if (data.isTwoFactorEnabled !== undefined) {
    update.isTwoFactorEnabled = data.isTwoFactorEnabled;
  }

  if (data.password && data.newPassword && dbUser.password) {
    const passwordsMatch = await bcrypt.compare(data.password, dbUser.password);

    if (!passwordsMatch) {
      return { error: "Incorrect password!" };
    }

    update.password = await bcrypt.hash(data.newPassword, 10);
  }

  if (Object.keys(update).length === 0) {
    return { success: "Settings updated!" };
  }

  await db.user.update({
    where: { id: dbUser.id },
    data: update,
  });

  return { success: "Settings updated!" };
};
