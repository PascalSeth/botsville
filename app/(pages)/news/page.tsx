import type { Metadata } from 'next';
import { Suspense } from 'react';
import NewsFeedClient, { NewsFeedLoading } from './NewsFeedClient';

export const metadata: Metadata = {
  title: 'The Feed — News, Memes & MLBB | Botsville',
  description: 'Gaming news, community stories, memes, and the latest from the Land of Dawn. Ghana plays here.',
};

export default function NewsPage() {
  return (
    <Suspense fallback={<NewsFeedLoading />}>
      <NewsFeedClient />
    </Suspense>
  );
}
