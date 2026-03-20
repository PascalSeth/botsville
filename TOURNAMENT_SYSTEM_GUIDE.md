# Tournament System - Complete Implementation Guide

## 🎯 Overview

Botsville now has a complete esports tournament system with bracket visualization, MVP tracking, seasonal awards, and comprehensive tournament management capabilities.

---

## 📊 Database Schema Changes

### New Models Added

#### 1. **SeasonAwards**
- Tracks season champions, runners-up, and MVPs
- One award per season (unique constraint on seasonId)
- Fields:
  - `championTeamId`: Winning team
  - `runnerUpTeamId`: 2nd place team
  - `thirdPlaceTeamId`: 3rd place team
  - `seasonMvpId`: Best player of the season
  - `bestOffenderId`: Player with most kills
  - `bestDefenderId`: Player with best defensive plays

#### 2. **TeamSeasonRecord**
- Tracks team performance for each season separately
- Enables season-specific leaderboards and stats
- Fields:
  - `wins`, `losses`, `forfeits`, `draws`: Match performance
  - `points`: Season points (can go negative)
  - `rank`: Current ranking in season
  - `tier`: Competitive tier (S, A, B, C)
  - `tournamentPlaces`: JSON field with tournament placements
  - `premiumPoints`: Points from major tournaments
  - `streak`: Current win/loss streak (e.g., "W5", "L2")

#### 3. **TournamentGroup**
- Manages group stage divisions (Group A, Group B, etc.)
- Links groups to tournaments
- Supports multiple groups per tournament

#### 4. **TournamentGroupTeam**
- Junction table: Assigns teams to groups
- Enables group stage team assignments

#### 5. **MatchMvp**
- Per-match MVP tracking
- Stores detailed MVP data in JSON field
- One MVP per player per match

#### 6. **TournamentMvp**
- Aggregated MVP statistics for a tournament
- Tracks: MVP count, kills, assists, deaths, win rate
- Optional ranking (1st, 2nd, 3rd, etc.)

### Enhanced Models

#### Match Model - Bracket Fields Added
```typescript
bracketType: BracketType?     // WINNER_BRACKET, LOSER_BRACKET, GRAND_FINAL, GROUP_STAGE
nextMatchId: String?          // Winner advances here
loserNextId: String?          // Loser advances here (double elimination)
bracketPosition: Int?         // Seeding/position in bracket
```

#### Season Model
- Added relations to `TeamSeasonRecord[]` and `SeasonAwards?`

#### Tournament Model  
- Added relations to `TournamentGroup[]` and `TournamentMvp[]`

#### Team Model
- Added relations for season records and awards

#### Player Model
- Added relations to MVP track models

---

## 🎨 New Components

### 1. **BracketVisualization Component**
Location: `/app/components/sections/BracketVisualization.tsx`

Features:
- Displays tournament brackets in organized columns
- Supports multiple bracket types:
  - Group Stage
  - Winner Bracket
  - Loser Bracket (double elimination)
  - Grand Finals
- Shows match details on click
- Real-time match status (LIVE, UPCOMING, COMPLETED)
- Team logos and scores
- Expandable match info cards

Usage:
```tsx
import BracketVisualization from '@/app/components/sections/BracketVisualization';

<BracketVisualization
  matches={bracketMatches}
  tournamentName="The International 2026"
  isLoading={false}
/>
```

### 2. **TournamentAwardsDashboard Component**
Location: `/app/components/sections/TournamentAwardsDashboard.tsx`

Features:
- Three-tab interface:
  - **Season Podium**: Champion, runner-up, 3rd place visualization
  - **Season MVP**: Best player, best offender, best defender cards
  - **Tournament MVPs**: Top MVP performers with stats table

Usage:
```tsx
import TournamentAwardsDashboard from '@/app/components/sections/TournamentAwardsDashboard';

<TournamentAwardsDashboard
  seasonAwards={seasonAwardsData}
  tournamentMvps={mvpsList}
  isLoading={false}
  onViewMore={() => navigateToFullMvpList()}
/>
```

---

## 🔌 New API Endpoints

### MVP Management

#### `POST /api/mvps/match`
Record a match MVP award (admin only)
```json
{
  "matchId": "uuid",
  "playerId": "uuid",
  "mvpData": {
    "mvp": true,
    "kills": 12,
    "assists": 5,
    "deathsAvoided": 3
  }
}
```

