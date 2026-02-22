# Ghana MLBB Esports Platform — Complete Master Plan

---

## 1. Platform Identity

**Name:** Ghana MLBB — BE AGENDA (Botsville)
**Purpose:** Premier Mobile Legends: Bang Bang competition platform for Ghana
**Audience:** Competitive players, team captains, casual fans, tournament organizers
**Access:** Web-first, fully mobile responsive (PWA), no native app in v1
**Visibility:** Anyone can browse — account required only for team actions, registration, and submissions

---

## 2. User System

### Account Types

| Type | Description |
|------|-------------|
| Visitor | No account — can view everything publicly |
| Player | Registered account — can join teams, submit fan art |
| Captain | Player who created or was assigned a team |
| Admin | Platform staff with assigned role |

### User Fields
- Email and hashed password
- IGN (unique, changeable once per season — old IGNs logged in history)
- Main role preference (Tank, Fighter, Assassin, Mage, Marksman, Support)
- Profile photo
- Account status: `ACTIVE`, `SUSPENDED`, `BANNED`
- Suspension is time-limited with a reason and expiry date
- Ban is permanent and can only be applied by SUPER_ADMIN

### Password & Security
- Password reset via email link with 1-hour expiry
- Email verification on signup
- Session-based auth with JWT

### IGN History
Every time a player changes their IGN, the old one is saved with a timestamp. All historical records (match performance, awards, leaderboards) reference the player's UUID — not their IGN — so nothing breaks when it changes.

---

## 3. Admin Role System

Replaces the `isAdmin` boolean entirely. Each admin has one assigned role.

| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | Full access — manage all admins, ban users, override anything |
| TOURNAMENT_ADMIN | Create and manage tournaments, approve/reject registrations, manage brackets, record match results, resolve disputes |
| CONTENT_ADMIN | Write and publish news, manage scrim vault, approve/reject fan art |
| REFEREE | Enter match scores and upload screenshots for assigned matches only |

- The first SUPER_ADMIN is seeded manually in the database on deployment
- Only SUPER_ADMIN can assign or revoke admin roles
- Admin actions on sensitive operations are logged in an `AdminAuditLog` table

---

## 4. Seasons

Seasons are admin-defined — not tied to the calendar.

Each season has:
- Name (e.g. "Season 6")
- Start date and end date
- Status: `UPCOMING`, `ACTIVE`, `COMPLETED`

**What resets per season:** Team standings, player MVP rankings, streaks, season win/loss records
**What carries over:** Career stats, total prize money, trophies, all-time MVP count

Only one season can be ACTIVE at a time. The platform enforces this.

---

## 5. Teams

### Creation
Any registered player can create a team. They automatically become the captain.

### Team Fields
- Name (unique), Tag (3–5 chars, unique)
- Logo and banner image (required before tournament registration)
- Brand color (hex)
- Region: Accra, Kumasi, Takoradi, Tema, Cape Coast
- Status: `ACTIVE`, `INACTIVE`, `SUSPENDED`
- Captain (references a User)
- Season stats: wins, losses, points, streak, tier, rank, previous rank
- Career stats: total prize money (auto-calculated from prize distributions), trophies array

### Tier Classification
Determined by points at end of each season:

| Tier | Threshold |
|------|-----------|
| S | Top 10% |
| A | Top 25% |
| B | Top 50% |
| C | Everyone else |

### Team Status Rules
- Team is auto-set to `INACTIVE` if it has fewer than 5 active players for more than 30 days
- `SUSPENDED` is applied manually by TOURNAMENT_ADMIN or above with a reason and duration
- Suspended teams cannot register for tournaments or participate in active ones

### Name & Tag Changes
Allowed once per season. The old name and tag are snapshotted on the team record before the change so historical podiums and records remain accurate.

### Captain System
- Captain is stored as `captainId` on the team
- Captain can be transferred to any active starter on the team
- If the captain leaves the team, captaincy auto-transfers to the longest-serving starter
- If no starters remain, the team is auto-archived

---

## 6. Players & Roster

