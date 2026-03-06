import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { AdminRoleType, NotificationType } from "@/app/generated/prisma/enums";
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
 * Notify all team members (captain + existing players) that someone joined.
 * Pass the joining player's userId to exclude them from receiving their own notification.
 */
export async function notifyTeamMemberJoined({
  teamId,
  joinerIgn,
  joinerUserId,
  role,
}: {
  teamId: string;
  joinerIgn: string;
  joinerUserId?: string | null;
  role: string;
}) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        name: true,
        captainId: true,
        players: {
          where: { deletedAt: null, userId: { not: null } },
          select: { userId: true },
        },
      },
    });
    if (!team) return;

    // Collect all userIds to notify: captain + players with accounts
    const recipientIds = new Set<string>();
    if (team.captainId) recipientIds.add(team.captainId);
    for (const p of team.players) {
      if (p.userId) recipientIds.add(p.userId);
    }
    // Don't notify the joiner themselves
    if (joinerUserId) recipientIds.delete(joinerUserId);

    if (recipientIds.size === 0) return;

    const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();
    // Use individual creates so the Prisma extension fires a socket event per user
    await Promise.all(
      Array.from(recipientIds).map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            type: NotificationType.PLAYER_JOINED,
            title: "New Teammate Joined!",
            message: `${joinerIgn} joined ${team.name} as ${roleLabel} Lane`,
            linkUrl: "/my-team",
          },
        })
      )
    );
  } catch (err) {
    // Notifications are non-critical — log but don't throw
    console.error("notifyTeamMemberJoined error:", err);
  }
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
 * Validate IGN (In-Game Name) - allows special characters, unicode, symbols
 * 2-20 characters, no control characters or newlines
 */
export function isValidIGN(ign: string): boolean {
  // Allow most printable characters including unicode, symbols, etc.
  // Only reject control characters, newlines, and extremely long names
  if (!ign || ign.length < 2 || ign.length > 20) return false;
  // Reject control characters and newlines
  if (/[\x00-\x1F\x7F\n\r\t]/.test(ign)) return false;
  // Reject if it's all whitespace
  if (ign.trim().length === 0) return false;
  return true;
}

/**
 * Validate team tag - 3-5 alphanumeric characters
 */
export function isValidTeamTag(tag: string): boolean {
  const tagRegex = /^[A-Z0-9]{3,5}$/;
  return tagRegex.test(tag.toUpperCase());
}

/**
 * Validate team join code - exactly 6 uppercase alphanumeric characters
 */
export function isValidTeamCode(teamCode: string): boolean {
  return /^[A-Z0-9]{6}$/.test(teamCode.toUpperCase());
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
  const validRegions = ["Accra", "Kumasi", "Takoradi", "Tema", "Cape Coast", "Tamale"];
  return validRegions.includes(region);
}
