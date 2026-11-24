export const NEWS_FORMATS = {
  ARTICLE: { label: 'News story', description: 'An article, report, interview, or breakdown.' },
  QUICK_POST: { label: 'Quick post', description: 'A short update, hot take, or bit of banter.' },
  MEME: { label: 'Meme', description: 'An image or GIF with an optional caption.' },
} as const;

export type NewsFormat = keyof typeof NEWS_FORMATS;

export const NEWS_CATEGORIES = {
  COMMUNITY: 'Community',
  ESPORTS: 'Esports',
  BANTER: 'Banter',
  PATCH_NOTES: 'Patch notes',
  NEW_EVENT: 'Events',
  NEW_HERO: 'Heroes',
  INTERVIEW: 'Interviews',
} as const;

export type NewsCategory = keyof typeof NEWS_CATEGORIES;
export type NewsStatus = 'DRAFT' | 'PUBLISHED';

export function isNewsFormat(value: unknown): value is NewsFormat {
  return typeof value === 'string' && Object.hasOwn(NEWS_FORMATS, value);
}

export function isNewsCategory(value: unknown): value is NewsCategory {
  return typeof value === 'string' && Object.hasOwn(NEWS_CATEGORIES, value);
}

export function newsCategoryLabel(category: string): string {
  return isNewsCategory(category) ? NEWS_CATEGORIES[category] : 'Community';
}

/** Only used for legacy records or clients that have not chosen a format yet. */
export function resolveNewsFormat(content: {
  format?: string | null;
  body?: string | null;
  category?: string;
  tags?: string[];
}): NewsFormat {
  if (isNewsFormat(content.format)) return content.format;
  if ([content.category, ...(content.tags || [])].some(value => /^#?memes?$/i.test(value?.trim() || ''))) return 'MEME';
  const body = content.body?.trim() || '';
  return body && body.split(/\s+/).length >= 160 ? 'ARTICLE' : 'QUICK_POST';
}

export function canManageNews(role?: string | null): boolean {
  return Boolean(role && ['SUPER_ADMIN', 'CONTENT_ADMIN', 'EDITOR', 'INTERVIEWER'].includes(role));
}