### Roster Rules
- Minimum 5 players (one per role: EXP, Jungle, Mage, Marksman, Roam)
- Maximum 7 players (5 starters + 2 substitutes)
- All IGNs must be unique across the entire platform
- Each role slot can only have one starter — duplicates must be substitutes

### Player Fields
- Link to User account (optional — a player can be added manually by captain before they register)
- Team reference
- IGN, real name, photo
- Primary role and secondary role
- Signature hero
- Starter or substitute flag
- Career stats: KDA, win rate, MVP count, total matches played (all computed from match data — never manually entered)

### Stats Philosophy
KDA and win rate are never typed in manually. They are always calculated from the `MatchPerformance` table. This means every match result must have player-level performance data entered before the match is officially closed.

### Leaving a Team
- A player can request to leave — captain must approve, or it auto-approves after 7 days
- Captain can remove a player at any time
- When a player leaves, their `Player` row is soft deleted — stats remain on their profile permanently as career history
- A player cannot be on two teams simultaneously

### Free Agents
Players not on any team can mark themselves as `OPEN_TO_OFFERS` on their profile. Captains can browse a free agent board filtered by role and region.

---

## 7. Recruitment — Both Systems

### System A — IGN Invite
1. Captain searches for any registered player by IGN
2. Captain sends an invite with an optional message
3. Invite expires after 48 hours
4. Target player receives an in-app notification
5. Player accepts → Player row created, linked to team
6. Player declines → Captain notified
7. If player already has 3 pending invites from different teams, new invites are blocked until they respond
8. Once a player accepts one team, all other pending invites are auto-cancelled
9. Duplicate invites to the same IGN from the same team are blocked

### System B — Invite Link
1. Captain generates a shareable link with a random 8-character code
2. Link has configurable max uses (1–10) and expires after 7 days
3. Captain can deactivate a link manually at any time
4. Only one active link per team at a time — generating a new one deactivates the previous
5. Player clicks link → logs in if not already → sees team details → clicks Join
6. System checks: valid code, not expired, uses remaining, player not already on a team, team not full, role slot available
7. On success → Player row created, usage logged, captain notified
8. The usage log records which player used which link and when

### Role Conflict Handling
If the role a joining player fills is already occupied by a starter, the system warns the captain and asks whether the new player should be added as a substitute or whether they want to reassign roles manually.

---

## 8. Tournaments

### Creation
Only TOURNAMENT_ADMIN and SUPER_ADMIN can create tournaments.

### Tournament Fields
- Name, subtitle, description
- Format: `SINGLE_ELIMINATION`, `DOUBLE_ELIMINATION`, `ROUND_ROBIN`, `SWISS_PLAYOFFS`
- Location: city name + online/LAN flag
- Start date and time (with timezone — Africa/Accra)
- Registration deadline (separate from start date)
- Max slots and current filled count
- Status: `UPCOMING`, `OPEN`, `CLOSED`, `ONGOING`, `COMPLETED`, `CANCELLED`
- Theme color, tags, hero image, banner
- Rules array
- Prize pool (total displayed string)
- Points formula (configurable — see Points section)

### Registration Flow
1. Team captain applies — team must have 5+ active players covering all roles and have logo/banner uploaded
2. Application creates a `TournamentRegistration` with status `PENDING`
3. TOURNAMENT_ADMIN approves or rejects with a reason
4. On approval — seed number assigned, filled count increments, team notified
5. On rejection — team notified with reason, can reapply if the issue is fixed before deadline
6. If slots are full — team goes to `Waitlist` with a position number
7. If an approved team withdraws, the next team on the waitlist is automatically offered the slot with a 24-hour response window

### Withdrawals
- Allowed up to 48 hours before tournament start
- After that — withdrawal is treated as a forfeit of all remaining matches
- No points penalty for valid pre-deadline withdrawals
- Forfeit results in 0 points and a loss on record

### Cancellation
- Admin cancels entire tournament — all registrations refunded their slot, all points from that tournament reversed, prize distributions cancelled

---

## 9. Brackets & Match Structure

