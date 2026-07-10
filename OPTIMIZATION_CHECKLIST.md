# Image Optimization Implementation Checklist

## What We've Done ✅
- [x] Created `lib/image-utils.ts` - Image optimization functions
- [x] Created `app/components/OptimizedImage.tsx` - Optimized image components
- [x] Updated `app/(pages)/tournaments/page.tsx` - Uses optimized hero/banner images
- [x] Created documentation guides

## What You Should Do Next

### Quick Wins (5 minutes each)

Replace plain `<img>` tags with optimized components:

#### News Page
**File**: `app/(pages)/news/page.tsx`
**Status**: ⏳ Needs update
**Impact**: High (news thumbnails used frequently)
**Action**: Wrap `article.image` with `getThumbnailUrl()`
```typescript
// Before
src={article.image}

// After
src={getThumbnailUrl(article.image)}
```

#### Community Page
**File**: `app/(pages)/community/page.tsx`
**Status**: ⏳ Needs update
**Impact**: Medium (user avatars)
**Action**: Wrap user photos with `getProfilePhotoUrl()`

#### Teams Page
**File**: `app/(pages)/teams/page.tsx`
**Status**: ⏳ Needs update
**Impact**: High (team logos/banners)
**Action**: Wrap `team.logo` and `team.banner` with optimization

#### Heroes Page (Dashboard)
**File**: `app/dashboard/heroes/page.tsx`
**Status**: ⏳ Needs update
**Impact**: Medium (hero catalog images)
**Action**: Wrap `hero.image` with `getThumbnailUrl()`

### For Next.js Image Component (Already Optimized)
Pages using `Image` component are good:
- ✅ `app/(pages)/players/[id]/page.tsx` - Already using Image component
- ✅ `app/(pages)/news/[id]/page.tsx` - Already using Image component

But optimize the source URLs:
```typescript
// In these files, wrap image URLs with optimization function
import { getHeroImageUrl } from '@/lib/image-utils';

// Example for hero.imageUrl
src={getHeroImageUrl(hero.imageUrl)}
```

## Priority Order

### 🔴 Critical (Fix First - Highest Impact)
1. **News Page** - Article thumbnails (high traffic, large images)
2. **Community Page** - User avatars (many requests)
3. **Teams Page** - Team banners/logos (static, frequently cached)

### 🟡 Medium Priority
4. **Heroes Dashboard** - Hero catalog (can be cached longer)
5. **Leaderboard** - Player photos (paginated, medium traffic)

### 🟢 Low Priority
6. **Settings Page** - Single user avatar (low traffic)
7. **Audit Log** - Small icons (low traffic)

## Testing Your Changes

### Before Deployment
1. Update one page (e.g., News)
2. Run locally: `npm run dev`
3. Open page in browser
4. Open DevTools → Network tab
5. Check image file sizes (should be 100-300 KB instead of 2-3 MB)

### After Deployment
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Check **Storage** → **Bandwidth**
4. Wait 2-4 hours to see egress drop

## Copy-Paste Implementation

### Pattern for News/Thumbnails
```typescript
import { getThumbnailUrl } from '@/lib/image-utils';

// Existing code:
{article.image && (
  <Image src={article.image} alt={article.title} fill className="object-cover" />
)}

// Updated:
{article.image && (
  <Image src={getThumbnailUrl(article.image)} alt={article.title} fill className="object-cover" />
)}
```

### Pattern for Avatars
```typescript
import { getProfilePhotoUrl } from '@/lib/image-utils';

// Existing code:
<img src={user.photo} alt="" className="w-12 h-12 rounded-full" />

// Updated:
<img src={getProfilePhotoUrl(user.photo)} alt="" className="w-12 h-12 rounded-full" />
```

### Pattern for Hero Images
```typescript
import { getHeroImageUrl } from '@/lib/image-utils';

// Existing code:
<img src={hero.imageUrl} alt={hero.name} className="w-full h-full" />

// Updated:
<img src={getHeroImageUrl(hero.imageUrl)} alt={hero.name} className="w-full h-full" />
```

## Expected Results Timeline

| When | What | Expected |
|------|------|----------|
| **Immediately** | Images load same or faster | DevTools shows smaller files |
| **1-4 hours** | Supabase processes & caches | Egress usage drops |
| **1 day** | Billing cycle updates | See reduced egress in dashboard |
| **Next month** | Invoice reflects savings | 80-90% less cache egress charge |

## Estimated Impact

**If news page alone gets 1000 views/day:**
- Average image: 2.5 MB unoptimized
- Optimized: 300 KB
- Daily savings: 2.2 GB
- Monthly savings: 66 GB
- Cost savings: $13/month (Pro plan)

**Full app (all pages optimized):**
- Current: 60 GB/month = $12/month egress
- After: 6 GB/month = $1.2/month egress
- **Savings: ~$130/year**

## Questions?

Refer to:
- `IMAGE_OPTIMIZATION.md` - Detailed guide
- `REDIS_SETUP.md` - API caching (for non-image data)
- `lib/image-utils.ts` - Implementation details
