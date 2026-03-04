import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { getIO } from "@/lib/socket-server";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

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
            const io = getIO();
            if (io && result?.userId) {
              io.to('user:' + result.userId).emit('new-notification', result);
            }
          } catch { /* socket not ready */ }
          return result;
        },
        async createMany({ args, query }) {
          const result = await query(args);
          // createMany doesn't return rows in Prisma by default;
          // fire a generic "reload" event so clients re-fetch.
          try {
            const io = getIO();
            if (io) {
              const rows = Array.isArray(args.data) ? args.data : [args.data];
              const userIds = [...new Set(rows.map((r: { userId?: string }) => r.userId).filter(Boolean))];
              for (const uid of userIds) {
                io.to('user:' + uid).emit('notifications-reload');
              }
            }
          } catch { /* socket not ready */ }
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
