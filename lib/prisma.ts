import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";
import { broadcastToUser } from "@/lib/socket-server";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof buildPrismaClient> | undefined;
};

function buildPrismaClient() {
  const client = new PrismaClient({ adapter });

  return client.$extends({
    query: {
      notification: {
        async create({ args, query }) {
          const result = await query(args);
          try {
            if (result?.userId) {
              void broadcastToUser(result.userId, 'notification', result);
            }
          } catch { /* broadcast failed */ }
          return result;
        },
        async createMany({ args, query }) {
          const result = await query(args);
          try {
            const rows = Array.isArray(args.data) ? args.data : [args.data];
            const userIds = [...new Set(rows.map((r: { userId?: string }) => r.userId).filter(Boolean))];
            for (const uid of userIds) {
              void broadcastToUser(uid as string, 'notification', { reload: true });
            }
          } catch { /* broadcast failed */ }
          return result;
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
