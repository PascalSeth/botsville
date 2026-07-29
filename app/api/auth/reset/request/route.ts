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
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (!user) {
      // Do not reveal if user exists for security
      return NextResponse.json({ 
        success: true, 
        message: "If an account with that email exists, password reset instructions have been sent." 
      });
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
    let debugUrl: string | undefined;
    try {
      const result = await sendPasswordResetEmail(user.email, token);
      if (result && result.resetUrl) {
        debugUrl = result.resetUrl;
      }
    } catch (mailError) {
      console.error("Failed to send password reset email via SMTP:", mailError);
      const baseUrl = process.env.RESET_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
      debugUrl = `${baseUrl}/reset-password?token=${token}`;
    }

    return NextResponse.json({ 
      success: true, 
      message: "If an account with that email exists, password reset instructions have been sent.",
      ...(process.env.NODE_ENV !== "production" ? { debugUrl } : {})
    });
  } catch (error) {
    console.error("Error in password reset request:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
