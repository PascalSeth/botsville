import { resolveNewsFormat } from './news-content';

type NewsContent = {
  format?: string | null;
  body?: string | null;
  image?: string | null;
  images?: string[];
  tags?: string[];
  category?: string;
};

/** Keep the cover, gallery, and share preview on the same first image. */
export function getNewsImages(content: Pick<NewsContent, 'image' | 'images'>): string[] {
  return [...new Set([content.image, ...(content.images || [])]
    .filter((image): image is string => typeof image === 'string' && Boolean(image.trim()))
    .map(image => image.trim()))];
}

export function isAnimatedNewsImage(src: string): boolean {
  // Bypass the static WebP image proxy for GIFs, including signed image URLs.
  return /\.gif(?:[?#]|$)/i.test(src);
}

export function getNewsPresentation(content: NewsContent) {
  const body = content.body?.trim() || '';
  const wordCount = body ? body.split(/\s+/).length : 0;
  const format = resolveNewsFormat(content);
  const isMeme = format === 'MEME';
  const images = getNewsImages(content);

  const isLongForm = format === 'ARTICLE';
  return {
    format,
    body,
    images,
    coverImage: images[0] || null,
    extraImages: images.slice(1),
    isMeme,
    isLongForm,
    readingMinutes: isLongForm && wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : null,
  };
}
