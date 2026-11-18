import { prisma } from '@/lib/prisma';

// Concurrent accept/promote/transfer requests must recheck the same roster snapshot.
type TeamTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function teamTransaction<T>(work: (tx: TeamTransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (attempt < 2 && error && typeof error === 'object' && 'code' in error && error.code === 'P2034') continue;
      throw error;
    }
  }
}
