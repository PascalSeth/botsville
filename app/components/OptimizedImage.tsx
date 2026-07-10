import Image from 'next/image';
import { optimizeImageUrl } from '@/lib/image-utils';

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  style?: React.CSSProperties;
  fill?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  objectPosition?: string;
  priority?: boolean;
}

/**
 * Wrapper around Next.js Image component that auto-optimizes URLs
 * Significantly reduces cache egress for hero and player images
 */
export function OptimizedImage({
  src,
  alt,
  width = 800,
  height = 600,
  quality = 80,
  className,
  style,
  fill = false,
  objectFit = 'cover',
  objectPosition = 'center',
  priority = false,
}: OptimizedImageProps) {
  if (!src) {
    return <div className={className} style={style} />;
  }

  const optimizedSrc = optimizeImageUrl(src, { width, height, quality });

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={className}
      style={{
        ...style,
        objectFit,
        objectPosition,
      }}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
}

/**
 * Hero/Banner image component (large, full-width images)
 */
export function HeroBannerImage({
  src,
  alt,
  className,
  style,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!src) {
    return <div className={className} style={style} />;
  }

  const optimizedSrc = optimizeImageUrl(src, {
    width: 1920,
    height: 1080,
    quality: 75,
    format: 'webp',
  });

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={className}
      style={{ ...style, objectFit: 'cover' }}
      loading="lazy"
    />
  );
}

/**
 * Player avatar/profile image component
 */
export function PlayerAvatar({
  src,
  alt,
  className,
  size = 48,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  size?: number;
}) {
  if (!src) {
    return (
      <div
        className={`${className} rounded-full bg-gray-700`}
        style={{ width: size, height: size }}
      />
    );
  }

  const optimizedSrc = optimizeImageUrl(src, {
    width: size,
    height: size,
    quality: 85,
    format: 'webp',
  });

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={`${className} rounded-full`}
      style={{ width: size, height: size, objectFit: 'cover' }}
      loading="lazy"
    />
  );
}
