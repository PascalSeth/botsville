import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/seasons/[id]/mvps
 * Get tournament MVPs for a season
 * Public endpoint
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seasonId } = await params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Get all tournaments in the season
    const tournaments = await prisma.tournament.findMany({
      where: { seasonId },
      select: { id: true },
    });

    const tournamentIds = tournaments.map((t) => t.id);

    // Fetch tournament MVPs for these tournaments
    const mvps = await prisma.tournamentMvp.findMany({
      where: {
        tournamentId: { in: tournamentIds },
      },
      include: {
        player: {
          select: {
            id: true,
            ign: true,
            photo: true,
            team: {
              select: { id: true, name: true, tag: true, logo: true },
            },
          },
        },
        tournament: {
          select: { id: true, name: true },
        },
      },
      orderBy: { mvpCount: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.tournamentMvp.count({
      where: {
        tournamentId: { in: tournamentIds },
      },
    });

    // Map to expected format
    const formatted = mvps.map((mvp, index) => ({
      id: mvp.id,
      playerId: mvp.player.id,
      playerIgn: mvp.player.ign,
      playerPhoto: mvp.player.photo,
      playerRole: 'Player', // Default role - can be enhanced if available in schema
      teamId: mvp.player.team?.id ?? '',
      teamName: mvp.player.team?.name ?? '',
      teamTag: mvp.player.team?.tag ?? '',
      teamLogo: mvp.player.team?.logo ?? null,
      mvpCount: mvp.mvpCount,
      totalKills: mvp.totalKills,
      totalAssists: mvp.totalAssists,
      totalDeaths: mvp.totalDeaths,
      winRate: mvp.winRate,
      ranking: index + 1 + offset,
    }));

    return NextResponse.json({ mvps: formatted, total }, { status: 200 });
  } catch (err) {
    console.error('[SEASON MVPS GET ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