#### `GET /api/tournaments/[id]/mvps`
Get tournament MVP rankings (public)
```json
Response:
[
  {
    "playerId": "uuid",
    "playerIgn": "ProPlayer123",
    "playerPhoto": "url",
    "playeRole": "MID",
    "teamId": "uuid",
    "teamName": "Team Alpha",
    "mvpCount": 5,
    "totalKills": 45,
    "totalAssists": 38,
    "totalDeaths": 12,
    "winRate": 0.85,
    "ranking": 1
  }
]
```

### Season Awards

#### `GET /api/seasons/[id]/awards`
Get season awards (public)

#### `POST /api/seasons/[id]/awards`
Set season awards manually (admin only)
```json
{
  "championTeamId": "uuid",
  "runnerUpTeamId": "uuid",
  "thirdPlaceTeamId": "uuid",
  "seasonMvpId": "uuid",
  "bestOffenderId": "uuid",
  "bestDefenderId": "uuid"
}
```

### Bracket Management

#### `POST /api/brackets/matches`
Create/update bracket match with progression (admin only)
```json
{
  "matchId": "uuid",
  "bracketType": "WINNER_BRACKET",
  "nextMatchId": "uuid",
  "loserNextId": "uuid",
  "bracketPosition": 1,
  "round": 0
}
```

#### `GET /api/brackets/matches?tournamentId=xxx&bracketType=WINNER_BRACKET`
Get all bracket matches (public)

### Tournament Groups

#### `POST /api/tournaments/[id]/groups`
Create tournament group (admin only)
```json
{
  "name": "Group A",
  "description": "First round group",
  "teams": ["teamId1", "teamId2", "teamId3", "teamId4"]
}
```

#### `GET /api/tournaments/[id]/groups`
Get all groups for tournament (public)

### Team Season Records

#### `GET /api/team-season-records?seasonId=xxx&teamId=xxx`
Get team's season-specific records (public)

#### `POST /api/team-season-records`
Create/update team season record (admin only)

### Season Management

#### `POST /api/seasons/[id]/complete`
Complete a season and generate awards (admin only)
- Automatically determines top 3 teams
- Selects season MVP
- Generates best offender and defender
- Creates audit log

#### `GET /api/seasons/[id]/summary`
Get comprehensive season summary (public)
```json
Response:
{
  "id": "uuid",
  "name": "Season 6",
  "status": "COMPLETED",
  "dates": { "start": "...", "end": "..." },
  "tournaments": [...],
  "statistics": {
    "totalTournaments": 5,
    "totalMatches": 24,
    "completedMatches": 24,
    "matchCompletion": 100
  },
  "standings": [...],
  "topPlayers": [...],
  "awards": {...}
}
```

---

## 🎮 Usage Examples

### Example 1: Set Up a Double Elimination Bracket

```typescript
// 1. Create tournament
const tournament = await prisma.tournament.create({
  data: {
    name: "Regional Finals",
    format: "DOUBLE_ELIMINATION",
    seasonId: "season-id"
  }
});

// 2. Create bracket matches manually via API
const match1 = await fetch('/api/brackets/matches', {
  method: 'POST',
  body: JSON.stringify({
    matchId: 'match-id-1',
    bracketType: 'WINNER_BRACKET',
    round: 0,
    bracketPosition: 1
  })
});

// 3. Link matches for progression
const match2 = await fetch('/api/brackets/matches', {
  method: 'POST',
  body: JSON.stringify({
    matchId: 'match-id-2',  // Winner bracket finals
    bracketType: 'WINNER_BRACKET',
    round: 1,
    bracketPosition: 1,
    nextMatchId: 'grand-final-id'  // Points to grand final
  })
});

// 4. Visualize bracket
<BracketVisualization matches={allMatches} tournamentName="Regional Finals" />
```

### Example 2: Award Season MVP

```typescript
// 1. Complete season (auto-determines awards)
const completed = await fetch('/api/seasons/season-id/complete', {
  method: 'POST'
});

// 2. Override with manual awards if needed
await fetch('/api/seasons/season-id/awards', {
  method: 'POST',
  body: JSON.stringify({
    seasonMvpId: 'player-id',
    bestOffenderId: 'player-id-2',
    bestDefenderId: 'player-id-3'
  })
});

// 3. Display awards
<TournamentAwardsDashboard
  seasonAwards={awardData}
  tournamentMvps={mvpList}
/>
```

