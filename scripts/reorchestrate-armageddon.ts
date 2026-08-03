import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const armageddon = await prisma.tournament.findFirst({
    where: {
      name: {
        contains: 'ARMAGEDDON',
        mode: 'insensitive',
      },
    },
  });

  if (!armageddon) {
    console.log("Armageddon tournament not found.");
    return;
  }

  console.log(`Re-orchestrating Armageddon Tournament (${armageddon.id})...`);

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: armageddon.id, status: 'APPROVED' },
    include: { team: true },
  });

  const approvedTeams = registrations.map((r) => r.team);
  console.log(`Approved Teams count: ${approvedTeams.length}`);

  // Target 2 groups for 10 teams (Group A: 5 teams, Group B: 5 teams)
  const targetNumGroups = 2;
  await prisma.tournamentGroup.deleteMany({ where: { tournamentId: armageddon.id } });

  const shuffledTeams = [...approvedTeams].sort(() => Math.random() - 0.5);
  const groupsToCreate = [];

  for (let i = 0; i < targetNumGroups; i++) {
    const groupName = `Group ${String.fromCharCode(65 + i)}`;
    const groupTeams = [];
    for (let j = i; j < shuffledTeams.length; j += targetNumGroups) {
      groupTeams.push({ teamId: shuffledTeams[j].id });
    }

    const createdGroup = await prisma.tournamentGroup.create({
      data: {
        tournamentId: armageddon.id,
        name: groupName,
        teams: { create: groupTeams },
      },
      include: { teams: true },
    });
    groupsToCreate.push(createdGroup);
  }

  const groupMatchPools: { groupName: string; matches: any[] }[] = [];

  for (const group of groupsToCreate) {
    const teamIdsInGroup = group.teams.map((t) => t.teamId);
    let schedulerTeams = [...teamIdsInGroup];
    if (schedulerTeams.length % 2 !== 0) {
      schedulerTeams.push('DUMMY');
    }

    const n = schedulerTeams.length;
    const groupRounds = n - 1;
    const matchesPerRound = n / 2;
    const groupMatches: any[] = [];

    for (let j = 0; j < groupRounds; j++) {
      for (let i = 0; i < matchesPerRound; i++) {
        const teamA = schedulerTeams[i];
        const teamB = schedulerTeams[n - 1 - i];

        if (teamA === 'DUMMY' || teamB === 'DUMMY') {
          const realTeam = teamA === 'DUMMY' ? teamB : teamA;
          groupMatches.push({ teamAId: realTeam, teamBId: null, round: j + 1, isResting: true });
        } else {
          groupMatches.push({ teamAId: teamA, teamBId: teamB, round: j + 1, isResting: false });
        }
      }
      schedulerTeams.splice(1, 0, schedulerTeams.pop()!);
    }
    groupMatchPools.push({ groupName: group.name, matches: groupMatches });
  }

  // Interleave round-robin matches across groups, separating active team-vs-team matches from resting/TBD matches
  const activeMatches: any[] = [];
  const restingMatches: any[] = [];
  const maxRounds = Math.max(...groupMatchPools.map((p) => Math.max(...p.matches.map((m) => m.round), 0)), 0);

  for (let r = 1; r <= maxRounds; r++) {
    for (const pool of groupMatchPools) {
      const roundMatches = pool.matches.filter((m) => m.round === r);
      roundMatches.forEach((m) => {
        if (m.isResting || !m.teamBId) {
          restingMatches.push({ ...m, groupName: pool.groupName });
        } else {
          activeMatches.push({ ...m, groupName: pool.groupName });
        }
      });
    }
  }

  const allMatchesMaster = [...activeMatches, ...restingMatches];

  // Schedule matches across active playDays
  const matchesToCreate = [];
  let currentMatchIndex = 0;
  let currentDay = new Date(armageddon.date || Date.now());
  const playDays = armageddon.playDaysPerWeek.length > 0 ? armageddon.playDaysPerWeek : [5, 6, 0, 2, 4];
  const matchesPerDay = armageddon.matchesPerDay || 4;
  let playDayCount = 1;

  const isPlayDay = (date: Date) => playDays.includes(date.getDay());
  const totalMatches = allMatchesMaster.length;

  while (currentMatchIndex < totalMatches) {
    while (!isPlayDay(currentDay)) {
      currentDay.setDate(currentDay.getDate() + 1);
    }

    const matchesToday = Math.min(matchesPerDay, totalMatches - currentMatchIndex);
    for (let i = 0; i < matchesToday; i++) {
      const matchData = allMatchesMaster[currentMatchIndex];
      const hour = 16 + Math.floor(i / 2) * 2;
      const scheduledTime = new Date(currentDay);
      scheduledTime.setHours(hour, 0, 0, 0);

      matchesToCreate.push({
        tournamentId: armageddon.id,
        teamAId: matchData.teamAId,
        teamBId: matchData.teamBId,
        status: matchData.isResting ? 'RESTING' : 'UPCOMING',
        bracketType: 'GROUP_STAGE',
        round: matchData.round,
        playDay: playDayCount,
        scheduledTime,
        bestOf: armageddon.defaultBestOf || 3,
        stage: `Group Stage - ${matchData.groupName} - Match ${currentMatchIndex + 1}`,
      });

      currentMatchIndex++;
    }
    currentDay.setDate(currentDay.getDate() + 1);
    playDayCount++;
  }

  // Update tournament numGroups in DB
  await prisma.tournament.update({
    where: { id: armageddon.id },
    data: { numGroups: targetNumGroups },
  });

  await prisma.groupStageStanding.deleteMany({ where: { tournamentId: armageddon.id } });
  for (const group of groupsToCreate) {
    for (const gt of group.teams) {
      await prisma.groupStageStanding.create({
        data: {
          tournamentId: armageddon.id,
          groupName: group.name,
          teamId: gt.teamId,
        },
      });
    }
  }

  await prisma.match.deleteMany({ where: { tournamentId: armageddon.id } });
  const created = await prisma.match.createMany({ data: matchesToCreate as any });

  console.log(`Successfully re-orchestrated Armageddon into ${targetNumGroups} groups with ${created.count} total matches!`);
  console.log(`- Group A teams: ${groupsToCreate[0].teams.length}`);
  console.log(`- Group B teams: ${groupsToCreate[1].teams.length}`);
  console.log(`- Active playable matches: ${activeMatches.length}`);
  console.log(`- Resting/TBD matches pushed to end: ${restingMatches.length}`);
  console.log(`- Total Game Days scheduled: ${playDayCount - 1}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
