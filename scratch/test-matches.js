const { PrismaClient } = require('../app/generated/prisma/index.js');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing prisma matches fetch...');
    const matches = await prisma.match.findMany({
      take: 5,
      include: {
        teamA: {
          select: { id: true, name: true }
        },
        teamB: {
          select: { id: true, name: true }
        }
      }
    });
    console.log('Successfully fetched matches:', matches.length);
    console.log(JSON.stringify(matches, null, 2));
  } catch (error) {
    console.error('Error fetching matches:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
