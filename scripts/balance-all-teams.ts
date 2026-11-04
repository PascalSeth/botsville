import { prisma } from '../lib/prisma';
import { ensureTeamRosterBalance } from '../lib/team-roster';

async function main() {
  console.log('--- Starting Roster Balancing for all teams ---');
  const teams = await prisma.team.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true }
  });

  console.log(`Found ${teams.length} active teams.`);
  let modifiedCount = 0;

  for (const t of teams) {
    const wasModified = await ensureTeamRosterBalance(t.id);
    if (wasModified) {
      modifiedCount++;
      console.log(`[BALANCED] Team: ${t.name} (${t.id})`);
    }
  }

  console.log(`\nBalancing complete. Modified ${modifiedCount} teams.`);

  // Verify all teams now
  console.log('\n--- Final Verification ---');
  const finalTeams = await prisma.team.findMany({
    where: { deletedAt: null },
    include: {
      players: { where: { deletedAt: null } }
    }
  });

  let anyIssues = false;
  for (const t of finalTeams) {
    const starters = t.players.filter(p => !p.isSubstitute);
    const subs = t.players.filter(p => p.isSubstitute);
    const expectedStarters = Math.min(5, t.players.length);
    if (starters.length !== expectedStarters) {
      console.error(`[ERROR] Team ${t.name}: expected ${expectedStarters} starters, got ${starters.length} (subs: ${subs.length})`);
      anyIssues = true;
    } else {
      console.log(`[OK] Team ${t.name}: total=${t.players.length}, starters=${starters.length}, subs=${subs.length}`);
    }
  }

  if (!anyIssues) {
    console.log('\nSUCCESS: All teams are now perfectly balanced with no more than 5 starters and all possible subs promoted to starters!');
  } else {
    console.error('\nWARNING: Some teams still have issues!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

