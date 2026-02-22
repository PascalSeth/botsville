import { NextRequest } from "next/server";
import { hashPassword, findUserByEmailOrIgn } from "@/lib/auth";
import { apiError, apiSuccess, isValidEmail, isValidIGN } from "@/lib/api-utils";
import { MainRole } from "@/app/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, ign, mainRole } = body;

    // Validation
    if (!email || !password || !ign || !mainRole) {
      return apiError("Email, password, IGN, and main role are required");
    }

    if (!isValidEmail(email)) {
      return apiError("Invalid email format");
    }

    if (!isValidIGN(ign)) {
      return apiError("IGN must be 3-20 characters (alphanumeric, spaces, underscores only)");
    }

    if (password.length < 8) {
      return apiError("Password must be at least 8 characters");
    }

    if (!Object.values(MainRole).includes(mainRole)) {
      return apiError("Invalid main role");
    }

    // Check if email or IGN already exists
    const existingUser = await findUserByEmailOrIgn(email);
    if (existingUser) {
      return apiError("Email already registered");
    }

    const existingIGN = await findUserByEmailOrIgn(ign);
    if (existingIGN) {
      return apiError("IGN already taken");
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        ign,
        mainRole: mainRole as MainRole,
        emailVerified: false,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        ign: true,
        mainRole: true,
        photo: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return apiSuccess(
      {
        message: "Account created successfully",
        user,
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create account";
    console.error("Registration error:", error);
    return apiError(message, 500);
  }
}



