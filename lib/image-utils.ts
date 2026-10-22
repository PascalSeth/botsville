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

  // Skip optimization if already routed through wsrv.nl CDN
  if (imageUrl.includes('wsrv.nl')) {
    return imageUrl;
  }

  const width = options?.width || 800;
  const height = options?.height;
  const quality = options?.quality || 80;

  // If using Supabase Storage, route through wsrv.nl edge CDN
  if (imageUrl.includes('supabase.co')) {
    // Skip video formats since wsrv.nl is for images
    if (/\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(imageUrl)) {
      return imageUrl;
    }

    // Strip any existing query params to ensure clean origin URL
    const cleanUrl = imageUrl.split('?')[0];
    const encodedOrigin = encodeURIComponent(cleanUrl);

    let wsrvUrl = `https://wsrv.nl/?url=${encodedOrigin}&w=${width}&q=${quality}&output=webp&we=1&maxage=1y`;
    if (height) {
      wsrvUrl += `&h=${height}&fit=cover`;
    }
    return wsrvUrl;
  }

  // For other URLs, return as-is
  return imageUrl;
}

/**
 * Get optimized image URL for hero/banner images
 */
export function getHeroImageUrl(imageUrl: string | null | undefined): string {
  return optimizeImageUrl(imageUrl, {
    width: 1200,
    quality: 80,
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

/**
 * Compress an image File or Blob in the browser using HTML5 Canvas.
 * Reduces 5MB-10MB camera/phone photos to ~50KB-120KB WebP before upload.
 */
export async function compressImageFile(
  file: File | Blob,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<{ blob: Blob; base64: string }> {
  return new Promise((resolve, reject) => {
    // If not running in browser (e.g. SSR), fallback
    if (typeof window === 'undefined') {
      return reject(new Error('compressImageFile can only be called in browser environment'));
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context not available'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/webp', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, base64: compressedBase64 });
            } else {
              reject(new Error('Failed to create Blob from canvas'));
            }
          },
          'image/webp',
          quality
        );
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

