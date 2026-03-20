# 🏆 Tournament System - Quick Reference

## 📦 What's New

### Database
- ✅ 6 new Prisma models (SeasonAwards, TeamSeasonRecord, TournamentGroup, TournamentGroupTeam, MatchMvp, TournamentMvp)
- ✅ Enhanced Match model with bracket fields (bracketType, nextMatchId, loserNextId, bracketPosition)
- ✅ New BracketType enum (WINNER_BRACKET, LOSER_BRACKET, GRAND_FINAL, GROUP_STAGE)

### Components
- ✅ `BracketVisualization.tsx` - Tournament bracket display
- ✅ `TournamentAwardsDashboard.tsx` - Awards and MVP showcase

### API Endpoints (11 new endpoints)
- `POST/GET /api/mvps/match` - Match MVP tracking
- `GET /api/tournaments/[id]/mvps` - Tournament MVP rankings
- `POST/GET /api/seasons/[id]/awards` - Season awards
- `POST/GET /api/brackets/matches` - Bracket management
- `POST/GET /api/tournaments/[id]/groups` - Tournament groups
- `POST/GET /api/team-season-records` - Team season performance
- `POST/GET /api/seasons/[id]/complete` - Season completion & summary

---

## 🚀 Quick Start

### 1. Use the Bracket Visualization
```tsx
import BracketVisualization from '@/app/components/sections/BracketVisualization';

<BracketVisualization
  matches={bracketMatches}
  tournamentName="Tournament Name"
/>
```

### 2. Display Awards
```tsx
import TournamentAwardsDashboard from '@/app/components/sections/TournamentAwardsDashboard';

<TournamentAwardsDashboard
  seasonAwards={seasonAwardsData}
  tournamentMvps={mvpList}
/>
```

### 3. Complete a Season
```bash
curl -X POST /api/seasons/[seasonId]/complete
```

### 4. Set Up Bracket Matches
```bash
curl -X POST /api/brackets/matches \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "uuid",
    "bracketType": "WINNER_BRACKET",
    "round": 0,
    "bracketPosition": 1
  }'
```

---

## 📁 File Locations

### Components
- `/app/components/sections/BracketVisualization.tsx`
- `/app/components/sections/TournamentAwardsDashboard.tsx`

### API Endpoints
- `/app/api/mvps/match/route.ts`
- `/app/api/tournaments/[id]/mvps/route.ts`
- `/app/api/seasons/[id]/awards/route.ts`
- `/app/api/brackets/matches/route.ts`
- `/app/api/tournaments/[id]/groups/route.ts`
- `/app/api/team-season-records/route.ts`
- `/app/api/seasons/[id]/complete/route.ts`

### Documentation
- `/TOURNAMENT_SYSTEM_GUIDE.md` - Complete system guide
- `/prisma/schema.prisma` - Updated database schema

---

## 🎯 Key Concepts

### Bracket Types
- **WINNER_BRACKET** - Upper bracket in double elimination
- **LOSER_BRACKET** - Lower bracket for eliminated teams
- **GRAND_FINAL** - Grand finals matchup
- **GROUP_STAGE** - Round-robin groups

### Match Progression
- `nextMatchId` - Where the winner advances to
- `loserNextId` - Where the loser goes (double elimination)
- `bracketPosition` - Seeding/position within round

### MVP Tracking
- **Per-Match MVP** - One player MVP per match
- **Tournament MVP** - Aggregated MVP stats across tournament
- **Season MVP** - Best player of entire season

### Awards
- **Champion** - #1 ranked team at season end
- **Runner-Up** - #2 ranked team
- **Third Place** - #3 ranked team
- **Best Offender** - Most kills in season
- **Best Defender** - Best defensive plays (high assists, low deaths)
- **Season MVP** - Best overall player

---

## 🔐 Permissions

### Public Endpoints
- GET `/api/tournaments/[id]/mvps`
- GET `/api/seasons/[id]/awards`
- GET `/api/brackets/matches`
- GET `/api/tournaments/[id]/groups`
- GET `/api/team-season-records`
- GET `/api/seasons/[id]/summary`

