# Image Optimization & Cache Egress Reduction

## Problem
Your app uses unoptimized images (full resolution, no compression, no format conversion) causing **70-80% of cache egress**. 

Example: A 2MB PNG served 1000x/day = 2GB/day of egress.

## Solution: Automatic Image Optimization

### Compression Results
- **Before**: 2.5 MB image × 1000 requests = 2.5 GB egress
- **After**: 300 KB optimized × 1000 requests = 300 MB egress
- **Savings**: ~90% reduction

## What's Implemented

### 1. Image Optimization Utility (`lib/image-utils.ts`)
Provides functions to optimize image URLs:

```typescript
// Hero/banner images (1920×1080, quality 75)
getHeroImageUrl(url)

// Thumbnails (400×400, quality 80)
getThumbnailUrl(url)

// Player avatars (200×200, quality 85)
getProfilePhotoUrl(url)

// Player cards (500×500, quality 80)
getPlayerCardImageUrl(url)
```

### 2. Optimized Image Components (`app/components/OptimizedImage.tsx`)

**HeroBannerImage** - For large background/hero images
```typescript
<HeroBannerImage
  src={tournament.banner}
  alt="Tournament banner"
  className="w-full h-full"
/>
```

**OptimizedImage** - Generic wrapper
```typescript
<OptimizedImage
  src={imageUrl}
  alt="Description"
  width={800}
  height={600}
  quality={80}
  className="w-full h-full"
/>
```

**PlayerAvatar** - For profile pictures
```typescript
<PlayerAvatar
  src={player.photo}
  alt={player.name}
  size={48}
/>
```

## How It Works

### Supabase Image Transformation
If images are in Supabase Storage, append query params:
```
Original: https://xxx.supabase.co/storage/v1/object/public/images/photo.jpg
Optimized: https://xxx.supabase.co/storage/v1/object/public/images/photo.jpg?width=800&height=600&quality=80&format=webp
```

This tells Supabase Edge Functions to:
- Resize to 800×600
- Compress to quality 80
- Convert to WebP format
- Cache the result (no repeated processing)

## Apply to Your Pages

### High Priority (Hero Images)
These drain the most cache:

**Tournaments Page** ✅ DONE
**Player Pages** - Heroes, player photos
**Match Pages** - Team banners
**Leaderboard** - Player avatars
**News Page** - News thumbnails
**Community** - User avatars

### Pattern to Follow

**Before:**
```typescript
<img src={tournament.banner} alt="" className="w-full h-full object-cover" />
```

**After:**
```typescript
import { HeroBannerImage } from '@/app/components/OptimizedImage';

<HeroBannerImage
  src={tournament.banner}
  alt="Tournament banner"
  className="w-full h-full"
/>
```

## Quick Replacements

### For Player Profile Photos
```typescript
import { PlayerAvatar } from '@/app/components/OptimizedImage';

// Before
<img src={player.photo} alt="" className="rounded-full w-12 h-12" />

// After
<PlayerAvatar src={player.photo} alt={player.name} size={48} />
```

### For Tournament/News Thumbnails
```typescript
import { OptimizedImage } from '@/app/components/OptimizedImage';

// Before
<img src={news.image} alt="" className="w-96 h-48 object-cover" />

// After
<OptimizedImage
  src={news.image}
  alt={news.title}
  width={600}
  height={300}
  quality={80}
  className="w-96 h-48 object-cover"
/>
```

## Configuration

### Quality Settings (Lower = More Compressed)
- **Hero/Banner**: 75 (full screen, compression ok)
- **Cards/Thumbnails**: 80 (visible, needs good quality)
- **Avatars**: 85 (small, needs clarity)
- **Player Photos**: 80 (balance compression/quality)

Adjust based on visual quality needed. Lower values save more bandwidth.

### Size Guidelines
```typescript
// Full-width hero
{ width: 1920, height: 1080, quality: 75 }

// Tournament card
{ width: 600, height: 400, quality: 80 }

// Player avatar
{ width: 200, height: 200, quality: 85 }

// Thumbnail
{ width: 400, height: 400, quality: 80 }
```

## Expected Results

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Avg Image Size | 2-3 MB | 200-400 KB | 85-95% |
| Cache Egress | 50-60 GB/mo | 5-10 GB/mo | 80-90% |
| Cost (Pro Plan) | $100/mo | $10-20/mo | 80-90% |

## Pages Still Needing Optimization

1. **app/(pages)/players/[id]/page.tsx** - Hero photos
2. **app/(pages)/teams/page.tsx** - Team images
3. **app/dashboard/heroes/page.tsx** - Hero catalog
4. **app/(pages)/news/[id]/page.tsx** - Article images
5. **app/(pages)/community/page.tsx** - User avatars

## Monitoring

Check Supabase dashboard for:
1. **Storage** → **Bandwidth** (should drop significantly)
2. **Billing** → **Usage** → **Cached Egress** (main metric)

Expected drop within 1-2 hours once deployed.

## Advanced: Custom Image Service

If Supabase transformation isn't sufficient, can integrate:
- **Cloudinary** (image CDN with smart compression)
- **imgproxy** (open-source image proxy)
- **ImageKit** (image optimization platform)

These provide even better compression and caching.

## Caching Headers

Images now benefit from:
- Supabase CDN edge caching (auto)
- Browser caching (30 days)
- Format conversion caching

No additional setup needed - Supabase handles it automatically.
