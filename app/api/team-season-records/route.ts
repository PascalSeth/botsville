import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/team-season-records?seasonId=xxx&teamId=xxx
 * Get team's season-specific records
 * Public endpoint
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get('seasonId');
    const teamId = searchParams.get('teamId');

    const where: Record<string, string> = {};
    if (seasonId) where.seasonId = seasonId;
    if (teamId) where.teamId = teamId;

    if (Object.keys(where).length === 0) {
      return NextResponse.json({ error: 'seasonId or teamId required' }, { status: 400 });
    }

    const records = await prisma.teamSeasonRecord.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, tag: true, logo: true } },
        season: { select: { id: true, name: true } },
      },
      orderBy: [{ seasonId: 'desc' }, { rank: 'asc' }],
    });

    const formatted = records.map(r => ({
      id: r.id,
      teamId: r.teamId,
      teamName: r.team.name,
      seasonId: r.seasonId,
      seasonName: r.season.name,
      wins: r.wins,
      losses: r.losses,
      forfeits: r.forfeits,
      draws: r.draws,
      points: r.points,
      rank: r.rank,
      previousRank: r.previousRank,
      tier: r.tier,
      tournamentPlacements: r.tournamentPlaces ? JSON.parse(r.tournamentPlaces) : {},
      premiumPoints: r.premiumPoints,
      streak: r.streak,
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (err) {
    console.error('[TEAM SEASON RECORDS GET ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/team-season-records
 * Create or update team season record
 * Admin only
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const {
      teamId,
      seasonId,
      wins = 0,
      losses = 0,
      forfeits = 0,
      draws = 0,
      points = 0,
      rank,
      previousRank,
      tier = 'C',
      tournamentPlaces = {},
      premiumPoints = 0,
      streak,
    } = body;

    if (!teamId || !seasonId) {
      return NextResponse.json({ error: 'teamId and seasonId required' }, { status: 400 });
    }

    const record = await prisma.teamSeasonRecord.upsert({
      where: { teamId_seasonId: { teamId, seasonId } },
      create: {
        teamId,
        seasonId,
        wins,
        losses,
        forfeits,
        draws,
        points,
        rank,
        previousRank,
        tier,
        tournamentPlaces: JSON.stringify(tournamentPlaces),
        premiumPoints,
        streak,
      },
      update: {
        wins,
        losses,
        forfeits,
        draws,
        points,
        rank,
        previousRank,
        tier,
        tournamentPlaces: JSON.stringify(tournamentPlaces),
        premiumPoints,
        streak,
        updatedAt: new Date(),
      },
      include: {
        team: { select: { name: true } },
        season: { select: { name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Season record updated for ${record.team.name} in ${record.season.name}`,
        record,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[TEAM SEASON RECORDS POST ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
