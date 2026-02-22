import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { AdminRoleType } from "@/app/generated/prisma/enums";
import { NextResponse } from "next/server";

/**
 * Get the current authenticated user session
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Require admin role - throws error if not admin
 */
export async function requireAdmin(requiredRole?: AdminRoleType) {
  const user = await requireAuth();
  
  if (!user.role) {
    throw new Error("Forbidden: Admin access required");
  }

  // If specific role required, check it
  if (requiredRole && user.role !== requiredRole) {
    // SUPER_ADMIN can access anything
    if (user.role !== AdminRoleType.SUPER_ADMIN) {
      throw new Error(`Forbidden: ${requiredRole} access required`);
    }
  }

  return user;
}

/**
 * Require SUPER_ADMIN role
 */
export async function requireSuperAdmin() {
  return requireAdmin(AdminRoleType.SUPER_ADMIN);
}

/**
 * Check if user is active (not banned or suspended)
 */
export async function requireActiveUser() {
  const user = await requireAuth();
  
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { status: true, suspendedUntil: true },
  });

  if (!dbUser) {
    throw new Error("User not found");
  }

  if (dbUser.status === 'BANNED') {
    throw new Error("Account has been banned");
  }

  if (
    dbUser.status === 'SUSPENDED' &&
    dbUser.suspendedUntil &&
    dbUser.suspendedUntil > new Date()
  ) {
    throw new Error("Account is suspended");
  }

  return user;
}

/**
 * Create admin audit log entry
 */
export async function createAuditLog(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: string
) {
  return prisma.adminAuditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      details,
    },
  });
}

/**
 * Standard API error response
 */
export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard API success response
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate IGN (In-Game Name) - alphanumeric, spaces, underscores, 2-20 chars
 */
export function isValidIGN(ign: string): boolean {
  const ignRegex = /^[a-zA-Z0-9_ ]{2,20}$/;
  return ignRegex.test(ign);
}

/**
 * Validate team tag - 3-5 alphanumeric characters
 */
export function isValidTeamTag(tag: string): boolean {
  const tagRegex = /^[A-Z0-9]{3,5}$/;
  return tagRegex.test(tag.toUpperCase());
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

/**
 * Validate region
 */
export function isValidRegion(region: string): boolean {
  const validRegions = ["Accra", "Kumasi", "Takoradi", "Tema", "Cape Coast"];
  return validRegions.includes(region);
}