### Group Stage
For Round Robin and Swiss formats, a `GroupStageStanding` table tracks:
- Group name/number
- Team
- Wins, losses, draws, points within the group
- Tiebreaker score

Group stage standings are completely separate from overall tournament leaderboard points.

### Matches
Each match row contains:
- Tournament reference
- Stage label (e.g. "Group A — Match 3", "Grand Finals — Game 2")
- Team A and Team B
- Scheduled time
- Status: `UPCOMING`, `LIVE`, `COMPLETED`, `FORFEITED`, `DISPUTED`
- Score for each team (games won in the series)
- Best-of format (1, 3, 5)
- Winner reference
- Elapsed time (for live display)
- Referee assigned to this match

### Score Entry Process
1. REFEREE or TOURNAMENT_ADMIN opens the match
2. Enters score for each game in the series
3. Must upload at least one screenshot per game as proof
4. After final game — enters per-player performance (kills, deaths, assists, MVP flag) for both teams
5. Submits — match status moves to `COMPLETED`
6. Both teams have a 2-hour window to raise a dispute

### Disputes
- Either team captain can flag a completed match result
- Dispute reason is required (text field)
- Match status moves to `DISPUTED`
- TOURNAMENT_ADMIN reviews screenshots and performance data
- Admin resolves: confirms original result, or corrects the score
- Resolution is logged with a reason
- If no dispute is raised within 2 hours, result is locked permanently

### No-Shows
- If a team fails to show up, the opposing team's captain can report a no-show
- TOURNAMENT_ADMIN reviews and confirms forfeit
- Forfeiting team gets a loss, no KDA or performance data recorded for that match

---

## 10. Match Performance Data

For every completed (non-forfeited) match, per-game performance is recorded for each player:

| Field | Description |
|-------|-------------|
| matchId | Which match |
| gameNumber | Game 1, 2, 3 etc. within the series |
| playerId | Which player |
| hero | Hero played that game |
| kills | Kill count |
| deaths | Death count |
| assists | Assist count |
| isMvp | Boolean — only one per game per team |
| side | Blue or Red side |

From this table the platform automatically calculates:
- Player KDA = (kills + assists) / max(deaths, 1)
- Player win rate = games won / games played
- Player MVP count = sum of isMvp

These are always computed — never stored as editable numbers.

---

## 11. Draft Data (Pick & Ban)

For every game within a match, pick and ban data is recorded:

| Field | Description |
|-------|-------------|
| matchId | Match reference |
| gameNumber | Which game in the series |
| phase | BAN_1, PICK_1, BAN_2, PICK_2 etc. |
| teamId | Which team made the selection |
| hero | Hero selected or banned |
| type | PICK or BAN |
| order | Selection order number |

This data feeds directly into the Hero Meta statistics — pick rates, ban rates, and win rates are calculated from this table per season. No manual entry of meta stats.

---

## 12. Points & Leaderboard System

### Points Formula
Each tournament has its own configurable points formula stored in a `PointsFormula` table:

| Placement | Example Points |
|-----------|---------------|
| 1st | 100 |
| 2nd | 70 |
| 3rd | 50 |
| 4th | 30 |
| 5th–8th | 15 |
| Group exit | 5 |

Admin sets these values when creating the tournament. Points are automatically awarded when results are finalized.

### Team Leaderboard
Ranked by points this season. Tracks: rank, previous rank, wins, losses, points, streak, tier, prize this season.

Streak is calculated from consecutive match results this season — not career.

### Player MVP Leaderboard
Ranked by MVP count this season. Also shows KDA and win rate, all computed from match data.

### Hero Meta Leaderboard
Calculated per season from draft data: pick rate, ban rate, win rate, meta tier (S+, S, A, B, C).

---

## 13. Prize Distribution

When a tournament concludes, TOURNAMENT_ADMIN records prize payouts:

- Each payout references: tournament, team, place, amount (numeric, currency field), paid status, date paid
- Team's total career prize is the sum of all their payout records — never a manually edited field
- Individual player prize shares are not tracked in v1 (handled offline within the team)

---

