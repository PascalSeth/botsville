'use client';

import { useState } from 'react';
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
  fallbackSrc?: string;
}

/**
 * Optimized image component that routes through wsrv.nl CDN
 * and handles fallback if origin image is unavailable.
 */
export function OptimizedImage({
  src,
  alt,
  width = 800,
  height = 600,
  quality = 80,
  className,
  style,
  objectFit = 'cover',
  objectPosition = 'center',
  priority = false,
  fallbackSrc = '/heroes/stun.png',
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src) {
    return (
      <div
        className={`${className} bg-neutral-900/60`}
        style={style}
      />
    );
  }

  const imageToLoad = hasError ? fallbackSrc : src;
  const optimizedSrc = optimizeImageUrl(imageToLoad, { width, height, quality });

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
      onError={() => {
        if (!hasError) setHasError(true);
      }}
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
  fallbackSrc = '/stunchou.png',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackSrc?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src) {
    return (
      <div
        className={`${className} bg-gradient-to-b from-[#0a0d14] to-[#020408]`}
        style={style}
      />
    );
  }

  const imageToLoad = hasError ? fallbackSrc : src;
  const optimizedSrc = optimizeImageUrl(imageToLoad, {
    width: 1920,
    height: 1080,
    quality: 75,
  });

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={className}
      style={{ ...style, objectFit: 'cover' }}
      loading="lazy"
      onError={() => {
        if (!hasError) setHasError(true);
      }}
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
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    const initial = (alt || 'P').charAt(0).toUpperCase();
    return (
      <div
        className={`${className} rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center font-bold text-white/70 select-none`}
        style={{ width: size, height: size, fontSize: Math.max(12, Math.floor(size * 0.4)) }}
      >
        {initial}
      </div>
    );
  }

  const optimizedSrc = optimizeImageUrl(src, {
    width: size * 2, // 2x for retina displays
    height: size * 2,
    quality: 85,
  });

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={`${className} rounded-full`}
      style={{ width: size, height: size, objectFit: 'cover' }}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}
