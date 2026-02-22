import { prisma } from "@/lib/prisma";
import { MainRole } from "@/app/generated/prisma/enums";
import bcrypt from "bcryptjs";

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * @param password Plain text password
 * @param hash Hashed password
 * @returns True if password matches
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if a user exists by email or IGN
 * @param emailOrIgn Email or IGN to check
 * @returns User if found, null otherwise
 */
export async function findUserByEmailOrIgn(emailOrIgn: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrIgn }, { ign: emailOrIgn }],
    },
  });
}

/**
 * Create a new user account
 * @param data User registration data
 * @returns Created user (without password)
 */
export async function createUser(data: {
  email: string;
  password: string;
  ign: string;
  mainRole: string;
}) {
  const hashedPassword = await hashPassword(data.password);

  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      ign: data.ign,
      mainRole: data.mainRole as MainRole,
      emailVerified: false,
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
}

