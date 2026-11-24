import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MatchStatus, BracketType } from "@/app/generated/prisma/enums";
import { requireAdmin, apiError } from '@/lib/api-utils';
import { invalidatePattern } from '@/lib/redis';
import { buildSingleEliminationBracket } from '@/lib/tournament-engine/single-elim';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin('TOURNAMENT_ADMIN');
    const { id: tournamentId } = await params;
    const body = await req.json().catch(() => ({}));

    // 1. Fetch Tournament Settings
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        stages: { orderBy: { order: 'asc' } },
        groupStandings: {
          include: { team: true }
        }
      }
    });

    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (tournament.deletedAt || ['COMPLETED', 'CANCELLED'].includes(tournament.status)) return apiError('This tournament cannot advance to playoffs.');
    if (!['GROUP_STAGE', 'ROUND_ROBIN'].includes(tournament.format)) return apiError('Only a group competition can advance through this action.');
    const teamsPerGroup = body.teamsPerGroup ?? tournament.stages.find(stage => stage.stageType === 'GROUP_STAGE')?.teamsAdvancingPerGroup ?? 2;
    if (!Number.isInteger(teamsPerGroup) || teamsPerGroup < 1 || teamsPerGroup > 32) return apiError('Choose 1–32 qualifiers per group.');
    const groupSizes = new Map<string, number>();
    for (const standing of tournament.groupStandings) groupSizes.set(standing.groupName, (groupSizes.get(standing.groupName) ?? 0) + 1);
    if (!groupSizes.size || [...groupSizes.values()].some(size => size < teamsPerGroup)) return apiError('Every group must have enough teams for the selected qualifier count.');
    const groupFixtures = await prisma.match.findMany({ where: { tournamentId, teamBId: { not: null }, status: { notIn: ['RESTING', 'CANCELLED'] }, OR: [{ bracketType: 'GROUP_STAGE' }, { bracketType: null }] }, select: { status: true, statsFinalized: true } });
    if (!groupFixtures.length || groupFixtures.some(match => match.status !== 'FORFEITED' && (match.status !== 'COMPLETED' || !match.statsFinalized))) return apiError('Finish and finalise every group result before generating playoffs.');
    if (await prisma.match.count({ where: { tournamentId, bracketType: { in: ['WINNER_BRACKET', 'LOSER_BRACKET', 'GRAND_FINAL'] } } })) return apiError('Playoff fixtures already exist. Use match management to continue.', 409);

    // 2. Fetch H2H Map
    const h2hMap: Record<string, Record<string, number>> = {};
    if (tournament.tiebreakerSequence.includes("H2H")) {
      const h2hs = await prisma.headToHead.findMany({
        where: { seasonId: tournament.seasonId }
      });
      for (const h of h2hs) {
        h2hMap[h.teamAId] ??= {};
        h2hMap[h.teamBId] ??= {};
        h2hMap[h.teamAId][h.teamBId] = h.teamAWins;
        h2hMap[h.teamBId][h.teamAId] = h.teamBWins;
      }
    }

    // Tiebreaker sorting function
    const sortStandings = (standings: typeof tournament.groupStandings) => {
      return [...standings].sort((a, b) => {
        if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
        for (const tb of tournament.tiebreakerSequence) {
          if (tb === "H2H") {
            const aWinsVsB = h2hMap[a.teamId]?.[b.teamId] ?? 0;
            const bWinsVsA = h2hMap[b.teamId]?.[a.teamId] ?? 0;
            if (aWinsVsB !== bWinsVsA) return bWinsVsA - aWinsVsB;
          } else if (tb === "GD") {
            const gdA = a.gameWins - a.gameLosses;
            const gdB = b.gameWins - b.gameLosses;
            if (gdA !== gdB) return gdB - gdA;
          } else if (tb === "TIME") {
            const timeA = a.fastestWinSeconds ?? Infinity;
            const timeB = b.fastestWinSeconds ?? Infinity;
            if (timeA !== timeB) return timeA - timeB;
          }
        }
        if (b.wins !== a.wins) return b.wins - a.wins;
        return 0;
      });
    };

    let matchups: Array<{ seed1: any, seed2: any }> = [];

    if (body.manualMatchups && Array.isArray(body.manualMatchups)) {
      const ids = body.manualMatchups.flatMap((match: { team1Id?: string; team2Id?: string }) => [match.team1Id, match.team2Id].filter(Boolean));
      const eligible = new Set(tournament.groupStandings.map(standing => standing.teamId));
      if (ids.length < 2 || new Set(ids).size !== ids.length || ids.some((teamId: string) => !eligible.has(teamId)) || body.manualMatchups.some((match: { team1Id?: string; team2Id?: string }) => !match.team1Id && !match.team2Id)) return apiError('Playoff teams must be unique teams from these groups.');
      matchups = body.manualMatchups.map((m: any, i: number) => ({
        seed1: { seedPosition: i * 2 + 1, teamId: m.team1Id, teamName: m.team1Name || "Team A", teamTag: m.team1Name || "Team A" },
        seed2: m.team2Id ? { seedPosition: i * 2 + 2, teamId: m.team2Id, teamName: m.team2Name || "Team B", teamTag: m.team2Name || "Team B" } : { seedPosition: i * 2 + 2, teamId: "", teamName: "BYE", teamTag: "BYE" }
      }));
    } else {
      // 3. Extract top teams per group and group them by rank (1st places, 2nd places, etc.)
    const rankedTeams: Record<number, typeof tournament.groupStandings> = {};
    for (let i = 0; i < teamsPerGroup; i++) {
      rankedTeams[i] = [];
    }

    const groups: Record<string, typeof tournament.groupStandings> = {};
    for (const gs of tournament.groupStandings) {
      const gName = gs.groupName || "Ungrouped";
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(gs);
    }

    let totalAdvancing = 0;
    for (const gName in groups) {
      const sortedGroup = sortStandings(groups[gName]);
      const advanced = sortedGroup.slice(0, teamsPerGroup);
      for (let i = 0; i < advanced.length; i++) {
        rankedTeams[i].push(advanced[i]);
        totalAdvancing++;
      }
    }

    if (totalAdvancing < 2) {
      return NextResponse.json({ 
        error: `Insufficient teams for Playoffs. Needed at least 2, found ${totalAdvancing}.` 
      }, { status: 400 });
    }

    // Standard seeded pairs give byes to top seeds and never pair two empty slots.
    const seeds = Array.from({ length: teamsPerGroup }, (_, index) => sortStandings(rankedTeams[index])).flat();
    const firstRound = buildSingleEliminationBracket(seeds.map(seed => seed.teamId)).rounds[0];
    const seedData = (teamId: string | null) => {
      const index = seeds.findIndex(seed => seed.teamId === teamId);
      const team = seeds[index]?.team;
      return { teamId: teamId || '', teamName: team?.name || 'BYE', teamTag: team?.tag || team?.name || 'BYE', seedPosition: index + 1 };
    };
    matchups = firstRound.map(match => ({ seed1: seedData(match.teamAId), seed2: seedData(match.teamBId) }));
    } // End of else block

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(tournament.date.getUTCHours(), tournament.date.getUTCMinutes(), 0, 0);

    // Find max playDay from existing group stage matches so playoffs continue sequentially
    const lastGroupMatch = await prisma.match.findFirst({
      where: { tournamentId, bracketType: BracketType.GROUP_STAGE },
      orderBy: { playDay: "desc" }
    });
    const basePlayDay = (lastGroupMatch?.playDay ?? 0) + 1;
    if (lastGroupMatch && tomorrow <= lastGroupMatch.scheduledTime) {
      tomorrow.setTime(lastGroupMatch.scheduledTime.getTime());
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(tournament.date.getUTCHours(), tournament.date.getUTCMinutes(), 0, 0);
    }
    const playDays = tournament.playDaysPerWeek.length ? tournament.playDaysPerWeek : [0, 1, 2, 3, 4, 5, 6];
    const dailyLimit = Math.max(1, Math.min(tournament.matchesPerDay ?? 4, 48));
    const dailyStartMinute = tomorrow.getUTCHours() * 60 + tomorrow.getUTCMinutes();
    let scheduleMinute = dailyStartMinute;
    let scheduledToday = 0;
    let playoffDay = basePlayDay;

    const createdMatches: any[] = [];
    let totalMatches = 0;

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tournaments WHERE id = ${tournamentId} FOR UPDATE`;
      if (await tx.match.count({ where: { tournamentId, bracketType: { in: ['WINNER_BRACKET', 'LOSER_BRACKET', 'GRAND_FINAL'] } } })) throw new Error('Playoff fixtures already exist. Reload the tournament.');

      // Create Round 1
      for (let i = 0; i < matchups.length; i++) {
        const m = matchups[i];
        const hasBye = !m.seed1.teamId || !m.seed2.teamId;
        const realTeam = m.seed1.teamId ? m.seed1 : m.seed2;
        const otherTeam = m.seed1.teamId ? m.seed2 : m.seed1;
        if (!hasBye && (scheduledToday >= dailyLimit || scheduleMinute >= 1440)) {
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
          tomorrow.setUTCHours(tournament.date.getUTCHours(), tournament.date.getUTCMinutes(), 0, 0);
          scheduledToday = 0; scheduleMinute = dailyStartMinute; playoffDay++;
        }
        while (!playDays.includes(tomorrow.getUTCDay())) tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        const scheduledTime = new Date(tomorrow);
        scheduledTime.setUTCHours(0, hasBye ? dailyStartMinute : scheduleMinute, 0, 0);

        const match = await tx.match.create({
          data: {
            tournamentId,
            teamAId: realTeam.teamId,
            teamBId: hasBye ? null : otherTeam.teamId,
            status: hasBye ? MatchStatus.COMPLETED : MatchStatus.UPCOMING,
            winnerId: hasBye ? realTeam.teamId : null,
            scoreA: hasBye ? Math.ceil(tournament.defaultBestOf / 2) : 0,
            statsFinalized: hasBye,
            bracketType: matchups.length === 1 ? BracketType.GRAND_FINAL : BracketType.WINNER_BRACKET,
            stage: hasBye ? `Round 1 (Bye)` : `Round 1: #${m.seed1.seedPosition} vs #${m.seed2.seedPosition}`,
            bracketPosition: i + 1,
            round: 0,
            playDay: playoffDay,
            scheduledTime,
            bestOf: tournament.defaultBestOf,
          }
        });
        createdMatches.push(match);
        if (!hasBye) { scheduledToday++; scheduleMinute += 120; }
      }

      totalMatches += createdMatches.length;

      // Only generate Round 1. Progressive rounds (like Grand Finals) should not be created
      // with placeholder teams until the winners are actually determined.
      
      // Update tournament phase
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { phase: matchups.length === 1 ? 'GRAND_FINALS' : 'PLAYOFFS' }
      });
      await tx.tournamentStage.updateMany({ where: { tournamentId, stageType: 'GROUP_STAGE' }, data: { status: 'COMPLETED', teamsAdvancingPerGroup: teamsPerGroup } });
    });
    await invalidatePattern(`tournament:matches:${tournamentId}:*`);

    return NextResponse.json({
      success: true,
      message: `Created playoff round one: ${totalMatches} fixtures including byes. Generate subsequent rounds from match management.`,
      matches: createdMatches.length
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate playoffs.';
    if (message === 'Unauthorized') return apiError(message, 401);
    if (message.includes('Forbidden')) return apiError(message, 403);
    if (message.includes('already exist')) return apiError(message, 409);
    console.error("Advance to Playoffs Error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to advance tournament" 
    }, { status: 500 });
  }
}
