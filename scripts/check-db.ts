import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = { adapter };
const prisma = new PrismaClient(prismaOptions);

async function main() {
  // 1. Active season
  const season = await prisma.season.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, status: true },
  });
  console.log('\n=== Active Season ===');
  console.log(JSON.stringify(season, null, 2));

  // 2. All seasons
  const seasons = await prisma.season.findMany({ select: { id: true, name: true, status: true } });
  console.log('\n=== All Seasons ===');
  console.log(JSON.stringify(seasons, null, 2));

  // 3. Player counts
  const all = await prisma.player.count();
  const notDeleted = await prisma.player.count({ where: { deletedAt: null } });
  const withActiveTeam = await prisma.player.count({
    where: { deletedAt: null, team: { deletedAt: null, status: 'ACTIVE' } },
  });
  console.log('\n=== Player Counts ===');
  console.log({ all, notDeleted, withActiveTeam });

  // 4. Players by role (active teams)
  const byRole = await prisma.player.groupBy({
    by: ['role'],
    where: { deletedAt: null, team: { deletedAt: null, status: 'ACTIVE' } },
    _count: true,
  });
  console.log('\n=== Players by Role (active teams) ===');
  console.log(JSON.stringify(byRole, null, 2));

  // 5. Sample players with team info
  const samples = await prisma.player.findMany({
    where: { deletedAt: null, team: { deletedAt: null, status: 'ACTIVE' } },
    select: {
      id: true,
      ign: true,
      role: true,
      isSubstitute: true,
      photo: true,
      team: { select: { name: true, tag: true, status: true, deletedAt: true } },
    },
    take: 10,
  });
  console.log('\n=== Sample Players (active teams) ===');
  console.log(JSON.stringify(samples, null, 2));

  // 6. All teams
  const teams = await prisma.team.findMany({
    where: { deletedAt: null },
    select: {
      id: true, name: true, tag: true, status: true, deletedAt: true,
      _count: { select: { players: { where: { deletedAt: null } } } },
    },
  });
  console.log('\n=== All Non-Deleted Teams ===');
  console.log(JSON.stringify(teams, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
