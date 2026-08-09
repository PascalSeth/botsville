import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// Raw rows from user spreadsheet image:
// Format: { rawMatchName, teamAStr, teamBStr, dateStr }
const rawSchedule = [
  { rawMatchName: "Group Stage - Group A - Match 2", teamAStr: "A233", teamBStr: "ATBS", dateStr: "2026-08-04T20:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 1", teamAStr: "RTZ", teamBStr: "VHL", dateStr: "2026-08-05T20:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 3", teamAStr: "ORDER", teamBStr: "VCX", dateStr: "2026-08-06T20:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 4", teamAStr: "FATE", teamBStr: "EPT", dateStr: "2026-08-07T20:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 5", teamAStr: "DXD", teamBStr: "XTX", dateStr: "2026-08-09T20:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 6", teamAStr: "RTZ", teamBStr: "ATBS", dateStr: "2026-08-08T20:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 7", teamAStr: "VHL", teamBStr: "VCX", dateStr: "2026-08-09T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 8", teamAStr: "A233", teamBStr: "EPT", dateStr: "2026-08-09T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 9", teamAStr: "ORDER", teamBStr: "XTX", dateStr: "2026-08-10T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 10", teamAStr: "FATE", teamBStr: "DXD", dateStr: "2026-08-10T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 11", teamAStr: "RTZ", teamBStr: "VCX", dateStr: "2026-08-12T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 12", teamAStr: "ATBS", teamBStr: "EPT", dateStr: "2026-08-12T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 13", teamAStr: "VHL", teamBStr: "XTX", dateStr: "2026-08-14T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 14", teamAStr: "A233", teamBStr: "DXD", dateStr: "2026-08-14T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 15", teamAStr: "ORDER", teamBStr: "FATE", dateStr: "2026-08-15T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 16", teamAStr: "RTZ", teamBStr: "EPT", dateStr: "2026-08-15T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 18", teamAStr: "ATBS", teamBStr: "DXD", dateStr: "2026-08-16T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 17", teamAStr: "VCX", teamBStr: "XTX", dateStr: "2026-08-16T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 19", teamAStr: "VHL", teamBStr: "FATE", dateStr: "2026-08-17T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 20", teamAStr: "A233", teamBStr: "ORDER", dateStr: "2026-08-17T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 22", teamAStr: "EPT", teamBStr: "DXD", dateStr: "2026-08-19T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 21", teamAStr: "RTZ", teamBStr: "XTX", dateStr: "2026-08-19T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 24", teamAStr: "ATBS", teamBStr: "ORDER", dateStr: "2026-08-21T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 23", teamAStr: "VCX", teamBStr: "FATE", dateStr: "2026-08-21T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 25", teamAStr: "VHL", teamBStr: "A233", dateStr: "2026-08-22T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 26", teamAStr: "RTZ", teamBStr: "DXD", dateStr: "2026-08-22T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 27", teamAStr: "XTX", teamBStr: "FATE", dateStr: "2026-08-23T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 28", teamAStr: "EPT", teamBStr: "ORDER", dateStr: "2026-08-23T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 30", teamAStr: "ATBS", teamBStr: "VHL", dateStr: "2026-08-24T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 29", teamAStr: "VCX", teamBStr: "A233", dateStr: "2026-08-24T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 32", teamAStr: "DXD", teamBStr: "ORDER", dateStr: "2026-08-26T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 31", teamAStr: "RTZ", teamBStr: "FATE", dateStr: "2026-08-26T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 34", teamAStr: "EPT", teamBStr: "VHL", dateStr: "2026-08-28T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 33", teamAStr: "XTX", teamBStr: "A233", dateStr: "2026-08-28T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 35", teamAStr: "VCX", teamBStr: "ATBS", dateStr: "2026-08-29T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 36", teamAStr: "RTZ", teamBStr: "ORDER", dateStr: "2026-08-29T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 38", teamAStr: "DXD", teamBStr: "VHL", dateStr: "2026-08-30T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 37", teamAStr: "FATE", teamBStr: "A233", dateStr: "2026-08-30T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 40", teamAStr: "EPT", teamBStr: "VCX", dateStr: "2026-08-31T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 39", teamAStr: "XTX", teamBStr: "ATBS", dateStr: "2026-08-31T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 41", teamAStr: "RTZ", teamBStr: "A233", dateStr: "2026-09-02T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 42", teamAStr: "ORDER", teamBStr: "VHL", dateStr: "2026-09-02T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 44", teamAStr: "DXD", teamBStr: "VCX", dateStr: "2026-09-04T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 43", teamAStr: "FATE", teamBStr: "ATBS", dateStr: "2026-09-04T16:00:00" },
  { rawMatchName: "Group Stage - Group A - Match 45", teamAStr: "XTX", teamBStr: "EPT", dateStr: "2026-09-05T16:00:00" },
];

