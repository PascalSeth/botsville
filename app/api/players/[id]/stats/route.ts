import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // ── 1. Fetch player base data ──────────────────────────────────────────
    const player = await prisma.player.findUnique({
      where: { id },
      select: {
        id: true,
        ign: true,
        realName: true,
        role: true,
        secondaryRole: true,
        signatureHero: true,
        photo: true,
        kda: true,
        winRate: true,
        mvpCount: true,
        matchesPlayed: true,
        user: { select: { photo: true, rankBadge: true, region: true, headline: true } },
        team: { select: { id: true, name: true, tag: true, color: true, logo: true } },
        matchPerformances: {
          select: {
            id: true,
            hero: true,
            kills: true,
            deaths: true,
            assists: true,
            isMvp: true,
            maniacs: true,
            savages: true,
            won: true,
            gameNumber: true,
            matchId: true,
            match: {
              select: {
                scheduledTime: true,
                teamA: { select: { name: true, tag: true } },
                teamB: { select: { name: true, tag: true } },
              },
            },
          },
          orderBy: [{ match: { scheduledTime: 'desc' } }, { gameNumber: 'asc' }],
        },
      },
    });

    if (!player) return apiError('Player not found', 404);

    const perfs = player.matchPerformances;
    const totalGames = perfs.length;

    if (totalGames === 0) {
      return apiSuccess({
        player: {
          id: player.id,
          ign: player.ign,
          realName: player.realName,
          role: player.role,
          secondaryRole: player.secondaryRole,
          signatureHero: player.signatureHero,
          photo: player.photo ?? player.user?.photo ?? null,
          rankBadge: player.user?.rankBadge ?? null,
          region: player.user?.region ?? null,
          headline: player.user?.headline ?? null,
          team: player.team,
        },
        stats: null,
        heroBreakdown: [],
        recentGames: [],
        hasData: false,
      });
    }

    // ── 2. Aggregate totals ────────────────────────────────────────────────
    let totalKills = 0, totalDeaths = 0, totalAssists = 0;
    let totalManiacs = 0, totalSavages = 0, totalMvps = 0, totalWins = 0;
    let totalKdaSum = 0; // sum of per-game KDA (for kill pressure)

    for (const p of perfs) {
      totalKills += p.kills;
      totalDeaths += p.deaths;
      totalAssists += p.assists;
      totalManiacs += p.maniacs;
      totalSavages += p.savages;
      if (p.isMvp) totalMvps++;
      if (p.won) totalWins++;
      // Per-game KDA contribution
      totalKdaSum += (p.kills + p.assists) / Math.max(p.deaths, 1);
    }

    const overallKda = (totalKills + totalAssists) / Math.max(totalDeaths, 1);
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
    const avgKills = totalKills / totalGames;
    const avgDeaths = totalDeaths / totalGames;
    const avgAssists = totalAssists / totalGames;

    // Kill pressure = average per-game KDA expressed as a 0–100 pressure score
    // We normalise: avgKDA / 10 * 100, capped at 100
    const avgPerGameKda = totalKdaSum / totalGames;
    const killPressure = Math.min(Math.round((avgPerGameKda / 10) * 100), 100);

    // ── 3. Fetch Hero Catalog for images ──────────────────────────────────
    const heroCatalog = await prisma.heroCatalog.findMany({
      where: { active: true },
      select: { name: true, imageUrl: true },
    });

    const catalogMap: Record<string, string | null> = {};
    for (const item of heroCatalog) {
      catalogMap[item.name.toLowerCase().trim()] = item.imageUrl;
    }

    // ── 4. Hero breakdown ─────────────────────────────────────────────────
    const heroMap: Record<string, {
      hero: string; games: number; wins: number;
      kills: number; deaths: number; assists: number;
    }> = {};

    for (const p of perfs) {
      if (!heroMap[p.hero]) {
        heroMap[p.hero] = { hero: p.hero, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
      }
      heroMap[p.hero].games++;
      heroMap[p.hero].kills += p.kills;
      heroMap[p.hero].deaths += p.deaths;
      heroMap[p.hero].assists += p.assists;
      if (p.won) heroMap[p.hero].wins++;
    }

    const heroBreakdown = Object.values(heroMap)
      .map((h) => ({
        ...h,
        winRate: Math.round((h.wins / h.games) * 100),
        kda: parseFloat(((h.kills + h.assists) / Math.max(h.deaths, 1)).toFixed(2)),
        imageUrl: catalogMap[h.hero.toLowerCase().trim()] ?? null,
      }))
      .sort((a, b) => b.games - a.games);

    // ── 5. Recent games (last 10) ─────────────────────────────────────────
    const recentGames = perfs.slice(0, 10).map((p) => ({
      matchId: p.matchId,
      gameNumber: p.gameNumber,
      hero: p.hero,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      kda: parseFloat(((p.kills + p.assists) / Math.max(p.deaths, 1)).toFixed(2)),
      isMvp: p.isMvp,
      maniacs: p.maniacs,
      savages: p.savages,
      won: p.won,
      date: p.match.scheduledTime,
      vsTeam: p.match.teamA?.name === player.team?.name
        ? p.match.teamB?.tag
        : p.match.teamA?.tag,
      imageUrl: catalogMap[p.hero.toLowerCase().trim()] ?? null,
    }));

    return apiSuccess({
      player: {
        id: player.id,
        ign: player.ign,
        realName: player.realName,
        role: player.role,
        secondaryRole: player.secondaryRole,
        signatureHero: player.signatureHero,
        photo: player.photo ?? player.user?.photo ?? null,
        rankBadge: player.user?.rankBadge ?? null,
        region: player.user?.region ?? null,
        headline: player.user?.headline ?? null,
        team: player.team,
      },
      stats: {
        totalGames,
        totalWins,
        winRate: parseFloat(winRate.toFixed(1)),
        overallKda: parseFloat(overallKda.toFixed(2)),
        killPressure,
        avgKills: parseFloat(avgKills.toFixed(1)),
        avgDeaths: parseFloat(avgDeaths.toFixed(1)),
        avgAssists: parseFloat(avgAssists.toFixed(1)),
        totalKills,
        totalDeaths,
        totalAssists,
        mvpCount: totalMvps,
        maniacs: totalManiacs,
        savages: totalSavages,
      },
      heroBreakdown,
      recentGames,
      hasData: true,
    });
  } catch (error: unknown) {
    console.error('Player stats error:', error);
    return apiError(error instanceof Error ? error.message : 'Failed to fetch player stats', 500);
  }
}
