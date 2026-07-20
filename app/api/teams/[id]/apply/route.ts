import { NextRequest } from "next/server";
import { requireActiveUser, apiError, apiSuccess, formatHumanError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// POST - Player applies to join a team
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { role, signatureHero, pitch } = body;

    // Auto-expire any outdated pending invites/applications for this user on this team
    await prisma.teamInvite.updateMany({
      where: {
        teamId: id,
        fromUserId: user.id,
        status: "PENDING",
        expiresAt: { lte: new Date() },
      },
      data: { status: "DECLINED" },
    });

    // Query database in parallel for all checks
    const [team, existingPlayer, duplicatePending, captainInvite] = await Promise.all([
      prisma.team.findUnique({ where: { id } }),
      prisma.player.findFirst({
        where: { userId: user.id },
        include: { team: { select: { id: true, name: true, deletedAt: true } } },
      }),
      prisma.teamInvite.findFirst({
        where: {
          teamId: id,
          fromUserId: user.id,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.teamInvite.findFirst({
        where: {
          teamId: id,
          toUserId: user.id,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    if (!team || team.deletedAt) {
      return apiError("This team is no longer active or has been disbanded.", 404);
    }

    // Auto-cleanup: if player points to a disbanded team, delete the orphaned record
    if (existingPlayer) {
      if (!existingPlayer.deletedAt && existingPlayer.team?.deletedAt) {
        await prisma.player.delete({ where: { id: existingPlayer.id } });
      } else if (!existingPlayer.deletedAt) {
        return apiError(`You are currently on squad "${existingPlayer.team?.name || 'another team'}". You must leave your current squad before applying to a new team.`);
      }
    }

    // If an application is currently pending captain response
    if (duplicatePending) {
      return apiError("Your application to this team is currently pending review by the captain. Please allow them time to respond.");
    }

    if (captainInvite) {
      return apiError("This team has already sent you an invite! Check your invites to accept.");
    }

    // Clean up any old DECLINED or non-pending invites with matching (teamId, toIGN)
    // so Prisma unique constraint @@unique([teamId, toIGN, status]) won't conflict
    await prisma.teamInvite.deleteMany({
      where: {
        teamId: id,
        toIGN: { equals: user.ign, mode: "insensitive" },
        status: "PENDING",
      },
    });

    // Format application message with role/pitch details if provided
    let appMessage = pitch ? pitch.trim() : null;
    if (role || signatureHero) {
      const details = [
        role ? `🎯 Preferred Role: ${role}` : null,
        signatureHero ? `⚡ Signature Hero: ${signatureHero}` : null,
        pitch ? `💬 "${pitch.trim()}"` : null,
      ].filter(Boolean).join(" · ");
      appMessage = details;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const invite = await prisma.teamInvite.create({
      data: {
        teamId: id,
        fromUserId: user.id,
        toIGN: user.ign,
        toUserId: team.captainId || null,
        message: appMessage,
        expiresAt,
        status: "PENDING",
      },
      include: {
        team: { select: { id: true, name: true, tag: true } },
      },
    });


    // Notify captain
    if (team.captainId) {
      await prisma.notification.create({
        data: {
          userId: team.captainId,
          type: "TEAM_INVITE_RECEIVED",
          title: `New Roster Application: ${user.ign}`,
          message: `${user.ign} applied to join ${invite.team.name}${role ? ` as ${role}` : ''}`,
          linkUrl: `/my-team`,
        },
      });
    }

    return apiSuccess({ message: "Application submitted to team captain!", invite }, 201);
  } catch (error: unknown) {
    const formatted = formatHumanError(error);
    console.error("Apply to team error:", error);
    return apiError(formatted, 500);
  }
}

