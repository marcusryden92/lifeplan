import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.NEXT_PUBLIC_APP_URL;

// URL to your header image
const headerImageUrl = `${domain}/images/LIFEPLAN.png`;

// Common HTML template with styling
const emailHeader = `
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
      .header { text-align: center; padding: 20px; background-color: #f4f4f4; }
      .header img { max-width: 100%; height: auto; }
      .content { padding: 20px; }
      .content a { color: #0044cc; text-decoration: none; }
      .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background-color: #f4f4f4; }
    </style>
  </head>
  <body>
`;

const emailFooter = `
    <div class="footer">
      <p>Best regards,<br>The LifePlan Team</p>
    </div>
  </body>
  </html>
`;

export const sendTwoFactorTokenEmail = async (email: string, token: string) => {
  const htmlContent = `
    ${emailHeader}
    <div class="header">
      <img src="${headerImageUrl}" alt="LIFEPLAN Header" />
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Here is your two-factor authentication (2FA) code to complete the login process:</p>
      <p><strong>${token}</strong></p>
      <p>If you did not request this code, please ignore this email.</p>
    </div>
    ${emailFooter}
  `;

  await resend.emails.send({
    from: "security@lifeplan.lat",
    to: email,
    subject: "Your Two-Factor Authentication Code",
    html: htmlContent,
  });
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const confirmationLink = `${domain}/auth/new-verification?token=${token}`;
  const htmlContent = `
    ${emailHeader}
    <div class="header">
      <img src="${headerImageUrl}" alt="LIFEPLAN Header" />
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>Thank you for signing up with LifePlan!</p>
      <p>To complete your registration, please verify your email address by clicking the link below:</p>
      <p><a href="${confirmationLink}">Verify My Email Address</a></p>
      <p>If you did not create an account, please disregard this email.</p>
    </div>
    ${emailFooter}
  `;

  await resend.emails.send({
    from: "support@lifeplan.lat",
    to: email,
    subject: "Please Verify Your Email Address",
    html: htmlContent,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${domain}/auth/new-password?token=${token}`;
  const htmlContent = `
    ${emailHeader}
    <div class="header">
      <img src="${headerImageUrl}" alt="LIFEPLAN Header" />
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>We received a request to reset your password. You can reset it using the link below:</p>
      <p><a href="${resetLink}">Reset My Password</a></p>
      <p>If you did not request a password reset, please ignore this email or contact support.</p>
    </div>
    ${emailFooter}
  `;

  await resend.emails.send({
    from: "support@lifeplan.lat",
    to: email,
    subject: "Password Reset Request",
    html: htmlContent,
  });
};