### Admin Only (TOURNAMENT_ADMIN or SUPER_ADMIN)
- POST `/api/mvps/match`
- POST `/api/seasons/[id]/awards`
- POST `/api/brackets/matches`
- POST `/api/tournaments/[id]/groups`
- POST `/api/team-season-records`
- POST `/api/seasons/[id]/complete`

### REFEREE Access
- POST `/api/mvps/match` (recording match MVPs)

---

## 💾 Database Queries

### Get tournament bracket
```prisma
matches = await prisma.match.findMany({
  where: {
    tournamentId: "xxx",
    bracketType: { not: null }
  },
  orderBy: [
    { bracketType: 'asc' },
    { round: 'asc' },
    { bracketPosition: 'asc' }
  ],
  include: {
    teamA: true,
    teamB: true,
    nextMatch: true
  }
})
```

### Get season awards
```prisma
awards = await prisma.seasonAwards.findUnique({
  where: { seasonId: "xxx" },
  include: {
    championTeam: true,
    seasonMvp: { include: { team: true } },
    bestOffender: true,
    bestDefender: true
  }
})
```

### Get team season record
```prisma
record = await prisma.teamSeasonRecord.findUnique({
  where: { teamId_seasonId: { teamId: "xxx", seasonId: "xxx" } },
  include: { team: true, season: true }
})
```

---

## 🧪 Testing Checklist

- [ ] Bracket visualization displays all rounds correctly
- [ ] Match progression (winner advancing to nextMatchId)
- [ ] MVP recording creates MatchMvp and updates TournamentMvp
- [ ] Season completion auto-selects correct awards
- [ ] Tournament groups created and teams assigned
- [ ] Team season records track wins/losses/points separately
- [ ] Awards dashboard shows podium and MVP cards
- [ ] Admin audit logs created for admin actions
- [ ] All 401/403 validation working
- [ ] Bracket filters working (group stage, winner bracket, etc.)

---

## 🐛 Common Issues

### Match not showing in bracket
- Check `bracketType` is set (not null)
- Verify `round` and `bracketPosition` are set
- Confirm tournament exists

### MVP not updating
- Verify player participated in match
- Check admin role permissions
- Confirm matchId is valid

### Awards not auto-generating
- Ensure season has team standings
- Verify player MVP rankings exist
- Check match performances recorded

### Season completion failing
- Confirm all matches are marked COMPLETED
- Verify tournament status is COMPLETED
- Check for existing SeasonAwards (will upsert)

---

## 📊 Data Model Overview

```
Season
├── SeasonAwards (one per season)
│   ├── Champion Team
│   ├── Runner-Up Team
│   ├── 3rd Place Team
│   ├── Season MVP (Player)
│   ├── Best Offender (Player)
│   └── Best Defender (Player)
├── TeamSeasonRecord[] (one per team per season)
│   ├── Wins, Losses, Points
│   ├── Tier, Rank
│   └── Tournament Placements
└── Tournament[]
    ├── TournamentGroup[] (Group A, B, C...)
    │   └── TournamentGroupTeam[]
    ├── Match[]
    │   ├── Bracket Fields (type, round, position)
    │   ├── Progression Fields (nextMatchId, loserNextId)
    │   ├── MatchMvp (one per player per match)
    │   └── MatchPerformance[] (per player, per game)
    └── TournamentMvp[] (aggregated MVP stats)
```

---

## 🎓 Learning Resources

1. Start with `/TOURNAMENT_SYSTEM_GUIDE.md` for comprehensive overview
2. Check component files for React patterns and Tailwind styling
3. Review API routes for request/response formats
4. Use Prisma schema as reference for database relations
5. Check `/plans/` directory for architecture notes

---

## ⚡ Performance Tips

1. **Bracket Loading**: Use brackets endpoint with bracketType filter to reduce payload
2. **MVP Aggregation**: Tournament MVP stats are computed on-demand; cache if needed
3. **Season Completion**: Run during off-peak hours (heavy computation)
4. **Pagination**: Team season records should be paginated for large seasons

---

## 📞 Support

For issues or questions about the tournament system:
1. Check this quick reference
2. Consult `/TOURNAMENT_SYSTEM_GUIDE.md`
3. Review specific endpoint documentation in API route files
4. Check Prisma schema for data structure details
