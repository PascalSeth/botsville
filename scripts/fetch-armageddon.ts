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
        mode: 'insensitive'
      }
    },
    include: {
      registrations: {
        include: {
          team: {
            select: { name: true, tag: true }
          }
        }
      },
      groups: {
        include: {
          teams: {
            include: {
              team: {
                select: { name: true, tag: true }
              }
            }
          }
        }
      },
      matches: {
        include: {
          teamA: { select: { name: true } },
          teamB: { select: { name: true } },
          winner: { select: { name: true } }
        }
      }
    }
  });

  console.log("=== ARMAGEDDON TOURNAMENT FULL DETAILS ===");
  console.log(JSON.stringify(armageddon, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