## 14. Notifications

### In-App Notifications
Every significant action creates a notification for the relevant user(s):

| Trigger | Who Gets Notified |
|---------|------------------|
| Team invite received | Invited player |
| Team invite accepted | Captain |
| Team invite declined | Captain |
| Invite link used | Captain |
| Tournament registration approved | Captain |
| Tournament registration rejected | Captain |
| Waitlist slot offered | Captain |
| Match scheduled | Both team captains |
| Match result submitted | Both team captains |
| Match disputed | Assigned referee + TOURNAMENT_ADMIN |
| Dispute resolved | Both team captains |
| Award received | Player |
| Fan art approved/rejected | Artist |

### Email Notifications
Sent only for high-priority events:
- Match reminder (24 hours before scheduled time)
- Tournament registration approved or rejected
- Tournament start announcement
- Account suspended or banned

### Preferences
Each user can toggle email notifications on or off per category. In-app notifications cannot be turned off — they are always delivered.

---

## 15. News & Content

### News
- Status: `DRAFT` or `PUBLISHED`
- Categories: `PATCH_NOTES`, `NEW_EVENT`, `NEW_HERO`
- Only CONTENT_ADMIN and above can create or publish
- Drafts are not visible to the public
- No version history in v1 — edits overwrite
- Reactions only (no comments in v1): 👍 🔥 💀 — stored as counts per article

### Scrim Vault
- Teams submit YouTube links with a title, matchup description, and thumbnail
- CONTENT_ADMIN reviews and approves or rejects with a reason
- Featured flag set by admin for homepage display
- Videos are always public once approved

### Fan Art
- Any registered user can submit
- CONTENT_ADMIN approves or rejects with a written reason
- Artists are notified of the decision and the reason
- Approved fan art is publicly visible
- Community members can report fan art — reports go to CONTENT_ADMIN for review
- Three reports on the same piece auto-flags it for urgent review

---

## 16. Best Role Awards

Awarded per season by TOURNAMENT_ADMIN based on performance data.

One award per role per season:
- EXP Laner of the Season
- Jungler of the Season
- Mage of the Season
- Marksman of the Season
- Roamer of the Season
- MVP of the Season (overall)

Award stores: role, title, player reference, signature hero used that season, season reference.

---

## 17. Complete Table List

**Core:**
`users`, `ign_history`, `admin_roles`, `admin_audit_log`, `seasons`

**Teams & Players:**
`teams`, `team_name_history`, `players`, `free_agents`

**Recruitment:**
`team_invites`, `team_invite_links`, `invite_link_usage`

**Tournaments:**
`tournaments`, `points_formulas`, `tournament_registrations`, `waitlists`, `prize_distributions`

**Matches:**
`matches`, `match_screenshots`, `match_disputes`, `match_performances`, `match_drafts`, `group_stage_standings`

**Leaderboards:**
`team_standings`, `player_mvp_rankings`, `hero_meta`

**Awards:**
`best_role_awards`

**Content:**
`news`, `news_reactions`, `scrim_vault`, `fan_art`, `fan_art_reports`

**Notifications:**
`notifications`, `notification_preferences`

---

## 18. Build Order

| Phase | Focus | Tables |
|-------|-------|--------|
| 1 | Foundation | users, ign_history, admin_roles, admin_audit_log, seasons |
| 2 | Teams | teams, team_name_history, players, free_agents |
| 3 | Recruitment | team_invites, team_invite_links, invite_link_usage, notifications, notification_preferences |
| 4 | Tournaments | tournaments, points_formulas, tournament_registrations, waitlists, prize_distributions |
| 5 | Matches | matches, match_screenshots, match_disputes, group_stage_standings |
| 6 | Performance | match_performances, match_drafts |
| 7 | Leaderboards | team_standings, player_mvp_rankings, hero_meta, best_role_awards |
| 8 | Content | news, news_reactions, scrim_vault, fan_art, fan_art_reports |

---

This is the complete platform. Every question has an answer, every edge case has a rule, every table has a clear purpose. Ready to write the final Prisma schema?