async function main() {
  const armageddon = await prisma.tournament.findFirst({
    where: { name: { contains: 'ARMAGEDDON', mode: 'insensitive' } },
  });

  if (!armageddon) {
    console.error("Tournament not found");
    return;
  }

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: armageddon.id, status: 'APPROVED' },
    include: { team: true },
  });

  const tagToTeamMap = new Map<string, string>();
  for (const r of registrations) {
    if (r.team.tag) {
      tagToTeamMap.set(r.team.tag.trim().toUpperCase(), r.team.id);
    }
  }

  // Parse and sort by date/time ascending
  const sortedSchedule = rawSchedule.map((item) => ({
    ...item,
    scheduledTime: new Date(item.dateStr),
    teamAId: tagToTeamMap.get(item.teamAStr.toUpperCase()),
    teamBId: tagToTeamMap.get(item.teamBStr.toUpperCase()),
  })).sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

  // Assign PlayDays based on unique dates in ascending order
  const dateToPlayDay = new Map<string, number>();
  let dayCounter = 1;
  for (const item of sortedSchedule) {
    const dateKey = item.scheduledTime.toISOString().split('T')[0];
    if (!dateToPlayDay.has(dateKey)) {
      dateToPlayDay.set(dateKey, dayCounter++);
    }
  }

  console.log(`Parsed ${sortedSchedule.length} matches across ${dateToPlayDay.size} play days.`);
  console.log("First 5 matches sorted chronologically:");
  sortedSchedule.slice(0, 5).forEach((m, idx) => {
    console.log(`Match ${idx + 1}: ${m.scheduledTime.toISOString()} | ${m.teamAStr} vs ${m.teamBStr} | Stage: Group Stage - Group A - Match ${idx + 1} | PlayDay: ${dateToPlayDay.get(m.scheduledTime.toISOString().split('T')[0])}`);
  });

  // Update Tournament for 1 Group
  await prisma.tournament.update({
    where: { id: armageddon.id },
    data: {
      numGroups: 1,
      date: new Date("2026-08-04T20:00:00.000Z"),
    },
  });

  // Re-create Group A with all 10 teams
  await prisma.tournamentGroup.deleteMany({ where: { tournamentId: armageddon.id } });
  const groupA = await prisma.tournamentGroup.create({
    data: {
      tournamentId: armageddon.id,
      name: "Group A",
      teams: {
        create: Array.from(tagToTeamMap.values()).map(teamId => ({ teamId })),
      },
    },
  });

  // Clear existing standings and recreate for Group A
  await prisma.groupStageStanding.deleteMany({ where: { tournamentId: armageddon.id } });
  for (const teamId of Array.from(tagToTeamMap.values())) {
    await prisma.groupStageStanding.create({
      data: {
        tournamentId: armageddon.id,
        groupName: "Group A",
        teamId,
      },
    });
  }

  // Clear existing matches and recreate exact 45 matches in chronological order
  await prisma.match.deleteMany({ where: { tournamentId: armageddon.id } });

  const matchesToInsert = sortedSchedule.map((item, index) => {
    const matchNum = index + 1;
    const playDay = dateToPlayDay.get(item.scheduledTime.toISOString().split('T')[0]) || 1;
    return {
      tournamentId: armageddon.id,
      teamAId: item.teamAId!,
      teamBId: item.teamBId!,
      status: "UPCOMING" as const,
      bracketType: "GROUP_STAGE" as any,
      round: Math.ceil(matchNum / 5), // rough round number or match index
      playDay,
      scheduledTime: item.scheduledTime,
      bestOf: armageddon.defaultBestOf || 3,
      stage: `Group Stage - Group A - Match ${matchNum}`,
    };
  });

  const created = await prisma.match.createMany({
    data: matchesToInsert,
  });

  console.log(`Successfully created ${created.count} matches for Armageddon in ascending chronological order!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
