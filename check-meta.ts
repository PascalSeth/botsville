import { prisma } from "./lib/prisma";

async function checkHeroMeta() {
  const meta = await prisma.heroMeta.findFirst({
    include: { season: true }
  });
  console.log("HeroMeta:", JSON.stringify(meta, null, 2));
}

checkHeroMeta().catch(console.error).finally(() => prisma.$disconnect());
