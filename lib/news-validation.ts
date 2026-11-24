import { isNewsCategory, isNewsFormat, resolveNewsFormat, type NewsCategory, type NewsFormat, type NewsStatus } from './news-content';

export class NewsValidationError extends Error {}

export type NewsWriteData = {
  title: string;
  format: NewsFormat;
  category: NewsCategory;
  status: NewsStatus;
  subtitle: string | null;
  body: string | null;
  image: string | null;
  images: string[];
  tags: string[];
  sourceName: string | null;
  sourceUrl: string | null;
  featured: boolean;
};

function text(value: unknown, name: string, limit: number, nullable = true): string | null {
  if (value === null && nullable) return null;
  if (typeof value !== 'string') throw new NewsValidationError(`${name} must be text.`);
  const trimmed = value.trim();
  if (!trimmed && !nullable) throw new NewsValidationError(`${name} is required.`);
  if (trimmed.length > limit) throw new NewsValidationError(`${name} must be ${limit} characters or fewer.`);
  return trimmed || null;
}

function url(value: unknown, name: string, allowLocal: boolean): string | null {
  const parsed = text(value, name, 2048);
  if (!parsed) return null;
  if (allowLocal && /^\/(?!\/)/.test(parsed) && !parsed.includes('\\')) return parsed;
  try {
    const candidate = new URL(parsed);
    if (['https:', 'http:'].includes(candidate.protocol) && !candidate.username && !candidate.password) return parsed;
  } catch { /* Report the same validation error for malformed and unsafe URLs. */ }
  throw new NewsValidationError(`${name} must be an http or https URL${allowLocal ? ' or a local image path' : ''}.`);
}

function stringList(value: unknown, name: string, limit: number): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new NewsValidationError(`${name} must be a list of text values.`);
  if (value.length > limit) throw new NewsValidationError(`${name} can contain up to ${limit} items.`);
  return [...new Set(value.map(item => item.trim()).filter(Boolean))];
}

export function validateNewsWrite(payload: unknown, existing?: NewsWriteData) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new NewsValidationError('Send a post as a JSON object.');
  const input = payload as Record<string, unknown>;
  const changes: Partial<NewsWriteData> = {};
  if ('title' in input) changes.title = text(input.title, 'Title', 180, false)!;
  if ('format' in input) {
    if (!isNewsFormat(input.format)) throw new NewsValidationError('Choose News story, Quick post, or Meme.');
    changes.format = input.format;
  }
  if ('category' in input) {
    if (!isNewsCategory(input.category)) throw new NewsValidationError('Choose a valid post topic.');
    changes.category = input.category;
  }
  if ('status' in input) {
    if (input.status !== 'DRAFT' && input.status !== 'PUBLISHED') throw new NewsValidationError('Status must be DRAFT or PUBLISHED.');
    changes.status = input.status;
  }
  if ('subtitle' in input) changes.subtitle = text(input.subtitle, 'Caption / subtitle', 500);
  if ('body' in input) changes.body = text(input.body, 'Post text', 100_000);
  if ('image' in input) changes.image = url(input.image, 'Cover image', true);
  if ('images' in input) changes.images = stringList(input.images, 'Gallery', 12).map(image => url(image, 'Gallery image', true)!);
  if ('tags' in input) changes.tags = stringList(input.tags, 'Tags', 12).map(tag => text(tag.replace(/^#/, ''), 'Tag', 40, false)!);
  if ('sourceName' in input) changes.sourceName = text(input.sourceName, 'Source / credit', 100);
  if ('sourceUrl' in input) changes.sourceUrl = url(input.sourceUrl, 'Source link', false);
  if ('featured' in input) {
    if (typeof input.featured !== 'boolean') throw new NewsValidationError('Featured must be true or false.');
    changes.featured = input.featured;
  }
  if (existing && Object.keys(changes).length === 0) throw new NewsValidationError('No post fields to update.');

  const post: NewsWriteData = {
    title: '', category: 'COMMUNITY', format: 'QUICK_POST', status: 'DRAFT',
    subtitle: null, body: null, image: null, images: [], tags: [],
    sourceName: null, sourceUrl: null, featured: false,
    ...existing, ...changes,
  };
  if (!existing && !changes.format) post.format = resolveNewsFormat(postWithoutFormat(post));
  if (!post.title.trim()) throw new NewsValidationError('Title is required.');
  if (post.status === 'PUBLISHED' && post.format === 'MEME' && !post.image && post.images.length === 0) {
    throw new NewsValidationError('Add an image or GIF before publishing a meme.');
  }
  if (post.status === 'PUBLISHED' && post.format === 'ARTICLE' && !post.body?.trim()) {
    throw new NewsValidationError('Add the story text before publishing a news story.');
  }
  return { post, changes };
}

function postWithoutFormat(post: NewsWriteData) {
  return { body: post.body, category: post.category, tags: post.tags };
}

export function parseNewsQuery(params: URLSearchParams) {
  const integer = (name: string, fallback: number, min: number, max: number) => {
    const value = params.get(name);
    if (value === null) return fallback;
    if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) throw new NewsValidationError(`Invalid ${name}.`);
    return Number(value);
  };
  const category = params.get('category');
  if (category && !isNewsCategory(category)) throw new NewsValidationError('Invalid topic.');
  const format = params.get('format');
  const formats: NewsFormat[] = [];
  if (format) {
    const aliases: Record<string, NewsFormat[]> = {
      posts: ['QUICK_POST', 'MEME'], memes: ['MEME'], articles: ['ARTICLE'], quick: ['QUICK_POST'],
    };
    if (isNewsFormat(format)) formats.push(format);
    else if (Object.hasOwn(aliases, format)) formats.push(...aliases[format]);
    else throw new NewsValidationError('Invalid post format.');
  }
  const status = params.get('status');
  if (status && status !== 'DRAFT' && status !== 'PUBLISHED') throw new NewsValidationError('Invalid status.');
  const featured = params.get('featured');
  if (featured !== null && featured !== 'true' && featured !== 'false') throw new NewsValidationError('Invalid featured filter.');
  return {
    limit: integer('limit', 24, 1, 100), skip: integer('skip', 0, 0, 1_000_000),
    category: category as NewsCategory | null, formats,
    status: status as NewsStatus | null, featured: featured === null ? null : featured === 'true',
  };
}
