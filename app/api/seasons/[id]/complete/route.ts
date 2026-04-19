import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/seasons/[id]/complete
 * Complete a season - close it and generate all awards
 * Admin only
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

    // Get season
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        tournaments: true,
        teamStandings: { include: { team: true } },
        playerMvpRankings: { include: { player: true } },
      },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    if (season.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Season already completed' }, { status: 400 });
    }

    // Get top 3 teams by standing
    const topTeams = season.teamStandings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (a.rank || 999) - (b.rank || 999);
    }).slice(0, 3);

    // Get top player MVP
    const topPlayer = season.playerMvpRankings
      .sort((a, b) => (a.rank || 999) - (b.rank || 999))
      .slice(0, 1)[0];

    // Get best offender (most kills across all matches)
    const bestOffenderPerfs = await prisma.matchPerformance.findMany({
      where: {
        match: {
          tournament: { seasonId },
        },
      },
      orderBy: { kills: 'desc' },
      take: 1,
      include: { player: true },
    });

    // Get best defender (lowest deaths ratio with high assists)
    const allPerfs = await prisma.matchPerformance.findMany({
      where: {
        match: {
          tournament: { seasonId },
        },
      },
      include: { player: true },
    });

    const defenderStats = new Map<string, { player: typeof allPerfs[0]['player']; score: number }>();
    allPerfs.forEach(p => {
      if (!defenderStats.has(p.playerId)) {
        defenderStats.set(p.playerId, { player: p.player, score: 0 });
      }
      const deathsWeight = Math.max(1, p.deaths); // Avoid division by zero
      const score = (p.assists + 1) / deathsWeight; // Higher assists, lower deaths = higher score
      defenderStats.get(p.playerId)!.score += score;
    });

    const bestDefender = Array.from(defenderStats.values()).sort((a, b) => b.score - a.score)[0]?.player;

    // Create or update season awards
    const awards = await prisma.seasonAwards.upsert({
      where: { seasonId },
      create: {
        seasonId,
        championTeamId: topTeams[0]?.teamId,
        runnerUpTeamId: topTeams[1]?.teamId,
        thirdPlaceTeamId: topTeams[2]?.teamId,
        seasonMvpId: topPlayer?.playerId,
        bestOffenderId: bestOffenderPerfs[0]?.playerId,
        bestDefenderId: bestDefender?.id,
      },
      update: {
        championTeamId: topTeams[0]?.teamId,
        runnerUpTeamId: topTeams[1]?.teamId,
        thirdPlaceTeamId: topTeams[2]?.teamId,
        seasonMvpId: topPlayer?.playerId,
        bestOffenderId: bestOffenderPerfs[0]?.playerId,
        bestDefenderId: bestDefender?.id,
        updatedAt: new Date(),
      },
    });

    // Update season status
    const completedSeason = await prisma.season.update({
      where: { id: seasonId },
      data: { status: 'COMPLETED' },
    });

    // Create audit log
    await prisma.adminAuditLog.create({
      data: {
        actorId: session.user.id,
        action: 'COMPLETE_SEASON',
        targetType: 'Season',
        targetId: seasonId,
        details: JSON.stringify({
          champion: topTeams[0]?.team?.name,
          mvp: topPlayer?.player?.ign,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Season ${season.name} completed`,
        season: completedSeason,
        awards,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[SEASON COMPLETE POST ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/seasons/[id]/summary
 * Get season summary with all statistics
 * Public endpoint
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seasonId } = await params;

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        tournaments: { select: { id: true, name: true, status: true } },
        teamStandings: {
          include: { team: { select: { name: true, tag: true, logo: true } } },
          orderBy: [{ points: 'desc' }, { wins: 'desc' }, { rank: 'asc' }],
          take: 10,
        },
        playerMvpRankings: {
          include: { player: { select: { ign: true, photo: true, team: { select: { name: true } } } } },
          orderBy: { rank: 'asc' },
          take: 5,
        },
        seasonAwards: {
          include: {
            championTeam: true,
            runnerUpTeam: true,
            thirdPlaceTeam: true,
            seasonMvp: { include: { team: { select: { name: true, tag: true } } } },
          },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    const totalMatches = await prisma.match.count({
      where: {
        tournament: { seasonId },
      },
    });

    const completedMatches = await prisma.match.count({
      where: {
        tournament: { seasonId },
        status: 'COMPLETED',
      },
    });

    const summary = {
      id: season.id,
      name: season.name,
      status: season.status,
      dates: {
        start: season.startDate,
        end: season.endDate,
      },
      tournaments: season.tournaments,
      statistics: {
        totalTournaments: season.tournaments.length,
        totalMatches,
        completedMatches,
        matchCompletion: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
      },
      standings: season.teamStandings,
      topPlayers: season.playerMvpRankings,
      awards: season.seasonAwards,
    };

    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error('[SEASON SUMMARY GET ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
