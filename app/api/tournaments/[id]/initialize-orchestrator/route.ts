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
    const body = await req.json();
    let { startDate, playDays, matchesPerDay = 6, roundsLimit } = body;

    // 1. Fetch Tournament Config & Approved Registrations
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { groups: { include: { teams: true } } }
    });

    if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    // Fallbacks for zero-config orchestration
    if (!startDate) startDate = tournament.date;
    if (!playDays || !Array.isArray(playDays)) playDays = [3, 4, 5, 6, 0]; // Default: Wed-Sun

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

    // 2. Group Allocation Logic
    // If no groups exist, we create them based on expected numGroups (minimum 1)
    let groups = tournament.groups;
    if (groups.length === 0) {
      const numGroupsToCreate = 1; // Default to 1 group for Selection V2 if not specified
      const createdGroups = [];
      for (let i = 0; i < numGroupsToCreate; i++) {
        const group = await prisma.tournamentGroup.create({
          data: {
            tournamentId,
            name: `Group ${String.fromCharCode(65 + i)}`,
          }
        });
        createdGroups.push({ ...group, teams: [] });
      }
      groups = createdGroups;
    }

    // Identify teams not in any group
    const assignedTeamIds = new Set(groups.flatMap(g => g.teams.map(t => t.teamId)));
    const unassignedTeams = approvedTeams.filter(t => !assignedTeamIds.has(t.id));

    if (unassignedTeams.length > 0) {
      // Auto-assign unassigned teams to groups (Round Robin distribution)
      const shuffledUnassigned = [...unassignedTeams].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffledUnassigned.length; i++) {
        const targetGroupIndex = i % groups.length;
        const targetGroup = groups[targetGroupIndex];
        
        await prisma.tournamentGroupTeam.create({
          data: {
            groupId: targetGroup.id,
            teamId: shuffledUnassigned[i].id
          }
        });
        
        // Update local state for match generation
        targetGroup.teams.push({ teamId: shuffledUnassigned[i].id } as any);
      }
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

    // Flatten all matches into a master schedule list
    const allMatchesMaster: { groupName: string; teamAId: string; teamBId: string | null; round: number; isResting: boolean }[] = [];
    const maxRounds = Math.max(...groupMatchPools.map(p => Math.max(...p.matches.map(m => m.round), 0)), 0);

    for (let r = 1; r <= maxRounds; r++) {
      for (const pool of groupMatchPools) {
        const roundMatches = pool.matches.filter(m => m.round === r);
        roundMatches.forEach(m => allMatchesMaster.push({ ...m, groupName: pool.groupName }));
      }
    }

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
          bestOf: body.bestOf || 3,
          stage: `Group Stage - ${matchData.groupName} - Match ${currentMatchIndex + 1}`
        });

        currentMatchIndex++;
      }
      currentDay.setDate(currentDay.getDate() + 1);
      playDayCount++;
    }

    // 5. Initialize Standings Index
    for (const group of groups) {
      for (const groupTeam of group.teams) {
        await prisma.groupStageStanding.upsert({
          where: {
            tournamentId_groupName_teamId: {
              tournamentId,
              groupName: group.name,
              teamId: groupTeam.teamId
            }
          },
          update: {},
          create: {
            tournamentId,
            groupName: group.name,
            teamId: groupTeam.teamId
          }
        });
      }
    }

    // 6. Persistence
    await prisma.match.deleteMany({
      where: { tournamentId, bracketType: BracketType.GROUP_STAGE }
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
