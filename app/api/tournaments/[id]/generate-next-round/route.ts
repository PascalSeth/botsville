import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MatchStatus, BracketType } from "@/app/generated/prisma/enums";
import { requireAdmin, apiError } from '@/lib/api-utils';
import { invalidatePattern } from '@/lib/redis';

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
      where: { id: tournamentId }
    });

    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    if (tournament.deletedAt || ['COMPLETED', 'CANCELLED'].includes(tournament.status)) return apiError('This tournament cannot generate another round.');

    // 2. Find all playoff matches (bracketType OR stage-based fallback)
    const allTournamentMatches = await prisma.match.findMany({
      where: { tournamentId },
      orderBy: [
        { round: "desc" },
        { bracketPosition: "asc" }
      ]
    });

    const currentMatches = allTournamentMatches.filter(m =>
      m.bracketType === BracketType.WINNER_BRACKET ||
      m.bracketType === BracketType.GRAND_FINAL ||
      (
        m.bracketType === null &&
        m.stage != null &&
        !m.stage.toLowerCase().includes('group')
      )
    );

    if (currentMatches.length === 0) {
      return NextResponse.json({ error: "No playoff matches found." }, { status: 400 });
    }

    const currentRoundNum = currentMatches[0].round;
    if (currentRoundNum === null || currentRoundNum === undefined) {
      return NextResponse.json({ error: "Playoff matches have no round assigned." }, { status: 400 });
    }
    const matchesInRound = currentMatches.filter(m => m.round === currentRoundNum);

    // 3. Ensure all are completed
    const uncompleted = matchesInRound.filter(m => !m.winnerId || (m.status !== MatchStatus.COMPLETED && m.status !== MatchStatus.FORFEITED) || (m.status === MatchStatus.COMPLETED && m.teamBId && !m.statsFinalized));
    if (uncompleted.length > 0) {
      return NextResponse.json({ 
        error: `Please complete all matches in Round ${currentRoundNum + 1} before generating the next round.` 
      }, { status: 400 });
    }

    if (matchesInRound.length === 1) {
      return NextResponse.json({ error: "The Grand Final has already been generated." }, { status: 400 });
    }

    // 4. Generate Matchups
    let matchups: Array<{ seed1: any, seed2: any }> = [];

    if (body.manualMatchups && Array.isArray(body.manualMatchups)) {
      const winners = new Set(matchesInRound.map(match => match.winnerId));
      const selectedIds = body.manualMatchups.flatMap((match: { team1Id?: string; team2Id?: string }) => [match.team1Id, match.team2Id].filter(Boolean));
      if (selectedIds.length !== winners.size || new Set(selectedIds).size !== selectedIds.length || selectedIds.some((teamId: string) => !winners.has(teamId)) || body.manualMatchups.some((match: { team1Id?: string; team2Id?: string }) => !match.team1Id && !match.team2Id)) return apiError('Include every winner exactly once in the next round.');
      // Manual Matchups
      matchups = body.manualMatchups.map((m: any, i: number) => ({
        seed1: { teamId: m.team1Id, teamName: m.team1Name || "Team A" },
        seed2: m.team2Id ? { teamId: m.team2Id, teamName: m.team2Name || "Team B" } : { teamId: "", teamName: "BYE" }
      }));
    } else {
      // Auto Matchups (Sequential: Winner 1 vs Winner 2)
      for (let i = 0; i < matchesInRound.length; i += 2) {
        const m1 = matchesInRound[i];
        const m2 = matchesInRound[i + 1];

        matchups.push({
          seed1: { teamId: m1.winnerId, teamName: "Winner" },
          seed2: m2 && m2.winnerId ? { teamId: m2.winnerId, teamName: "Winner" } : { teamId: "", teamName: "BYE" }
        });
      }
    }

    // 5. Create matches
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(tournament.date.getUTCHours(), tournament.date.getUTCMinutes(), 0, 0);

    // Assign the next playDay by finding the max existing playoff playDay
    const lastPlayoffMatch = await prisma.match.findFirst({
      where: { tournamentId, bracketType: { in: [BracketType.WINNER_BRACKET, BracketType.GRAND_FINAL] } },
      orderBy: { playDay: "desc" }
    });
    const nextPlayDay = (lastPlayoffMatch?.playDay ?? 0) + 1;

    const nextRoundNum = currentRoundNum + 1;
    const isGrandFinal = matchups.length === 1;
    const stageName = isGrandFinal ? "Grand Finals" : `Round ${nextRoundNum + 1}`;
    const bType = isGrandFinal ? BracketType.GRAND_FINAL : BracketType.WINNER_BRACKET;
    const bestOf = tournament.defaultBestOf;

    const createdMatches: any[] = [];

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tournaments WHERE id = ${tournamentId} FOR UPDATE`;
      if (await tx.match.count({ where: { tournamentId, round: nextRoundNum, bracketType: { in: ['WINNER_BRACKET', 'GRAND_FINAL'] } } })) throw new Error('This round already exists. Reload match management.');
      for (let i = 0; i < matchups.length; i++) {
        const m = matchups[i];
        const hasBye = !m.seed1.teamId || !m.seed2.teamId;
        const realTeam = m.seed1.teamId ? m.seed1 : m.seed2;
        const otherTeam = m.seed1.teamId ? m.seed2 : m.seed1;

        const match = await tx.match.create({
          data: {
            tournamentId,
            teamAId: realTeam.teamId,
            teamBId: hasBye ? null : otherTeam.teamId,
            status: hasBye ? MatchStatus.COMPLETED : MatchStatus.UPCOMING,
            winnerId: hasBye ? realTeam.teamId : null,
            scoreA: hasBye ? Math.ceil(bestOf / 2) : 0,
            statsFinalized: hasBye,
            bracketType: bType,
            stage: hasBye ? `${stageName} (Bye)` : stageName,
            bracketPosition: i + 1,
            round: nextRoundNum,
            playDay: nextPlayDay,
            scheduledTime: new Date(tomorrow.getTime() + (i * 2 * 60 * 60 * 1000)),
            bestOf: bestOf,
          }
        });
        createdMatches.push(match);

        // Update previous matches with nextMatchId
        if (!body.manualMatchups) {
          const m1 = matchesInRound[i * 2];
          const m2 = matchesInRound[i * 2 + 1];
          if (m1) await tx.match.update({ where: { id: m1.id }, data: { nextMatchId: match.id } });
          if (m2) await tx.match.update({ where: { id: m2.id }, data: { nextMatchId: match.id } });
        } else {
          // In manual mode, we have to find which previous match had this team and update it.
          const prev1 = matchesInRound.find(m => m.winnerId === realTeam.teamId);
          if (prev1) await tx.match.update({ where: { id: prev1.id }, data: { nextMatchId: match.id } });
          
          if (!hasBye && otherTeam.teamId) {
            const prev2 = matchesInRound.find(m => m.winnerId === otherTeam.teamId);
            if (prev2) await tx.match.update({ where: { id: prev2.id }, data: { nextMatchId: match.id } });
          }
        }
      }

      // Update tournament phase
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { phase: isGrandFinal ? "GRAND_FINALS" : "PLAYOFFS" }
      });
    });

    await invalidatePattern(`tournament:matches:${tournamentId}:*`);
    return NextResponse.json({
      success: true,
      message: `Successfully generated ${stageName}.`,
      matches: createdMatches.length
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate the next round.';
    if (message === 'Unauthorized') return apiError(message, 401);
    if (message.includes('Forbidden')) return apiError(message, 403);
    if (message.includes('already exists')) return apiError(message, 409);
    console.error("Generate Next Round Error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to generate next round" 
    }, { status: 500 });
  }
}
