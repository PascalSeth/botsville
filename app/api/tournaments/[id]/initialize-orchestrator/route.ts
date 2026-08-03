import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Lobby, BracketType, MatchStatus } from "@/app/generated/prisma/client";

/**
 * Selection V2 Orchestrator API
 * Generates a full Round Robin roadmap (55 matches for 11 teams)
 * Handles Lobby A/B dispatching and Day-by-Day scheduling.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await req.json().catch(() => ({}));
    let { startDate, playDays, matchesPerDay, bestOf, numGroups, pointSystem } = body;

    // 1. Fetch Tournament Config & Approved Registrations
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { groups: { include: { teams: true } } }
    });

    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    // Dynamic fallbacks using existing tournament record or defaults
    if (!startDate) startDate = tournament.date;
    if (!playDays || !Array.isArray(playDays) || playDays.length === 0) {
      playDays = tournament.playDaysPerWeek && tournament.playDaysPerWeek.length > 0
        ? tournament.playDaysPerWeek
        : [5, 6, 0, 2, 4]; // Default: Fri, Sat, Sun, Tue, Thu
    }
    if (!matchesPerDay || typeof matchesPerDay !== "number") {
      matchesPerDay = tournament.matchesPerDay || 4;
    }
    const seriesBestOf = typeof bestOf === "number" ? bestOf : (tournament.defaultBestOf || 3);

    if (!startDate) {
      return NextResponse.json({ error: "Tournament has no start date defined." }, { status: 400 });
    }

    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId, status: "APPROVED" },
      include: { team: true },
    });

    const approvedTeams = registrations.map(r => r.team);
    if (approvedTeams.length < 2) {
      return NextResponse.json({ error: "At least 2 teams required to orchestrate." }, { status: 400 });
    }

    // Safety constraint: Prevent orchestrating if there are already completed matches
    const existingCompleted = await prisma.match.count({
      where: {
        tournamentId,
        status: { in: ["COMPLETED", "FORFEITED"] }
      }
    });

    if (existingCompleted > 0) {
      return NextResponse.json(
        { error: "This tournament already has completed matches. Orchestrating it again would delete existing matches and result stats. If you want to fix standings, go to the Matches tab and use 'Recalc Group Standings' instead." },
        { status: 400 }
      );
    }

    const { previewOnly = false, customGroupings } = body;
    let targetNumGroups = 1;
    if (typeof numGroups === "number" && numGroups >= 1) {
      targetNumGroups = numGroups;
    } else if (tournament.teamsPerGroup && tournament.teamsPerGroup >= 2 && approvedTeams.length > tournament.teamsPerGroup) {
      targetNumGroups = Math.ceil(approvedTeams.length / tournament.teamsPerGroup);
    } else if (tournament.numGroups && tournament.numGroups >= 1) {
      targetNumGroups = tournament.numGroups;
    }

    // 2. Group Allocation Logic
    // Construct target groups and distribute approved teams
    let groupAllocations: { name: string; teamIds: string[] }[] = [];

    if (customGroupings && Array.isArray(customGroupings) && customGroupings.length > 0) {
      groupAllocations = customGroupings.map((cg: any, idx: number) => ({
        name: cg.name || `Group ${String.fromCharCode(65 + idx)}`,
        teamIds: Array.isArray(cg.teamIds) ? cg.teamIds : [],
      }));
    } else {
      // Auto-distribute approved teams across targetNumGroups
      const shuffledTeams = [...approvedTeams].sort(() => Math.random() - 0.5);
      for (let i = 0; i < targetNumGroups; i++) {
        groupAllocations.push({
          name: `Group ${String.fromCharCode(65 + i)}`,
          teamIds: [],
        });
      }
      for (let i = 0; i < shuffledTeams.length; i++) {
        const groupIndex = i % targetNumGroups;
        groupAllocations[groupIndex].teamIds.push(shuffledTeams[i].id);
      }
    }

    // Compute preview totals
    let totalPreviewMatches = 0;
    for (const g of groupAllocations) {
      const count = g.teamIds.length;
      if (count >= 2) {
        totalPreviewMatches += Math.floor((count * (count - 1)) / 2);
      }
    }
    const estimatedDays = matchesPerDay > 0 ? Math.ceil(totalPreviewMatches / matchesPerDay) : 0;

    const groupingsPreview = groupAllocations.map(g => ({
      name: g.name,
      teams: g.teamIds.map(id => {
        const teamObj = approvedTeams.find(t => t.id === id);
        return {
          id,
          name: teamObj?.name || "Team",
          tag: teamObj?.tag || "TAG",
          logo: teamObj?.logo || null,
        };
      })
    }));

    // Handle preview mode without DB writes
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        previewOnly: true,
        preview: {
          groupings: groupingsPreview,
          totalMatches: totalPreviewMatches,
          estimatedDays,
          seriesBestOf,
          matchesPerDay,
          playDays,
          startDate,
          numGroups: targetNumGroups,
        }
      });
    }

    // 2b. Database Group Persistence (Full Execution Mode)
    // Clear old group structures for this tournament to re-create clean allocations
    await prisma.tournamentGroup.deleteMany({
      where: { tournamentId }
    });

    const groups = [];
    for (const gAlloc of groupAllocations) {
      const createdGroup = await prisma.tournamentGroup.create({
        data: {
          tournamentId,
          name: gAlloc.name,
          teams: {
            create: gAlloc.teamIds.map(teamId => ({ teamId }))
          }
        },
        include: { teams: true }
      });
      groups.push(createdGroup);
    }

    // 3. Generate Round Robin Matches PER GROUP
    const groupMatchPools: { groupName: string; matches: { teamAId: string; teamBId: string | null; round: number; isResting: boolean }[] }[] = [];

    for (const group of groups) {
      const teamIdsInGroup = group.teams.map(t => t.teamId);
      if (teamIdsInGroup.length < 2) continue;

      let schedulerTeams = [...teamIdsInGroup];
      if (schedulerTeams.length % 2 !== 0) {
        schedulerTeams.push("DUMMY");
      }

      const n = schedulerTeams.length;
      const groupRounds = n - 1;
      const matchesPerRound = n / 2;
      const groupMatches: { teamAId: string; teamBId: string | null; round: number; isResting: boolean }[] = [];

      for (let j = 0; j < groupRounds; j++) {
        for (let i = 0; i < matchesPerRound; i++) {
          const teamA = schedulerTeams[i];
          const teamB = schedulerTeams[n - 1 - i];

          if (teamA === "DUMMY" && teamB !== "DUMMY") {
            groupMatches.push({ teamAId: teamB, teamBId: null, round: j + 1, isResting: true });
          } else if (teamB === "DUMMY" && teamA !== "DUMMY") {
            groupMatches.push({ teamAId: teamA, teamBId: null, round: j + 1, isResting: true });
          } else if (teamA !== "DUMMY" && teamB !== "DUMMY") {
            groupMatches.push({ teamAId: teamA, teamBId: teamB, round: j + 1, isResting: false });
          }
        }
        schedulerTeams.splice(1, 0, schedulerTeams.pop()!);
      }
      groupMatchPools.push({ groupName: group.name, matches: groupMatches });
    }

    // Flatten all matches into a master schedule list: active games first, TBD/resting matches pushed to last days
    const activeMatches: { groupName: string; teamAId: string; teamBId: string | null; round: number; isResting: boolean }[] = [];
    const restingMatches: { groupName: string; teamAId: string; teamBId: string | null; round: number; isResting: boolean }[] = [];
    const maxRounds = Math.max(...groupMatchPools.map(p => Math.max(...p.matches.map(m => m.round), 0)), 0);

    for (let r = 1; r <= maxRounds; r++) {
      for (const pool of groupMatchPools) {
        const roundMatches = pool.matches.filter(m => m.round === r);
        roundMatches.forEach(m => {
          if (m.isResting || !m.teamBId) {
            restingMatches.push({ ...m, groupName: pool.groupName });
          } else {
            activeMatches.push({ ...m, groupName: pool.groupName });
          }
        });
      }
    }

    const allMatchesMaster = [...activeMatches, ...restingMatches];

    // 4. Scheduling Logic
    const matchesToCreate = [];
    let currentMatchIndex = 0;
    let currentDay = new Date(startDate);
    let playDayCount = 1;

    const isPlayDay = (date: Date) => playDays.includes(date.getDay());
    const totalMatches = allMatchesMaster.length;

    while (currentMatchIndex < totalMatches) {
      while (!isPlayDay(currentDay)) {
        currentDay.setDate(currentDay.getDate() + 1);
      }

      let matchesToday = matchesPerDay;
      const remainingMatches = totalMatches - currentMatchIndex;
      
      // Selection V2 Final Day Hack (for 11 teams RR)
      if (remainingMatches > matchesPerDay && remainingMatches <= matchesPerDay + 1 && playDayCount === 9) {
        matchesToday = 7;
      } else if (remainingMatches <= matchesPerDay && remainingMatches > 0) {
        matchesToday = remainingMatches;
      }

      for (let i = 0; i < matchesToday && currentMatchIndex < totalMatches; i++) {
        const matchData = allMatchesMaster[currentMatchIndex];
        let lobby: Lobby = Lobby.LOBBY_A;
        let hour = 16;

        if (matchesToday === 7) {
          if (i === 0) { hour = 14; lobby = Lobby.LOBBY_A; }
          else {
            const pairIndex = i - 1;
            hour = 16 + (Math.floor(pairIndex / 2) * 2);
            lobby = pairIndex % 2 === 0 ? Lobby.LOBBY_A : Lobby.LOBBY_B;
          }
        } else {
          hour = 16 + (Math.floor(i / 2) * 2);
          lobby = i % 2 === 0 ? Lobby.LOBBY_A : Lobby.LOBBY_B;
        }

        const scheduledTime = new Date(currentDay);
        scheduledTime.setHours(hour, 0, 0, 0);

        matchesToCreate.push({
          tournamentId,
          teamAId: matchData.teamAId,
          teamBId: matchData.teamBId,
          status: matchData.isResting ? MatchStatus.RESTING : MatchStatus.UPCOMING,
          bracketType: BracketType.GROUP_STAGE,
          round: matchData.round,
          playDay: playDayCount,
          lobby,
          scheduledTime,
          bestOf: seriesBestOf,
          stage: `Group Stage - ${matchData.groupName} - Match ${currentMatchIndex + 1}`
        });

        currentMatchIndex++;
      }
      currentDay.setDate(currentDay.getDate() + 1);
      playDayCount++;
    }

    // Update Tournament parameters in DB
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        date: new Date(startDate),
        playDaysPerWeek: playDays,
        matchesPerDay,
        defaultBestOf: seriesBestOf,
        ...(numGroups ? { numGroups } : {}),
        ...(pointSystem ? { pointSystem } : {}),
      },
    });

    // 5. Initialize Standings Index (Clean slate first)
    await prisma.groupStageStanding.deleteMany({
      where: { tournamentId }
    });

    for (const group of groups) {
      for (const groupTeam of group.teams) {
        await prisma.groupStageStanding.create({
          data: {
            tournamentId,
            groupName: group.name,
            teamId: groupTeam.teamId
          }
        });
      }
    }

    // 6. Persistence
    // Completely wipe all matches for this tournament to clear out any old/erroneous manual configurations
    await prisma.match.deleteMany({
      where: { tournamentId }
    });

    const created = await prisma.match.createMany({
      data: matchesToCreate
    });

    return NextResponse.json({
      success: true,
      message: `Orchestrated ${created.count} matches. Groups auto-balanced and standings initialized.`,
      matchCount: created.count,
    });


  } catch (error) {
    console.error("Orchestrator Error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to orchestrate tournament roadmap" 
    }, { status: 500 });
  }
}
