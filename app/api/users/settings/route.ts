import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-config";
import { hashPassword, verifyPassword } from "@/lib/auth";

/**
 * PUT /api/users/settings
 * Update user account settings: IGN, email, password
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, currentPassword, newPassword, newValue } = body;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id, deletedAt: null },
      select: { id: true, email: true, ign: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle password change
    if (type === "password") {
      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "Current password and new password are required" },
          { status: 400 }
        );
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      // Validate new password
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }

      // Hash and update password
      const hashedPassword = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    // Handle IGN change
    if (type === "ign") {
      if (!newValue || newValue.trim().length === 0) {
        return NextResponse.json(
          { error: "IGN is required" },
          { status: 400 }
        );
      }

      const trimmedIgn = newValue.trim();

      // Check if IGN is already taken (in User model)
      const existingUser = await prisma.user.findFirst({
        where: {
          ign: trimmedIgn,
          id: { not: user.id },
          deletedAt: null,
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "This IGN is already taken" },
          { status: 400 }
        );
      }

      // Check if IGN is already taken (in Player model)
      const existingPlayer = await prisma.player.findFirst({
        where: {
          ign: trimmedIgn,
          userId: { not: user.id },
        },
      });

      if (existingPlayer) {
        return NextResponse.json(
          { error: "This IGN is already taken" },
          { status: 400 }
        );
      }

      // Get associated Player record to update in transaction
      const playerRecord = await prisma.player.findUnique({
        where: { userId: user.id },
      });

      // Log old IGN to history and update both User and Player (if exists)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateOps: any[] = [
        prisma.ignHistory.create({
          data: {
            userId: user.id,
            oldIgn: user.ign,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { ign: trimmedIgn },
        }),
      ];

      // Also update associated Player record if it exists
      if (playerRecord) {
        updateOps.push(
          prisma.player.update({
            where: { id: playerRecord.id },
            data: { ign: trimmedIgn },
          })
        );
      }

      await prisma.$transaction(updateOps);

      return NextResponse.json({
        success: true,
        message: "IGN updated successfully",
        newIgn: trimmedIgn,
      });
    }

    // Handle email change
    if (type === "email") {
      if (!newValue || newValue.trim().length === 0) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 }
        );
      }

      const trimmedEmail = newValue.trim().toLowerCase();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      // Check if email is already taken
      const existingUser = await prisma.user.findFirst({
        where: {
          email: trimmedEmail,
          id: { not: user.id },
          deletedAt: null,
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "This email is already taken" },
          { status: 400 }
        );
      }

      // Update email
      await prisma.user.update({
        where: { id: user.id },
        data: { email: trimmedEmail },
      });

      return NextResponse.json({
        success: true,
        message: "Email updated successfully",
        newEmail: trimmedEmail,
      });
    }

    return NextResponse.json(
      { error: "Invalid type. Must be 'password', 'ign', or 'email'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/settings
 * Get current user settings (email, ign, and IGN history)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id, deletedAt: null },
      select: {
        id: true,
        email: true,
        ign: true,
        createdAt: true,
        ignHistory: {
          orderBy: { changedAt: "desc" },
          take: 10,
          select: {
            oldIgn: true,
            changedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
