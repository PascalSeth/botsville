import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/seasons/[id]/awards
 * Get season awards (champion, MVP, etc.)
 * Public endpoint
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seasonId } = await params;

    const awards = await prisma.seasonAwards.findUnique({
      where: { seasonId },
      include: {
        season: { select: { id: true, name: true } },
        championTeam: { select: { id: true, name: true, tag: true, logo: true } },
        runnerUpTeam: { select: { id: true, name: true, tag: true, logo: true } },
        thirdPlaceTeam: { select: { id: true, name: true, tag: true, logo: true } },
        seasonMvp: {
          select: {
            id: true,
            ign: true,
            photo: true,
            role: true,
            team: { select: { id: true, name: true, tag: true, logo: true } },
          },
        },
        bestOffender: {
          select: {
            id: true,
            ign: true,
            photo: true,
            role: true,
            team: { select: { id: true, name: true, tag: true, logo: true } },
          },
        },
        bestDefender: {
          select: {
            id: true,
            ign: true,
            photo: true,
            role: true,
            team: { select: { id: true, name: true, tag: true, logo: true } },
          },
        },
      },
    });

    if (!awards) {
      return NextResponse.json({ error: 'Season awards not found' }, { status: 404 });
    }

    const formatted = {
      seasonId: awards.season.id,
      seasonName: awards.season.name,
      championTeam: awards.championTeam,
      runnerUpTeam: awards.runnerUpTeam,
      thirdPlaceTeam: awards.thirdPlaceTeam,
      seasonMvp: awards.seasonMvp,
      bestOffender: awards.bestOffender,
      bestDefender: awards.bestDefender,
      awardedAt: awards.awardedAt.toISOString(),
    };

    return NextResponse.json(formatted, { status: 200 });
  } catch (err) {
    console.error('[SEASON AWARDS GET ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/seasons/[id]/awards
 * Set season awards - Admin only
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const adminRole = await prisma.adminRole.findUnique({
      where: { userId: session.user.id },
    });
    if (!adminRole || (adminRole.role !== 'TOURNAMENT_ADMIN' && adminRole.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id: seasonId } = await params;
    const body = await req.json();
    const { championTeamId, runnerUpTeamId, thirdPlaceTeamId, seasonMvpId, bestOffenderId, bestDefenderId } = body;

    // Verify season exists
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });
    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    // Verify all references exist if provided
    const verifications: Array<Promise<unknown>> = [];
    if (championTeamId) verifications.push(prisma.team.findUnique({ where: { id: championTeamId } }) as Promise<unknown>);
    if (runnerUpTeamId) verifications.push(prisma.team.findUnique({ where: { id: runnerUpTeamId } }) as Promise<unknown>);
    if (thirdPlaceTeamId) verifications.push(prisma.team.findUnique({ where: { id: thirdPlaceTeamId } }) as Promise<unknown>);
    if (seasonMvpId) verifications.push(prisma.player.findUnique({ where: { id: seasonMvpId } }) as Promise<unknown>);
    if (bestOffenderId) verifications.push(prisma.player.findUnique({ where: { id: bestOffenderId } }) as Promise<unknown>);
    if (bestDefenderId) verifications.push(prisma.player.findUnique({ where: { id: bestDefenderId } }) as Promise<unknown>);

    const results = await Promise.all(verifications);
    if (results.some((r: unknown) => !r)) {
      return NextResponse.json({ error: 'Invalid team or player ID' }, { status: 400 });
    }

    // Create or update awards
    const awards = await prisma.seasonAwards.upsert({
      where: { seasonId },
      create: {
        seasonId,
        championTeamId,
        runnerUpTeamId,
        thirdPlaceTeamId,
        seasonMvpId,
        bestOffenderId,
        bestDefenderId,
      },
      update: {
        championTeamId,
        runnerUpTeamId,
        thirdPlaceTeamId,
        seasonMvpId,
        bestOffenderId,
        bestDefenderId,
        updatedAt: new Date(),
      },
      include: {
        season: { select: { name: true } },
        championTeam: { select: { name: true, tag: true } },
        seasonMvp: { select: { ign: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Awards set for ${awards.season.name}`,
        awards,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[SEASON AWARDS POST ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
