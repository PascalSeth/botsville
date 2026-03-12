import nodemailer from "nodemailer";

// Configure your SMTP transport here
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, token: string) {
  const baseUrl = process.env.RESET_URL || process.env.NEXTAUTH_URL || 'https://yourdomain.com';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@yourdomain.com',
    to,
    subject: "Password Reset Request",
    text: `You requested a password reset. Click the link below to reset your password:\n${resetUrl}\nIf you did not request this, please ignore this email.`,
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, please ignore this email.</p>`,
  });
  return info;
}
