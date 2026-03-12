import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/mailer";

/**
 * POST /api/auth/reset/request
 * Request a password reset (send email with token)
 * Body: { email: string }
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase(), deletedAt: null } });
    if (!user) {
      // Do not reveal if user exists
      return NextResponse.json({ success: true });
    }
    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    // Store token and expiry on user
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expires },
    });
    // Send email with reset link
    await sendPasswordResetEmail(user.email, token);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in password reset request:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
