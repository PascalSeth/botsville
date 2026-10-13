'use client';

/**
 * Custom Next.js Image loader that routes Supabase images through wsrv.nl CDN.
 * This ensures every <Image /> across the entire site automatically fetches
 * compressed, WebP-optimized, 1-year cached images from Cloudflare edge
 * instead of hitting Supabase Storage origin.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src) return '';

  // Local public assets
  if (src.startsWith('/')) {
    return src;
  }

  // If image is from Supabase Storage, proxy via wsrv.nl
  if (src.includes('supabase.co')) {
    if (/\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(src)) {
      return src;
    }

    const cleanUrl = src.split('?')[0];
    const encoded = encodeURIComponent(cleanUrl);
    const q = quality || 80;
    return `https://wsrv.nl/?url=${encoded}&w=${width}&q=${q}&output=webp&we=1&maxage=1y`;
  }

  return src;
}
