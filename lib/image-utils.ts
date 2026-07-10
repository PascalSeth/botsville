// Image optimization utility for reducing cache egress
// Transforms images using imgproxy or Supabase image transformation

/**
 * Optimize image URL by resizing and compressing
 * Reduces image size by 70-80% typically
 */
export function optimizeImageUrl(
  imageUrl: string | null | undefined,
  options?: {
    width?: number;
    height?: number;
    quality?: number; // 1-100, default 80
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  }
): string {
  if (!imageUrl) return '';

  // Skip optimization for local/public images
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }

  const width = options?.width || 800;
  const height = options?.height || 600;
  const quality = options?.quality || 80;
  const format = options?.format || 'auto';

  // If using Supabase Storage, append transform params
  if (imageUrl.includes('supabase.co')) {
    return `${imageUrl}?width=${width}&height=${height}&quality=${quality}&format=${format}`;
  }

  // For other URLs, return as-is (can add imgproxy if needed later)
  return imageUrl;
}

/**
 * Get optimized image URL for hero/banner images
 */
export function getHeroImageUrl(imageUrl: string | null | undefined): string {
  return optimizeImageUrl(imageUrl, {
    width: 1920,
    height: 1080,
    quality: 75,
    format: 'webp',
  });
}

/**
 * Get optimized image URL for thumbnails/avatars
 */
export function getThumbnailUrl(imageUrl: string | null | undefined): string {
  return optimizeImageUrl(imageUrl, {
    width: 400,
    height: 400,
    quality: 80,
    format: 'webp',
  });
}

/**
 * Get optimized image URL for profile photos
 */
export function getProfilePhotoUrl(imageUrl: string | null | undefined): string {
  return optimizeImageUrl(imageUrl, {
    width: 200,
    height: 200,
    quality: 85,
    format: 'webp',
  });
}

/**
 * Get optimized image URL for player cards
 */
export function getPlayerCardImageUrl(imageUrl: string | null | undefined): string {
  return optimizeImageUrl(imageUrl, {
    width: 500,
    height: 500,
    quality: 80,
    format: 'webp',
  });
}

/**
 * Responsive srcSet for different screen sizes
 * Use with Next.js Image component
 */
export function getResponsiveSrcSet(baseUrl: string | null | undefined): string {
  if (!baseUrl) return '';

  return [
    `${optimizeImageUrl(baseUrl, { width: 400, quality: 80 })} 400w`,
    `${optimizeImageUrl(baseUrl, { width: 800, quality: 80 })} 800w`,
    `${optimizeImageUrl(baseUrl, { width: 1200, quality: 80 })} 1200w`,
    `${optimizeImageUrl(baseUrl, { width: 1920, quality: 75 })} 1920w`,
  ].join(', ');
}
