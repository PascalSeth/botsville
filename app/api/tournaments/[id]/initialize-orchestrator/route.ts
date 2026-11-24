import { requireAdmin, apiError } from '@/lib/api-utils';

// Older clients must review a saved draft instead of deleting and recreating fixtures.
export async function POST() {
  try {
    await requireAdmin('TOURNAMENT_ADMIN');
    return apiError('Open the tournament draft room to configure groups, save the draw and publish its reviewed schedule.', 409);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to access tournament.';
    return apiError(message, message === 'Unauthorized' ? 401 : 403);
  }
}
