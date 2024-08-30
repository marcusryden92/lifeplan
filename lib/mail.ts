import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const domain = process.env.NEXT_PUBLIC_APP_URL;

export const sendTwoFactorTokenEmail = async (email: string, token: string) => {
  await resend.emails.send({
    from: "2f-verification@lifeplan.lat",
    to: email,
    subject: "2FA Code",
    html: `<p>Your 2FA code: ${token}`,
  });
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const confirmationLink = `${domain}/auth/new-verification?token=${token}`;

  await resend.emails.send({
    from: "verify-account@lifeplan.lat",
    to: email,
    subject: "Confirm your email",
    html: `<p>Click <a href=${confirmationLink}>here</a> to confirm email!</p>`,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${domain}/auth/new-password?token=${token}`;

  await resend.emails.send({
    from: "reset-password@lifeplan.lat",
    to: email,
    subject: "Reset your password",
    html: `<p>Click <a href=${resetLink}>here</a> to reset password!</p>`,
  });
};
