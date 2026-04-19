const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.tournament.findMany({ select: { id: true, name: true, pointSystem: true } });
  console.log(JSON.stringify(t, null, 2));
}

main().finally(() => prisma.$disconnect());
