const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    where: {
      status: "RESTING"
    },
    include: {
      tournament: { select: { name: true } },
      teamA: { select: { name: true } }
    },
    take: 5
  });

  console.log(JSON.stringify(matches, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
