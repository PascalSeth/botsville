import type { NewsWriteData } from '@/lib/news-validation';

export type NewsPost = NewsWriteData & {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  _count?: { reactions: number };
};