### Example 3: Track Team Season Performance

```typescript
// Create season record
await fetch('/api/team-season-records', {
  method: 'POST',
  body: JSON.stringify({
    teamId: 'team-id',
    seasonId: 'season-id',
    wins: 12,
    losses: 3,
    points: 36,
    tier: 'S',
    streak: 'W5'
  })
});

// Retrieve season records
const records = await fetch(
  '/api/team-season-records?teamId=team-id&seasonId=season-id'
);
```

---

## 🛠️ Admin Workflows

### Setting Up a Tournament with Brackets

1. **Create Tournament** (required fields: name, format, seasonId)
2. **Create Groups** (if applicable): `/api/tournaments/[id]/groups`
3. **Create Matches** with bracket fields
4. **Set Bracket Progression**: Link matches via `nextMatchId` and `loserNextId`
5. **Start Matches** and update statuses
6. **Record MVPs** after matches complete
7. **Complete Season** and generate awards

### Season Completion Workflow

1. **Verify all matches completed**
2. **Call POST /api/seasons/[id]/complete**
   - Auto-determines champion (top ranked team)
   - Selects MVP (top player)
   - Identifies best offender (most kills)
   - Identifies best defender (best kill-death-assist ratio)
3. **(Optional) Override awards** via POST `/api/seasons/[id]/awards`
4. **Display podium** in TournamentAwardsDashboard

---

## 📈 Data Structure Examples

### Bracket Match Data
```typescript
type BracketMatch = {
  id: string;
  teamA: { id, name, tag, logo, seed? };
  teamB: { id, name, tag, logo, seed? };
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  bracketType: 'WINNER_BRACKET' | 'LOSER_BRACKET' | 'GRAND_FINAL' | 'GROUP_STAGE';
  bracketPosition: number;      // Seeding position
  round: number;                // Round in bracket
  nextMatchId: string | null;   // Where winner goes
  loserNextId: string | null;   // Where loser goes (double elim)
};
```

### Season Awards Data
```typescript
type SeasonAwardsData = {
  seasonId: string;
  seasonName: string;
  championTeam: TeamAward | null;
  runnerUpTeam: TeamAward | null;
  thirdPlaceTeam: TeamAward | null;
  seasonMvp: PlayerProfile | null;
  bestOffender: PlayerProfile | null;
  bestDefender: PlayerProfile | null;
  awardedAt: string;
};
```

---

## ✅ Features Completed

- [x] **Bracket Progression Fields** - Match model now supports bracket navigation
- [x] **Bracket Visualization** - Interactive React component showing full tournament brackets
- [x] **Season Awards System** - Champions, runners-up, MVPs with database tracking
- [x] **MVP Tracking** - Per-match and per-tournament MVP recording
- [x] **Team Season Records** - Season-specific performance tracking
- [x] **Tournament Groups** - Group stage management and team assignments
- [x] **Awards Dashboard** - Beautiful UI showing podium and MVP cards
- [x] **Season Completion** - Automated awards generation with manual override option
- [x] **API Endpoints** - Complete REST endpoints for all operations
- [x] **Admin Workflows** - Secure admin-only operations with role verification

---

## 🔮 Future Enhancements

- [ ] Bracket auto-generation from registrations
- [ ] Live bracket updates via WebSockets
- [ ] Replay system for iconic moments
- [ ] Fan voting for MVP awards
- [ ] Statistics dashboards (hero picks, role comparisons)
- [ ] Historical bracket archive
- [ ] Custom bracket templates
- [ ] AI-powered match predictions
- [ ] Social sharing for bracket results

---

## 🐛 Error Handling

All endpoints include:
- Proper HTTP status codes (401 for auth, 403 for permissions, 404 for not found)
- Descriptive error messages
- Admin audit logging for sensitive operations
- Transaction support for data consistency

---

## 📝 Notes

- All seasons/tournaments use UTC timestamps
- Team season records are separate from career totals (preserved forever)
- MVP awards are optional (can be left null if not determined)
- Bracket progression supports both single and double elimination
- Group stage can coexist with elimination brackets in same tournament
