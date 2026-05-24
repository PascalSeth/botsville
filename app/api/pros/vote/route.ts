import { NextRequest } from 'next/server';
import { getCurrentUser, requireAuth, apiError, apiSuccess } from '@/lib/api-utils';
import {
  getAggregatedVotes,
  getUserVote,
  castVote,
  removeVote,
  PRO_CANDIDATES,
} from '@/lib/pro-votes';

/**
 * GET /api/pros/vote
 * Returns all pro candidates with live vote counts, percentages, total votes,
 * and the currently authenticated user's selected candidate (if any).
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const stats = await getAggregatedVotes(user?.id);
    return apiSuccess(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pro voting stats';
    return apiError(message, 500);
  }
}

/**
 * POST /api/pros/vote
 * Cast or toggle a vote for a pro candidate.
 *
 * Rules:
 *  - Requires authentication.
 *  - Clicking the same candidate again removes the vote (toggle off).
 *  - Clicking a different candidate switches the vote (upsert).
 *  - The DB unique constraint on userId guarantees one active vote per user
 *    even under concurrent requests — no file locks, no race conditions.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth guard
    const user = await requireAuth();

    // 2. Validate request body
    const body = await request.json();
    const { candidateId } = body as { candidateId?: string };

    if (!candidateId) {
      return apiError('candidateId is required', 400);
    }

    const candidateExists = PRO_CANDIDATES.some((c) => c.id === candidateId);
    if (!candidateExists) {
      return apiError('Invalid pro candidate ID', 400);
    }

    // 3. Determine toggle action
    const currentVote = await getUserVote(user.id);
    let action: 'voted' | 'removed';

    if (currentVote === candidateId) {
      // Same candidate clicked → remove vote
      await removeVote(user.id);
      action = 'removed';
    } else {
      // New or switched candidate → upsert
      await castVote(user.id, candidateId);
      action = 'voted';
    }

    // 4. Return refreshed standings
    const updatedStats = await getAggregatedVotes(user.id);
    return apiSuccess({ action, ...updatedStats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to register your vote';
    if (message === 'Unauthorized') {
      return apiError('You must be logged in to vote.', 401);
    }
    console.error('Pro vote API error:', error);
    return apiError(message, 500);
  }
}
