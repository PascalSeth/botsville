import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-config";

/**
 * GET /api/users/check-availability?type=ign|email&value=...
 * Check if IGN or email is already taken (excludes current user)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const value = searchParams.get("value");

    if (!type || !value) {
      return NextResponse.json(
        { error: "Missing type or value parameter" },
        { status: 400 }
      );
    }

    if (type !== "ign" && type !== "email") {
      return NextResponse.json(
        { error: "Type must be 'ign' or 'email'" },
        { status: 400 }
      );
    }

    // Check if value is taken by another user (excluding current user)
    const existingUser = await prisma.user.findFirst({
      where: {
        [type]: type === "email" ? value.toLowerCase() : value,
        id: { not: session.user.id },
        deletedAt: null,
      },
      select: { id: true },
    });

    return NextResponse.json({
      available: !existingUser,
      type,
      value,
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
