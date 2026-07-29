import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(to: string, token: string) {
  const baseUrl = process.env.RESET_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  // Log link to terminal console for easy testing/debugging
  console.log(`\n==================================================`);
  console.log(`[PASSWORD RESET LINK FOR ${to}]:`);
  console.log(resetUrl);
  console.log(`==================================================\n`);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn("SMTP credentials not configured in .env file. Email notification skipped, but reset link was logged above.");
    return { skipped: true, resetUrl };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@botsville.com',
    to,
    subject: "Botsville - Password Reset Request",
    text: `You requested a password reset. Click the link below to reset your password:\n${resetUrl}\nIf you did not request this, please ignore this email.`,
    html: `<p>You requested a password reset for your Botsville account.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>If you did not request this, please ignore this email.</p>`,
  });

  return { info, resetUrl };
}
