# MLBB Ghana Community Feature Roadmap

## Objective
Build the highest-retention community platform for Mobile Legends players in Ghana by prioritizing identity, local competition, and daily interaction loops.

---

## What already exists in this repo
- Leaderboard page and APIs:
  - `app/(pages)/leaderboard/page.tsx`
  - `app/api/leaderboards/teams/route.ts`
  - `app/api/leaderboards/players/route.ts`
  - `app/api/leaderboards/heroes/route.ts`
- Authenticated user profile endpoint:
  - `app/api/users/profile/route.ts`
- Team/social foundation:
  - `app/(pages)/my-team/page.tsx`
  - `app/api/invites/*`, `app/api/free-agents/route.ts`
- Complete Prisma schema already includes strong esports/tournament entities.

This means we can ship quickly by extending, not rebuilding.

---

## Phase 1 (Must-Have, 2–3 weeks)

### 1) Custom Player Profiles
**Goal:** Give users identity and social proof.

#### Data model additions (Prisma)
- `User` (or new `UserProfileMeta`) fields:
  - `favoriteHero` (String)
  - `favoriteSkin` (String)
  - `rankBadge` (String or enum for ML tiers)
  - `region` (String; e.g. Accra/Kumasi/Takoradi/Tamale)
  - `headline` (optional short bio)
- Keep `mainRole` and `photo` from current model.
- Use computed stats for win rate where possible; if expensive, cache in profile summary table.

#### API
- Extend `GET/PUT app/api/users/profile/route.ts` to read/write new identity fields.
- Add validation for region + rank badge values.

#### UI
- Add edit/view profile card in `app/(pages)/my-team/page.tsx` or new profile page.
- Show: main hero, skin, rank badge, region, win rate, role.

---

### 2) Ghana Leaderboards (localized)
**Goal:** Strong local competition loop.

#### API updates
- Extend existing leaderboard endpoints with Ghana-focused slices:
  - Top Mythic Players (Ghana)
  - Highest Win Rate by Hero
  - Most Savage This Week
  - Best Tank in Ghana
- Add query options for `region=GH`, `period=weekly|season`, `role=TANK`.

#### Data requirements
- Track per-match player performance events:
  - savage count
  - role performance metrics
  - hero usage stats
- If these metrics are not in schema yet, add event/stat models and batch aggregations.

#### UI
- Keep current leaderboard tabs and add Ghana-specific cards/filters.
- Default landing state should be Ghana local rankings first.

---

### 3) Community Feed (highest impact)
**Goal:** Daily posting + reactions + comment loops.

#### New models
- `CommunityPost` (author, type, content, media, tags, createdAt)
- `CommunityReaction` (emoji/upvote/downvote, userId, postId)
- `CommunityComment` (threaded via parentId)
- `ContentReport` + moderation status fields

#### API (new)
- `app/api/community/posts/route.ts` (GET, POST)
- `app/api/community/posts/[id]/route.ts` (GET, PATCH, DELETE)
- `app/api/community/posts/[id]/reactions/route.ts`
- `app/api/community/posts/[id]/comments/route.ts`

#### UI
- New page: `app/(pages)/community/page.tsx`
- Feed composer for clip/meme/hot take/build screenshot
- Post cards with vote controls, emoji reactions, and threaded comments

---

### 4) Poll Section
**Goal:** Fast daily interactions.

#### New models
- `Poll`, `PollOption`, `PollVote`

#### API
- `app/api/polls/route.ts` (list/active/create)
- `app/api/polls/[id]/vote/route.ts`

#### UI
- Poll widget block in homepage and community page.
- One-vote-per-user per poll.

---

### 5) Rotating Trivia Card + XP
**Goal:** Lightweight gamification on homepage.

#### New models
- `TriviaFact` (question, reveal text, period, sourceType)
- `UserXpEvent` (reason, xp, metadata)

#### API
- `app/api/trivia/current/route.ts`
- `app/api/trivia/[id]/reveal/route.ts` (awards XP once per day)

#### UI
- Add homepage card in `app/(pages)/page.tsx`:
  - teaser -> click reveal -> XP toast/update

---

## Phase 2 (Engagement Features, 2–4 weeks)

### 6) Hero Main Pages
- Route: `app/(pages)/heroes/[slug]/page.tsx`
- Include:
  - community builds
  - top Ghana players on that hero
  - local win rate
  - comments

### 7) Clip of the Week
- Reuse community post type=`CLIP` + weekly scoring job.
- Add featured banner on homepage and profile badges for winners.

### 8) Ghana Squad Finder
- Extend `free-agents` + team discovery:
  - filters: rank, role, region
  - “Looking for squad” status
- Page: `app/(pages)/squad-finder/page.tsx`

### 9) Rank Grind Tracker
- Models: `RankSnapshot`, `RankGoal`
- Visual graph in profile/dashboard
- Streak and progress indicators

---

## Phase 3 (Viral/Fun Layer)

### Roast Section
- Community post mode with stricter moderation and report thresholds.

### Meme Generator
- Canvas tool with hero cutouts from `public/` assets.
- Export + post to community feed.

### Titles & Badges
- Badge engine based on milestones (e.g., hero usage, rank streaks, clip wins).

### Ghana Streamer Spotlight
- Weekly featured creator card + outbound links + clip embeds.

---

## Recommended technical sequence (lowest risk)
1. Extend profile model + API + UI
2. Community feed core (posts, reactions, comments)
3. Polls + trivia XP card
4. Leaderboard Ghana metrics expansions
5. Hero pages + clip of week
6. Squad finder + rank tracker
7. Meme/roast/badges virality layer

---

## Guardrails
- Add moderation tools before enabling roast/memes publicly.
- Add rate limits and anti-spam checks on post/comment/vote routes.
- Add role-based admin controls for content review.
- Start with server-side pagination/cursor APIs for feed scalability.

---

## Immediate next implementation ticket (suggested)
**Ticket:** “Custom Player Profile v1”
- Prisma migration for profile identity fields
- Extend `app/api/users/profile/route.ts` GET/PUT
- Add profile panel UI on `app/(pages)/my-team/page.tsx`
- Add validation + tests for profile update payload

Expected output: visible identity upgrade + fast win for retention in under 1 sprint.
