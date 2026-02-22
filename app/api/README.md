# API Routes Documentation

## Phase 1: Foundation APIs

### Users

#### `POST /api/users/register`
Register a new user account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "ign": "PlayerName",
  "mainRole": "MAGE"
}
```

**Response:** `201 Created`
```json
{
  "message": "Account created successfully",
  "user": { ... }
}
```

#### `GET /api/users/profile`
Get current user's profile.

**Response:** `200 OK`
```json
{
  "id": "...",
  "email": "...",
  "ign": "...",
  "mainRole": "...",
  "photo": "...",
  "adminRole": { ... },
  "player": { ... },
  "captainOf": [ ... ]
}
```

#### `PUT /api/users/profile`
Update current user's profile.

**Body:**
```json
{
  "photo": "url",
  "mainRole": "FIGHTER",
  "openToOffers": true
}
```

#### `POST /api/users/ign/change`
Change user's IGN (once per season).

**Body:**
```json
{
  "newIGN": "NewPlayerName"
}
```

#### `GET /api/users/ign/history?userId=...`
Get IGN change history for a user.

---

### Admin Roles

#### `GET /api/admin/roles`
List all admin roles (SUPER_ADMIN only).

**Response:** `200 OK`
```json
{
  "id": "...",
  "userId": "...",
  "role": "TOURNAMENT_ADMIN",
  "user": { ... }
}
```

#### `POST /api/admin/roles`
Assign admin role to a user (SUPER_ADMIN only).

**Body:**
```json
{
  "userId": "...",
  "role": "TOURNAMENT_ADMIN"
}
```

#### `DELETE /api/admin/roles/[userId]`
Revoke admin role from a user (SUPER_ADMIN only).

---

### Admin Audit Log

#### `GET /api/admin/audit-log?page=1&limit=50&actorId=...&targetType=...&targetId=...`
View admin audit logs (Admin only).

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `actorId` - Filter by admin user ID
- `targetType` - Filter by target type
- `targetId` - Filter by target ID

---

### Seasons

#### `GET /api/seasons?status=ACTIVE`
List all seasons.

**Query Parameters:**
- `status` - Filter by status (UPCOMING, ACTIVE, COMPLETED)

#### `POST /api/seasons`
Create a new season (Admin only).

**Body:**
```json
{
  "name": "Season 6",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "status": "UPCOMING"
}
```

#### `GET /api/seasons/[id]`
Get season by ID.

#### `PUT /api/seasons/[id]`
Update season (Admin only).

**Body:**
```json
{
  "name": "Season 6",
  "startDate": "...",
  "endDate": "...",
  "status": "ACTIVE"
}
```

---

## Phase 2: Teams APIs

### Teams

#### `GET /api/teams?status=ACTIVE&region=Accra&limit=50&skip=0`
List all teams.

**Query Parameters:**
- `status` - Filter by status
- `region` - Filter by region
- `limit` - Items per page (default: 50)
- `skip` - Skip items (default: 0)

#### `POST /api/teams`
Create a new team (Authenticated user).

**Body:**
```json
{
  "name": "Team Name",
  "tag": "TAG",
  "region": "Accra",
  "color": "#FF0000",
  "logo": "url",
  "banner": "url"
}
```

**Response:** `201 Created`
```json
{
  "message": "Team created successfully",
  "team": { ... }
}
```

#### `GET /api/teams/[id]`
Get team details by ID.

**Response:** Includes captain, players, and counts.

#### `PUT /api/teams/[id]`
Update team (Captain or Admin only).

**Body:**
```json
{
  "name": "New Name",
  "tag": "NEW",
  "region": "Kumasi",
  "color": "#00FF00",
  "logo": "url",
  "banner": "url"
}
```

**Note:** Name/tag changes are logged in history.

#### `GET /api/teams/[id]/name-history`
Get team name/tag change history.

---

### Players

#### `GET /api/teams/[id]/players`
Get all players on a team.

#### `POST /api/teams/[id]/players`
Add player to team (Captain or Admin only).

**Body:**
```json
{
  "ign": "PlayerIGN",
  "userId": "...", // Optional - link to user account
  "role": "EXP",
  "secondaryRole": "JUNGLE",
  "signatureHero": "HeroName",
  "photo": "url",
  "realName": "Real Name",
  "isSubstitute": false
}
```

**Validation:**
- Max 7 players per team
- Each role can only have one starter
- IGN must be unique across platform

#### `PUT /api/teams/[id]/players/[playerId]`
Update player (Captain, Admin, or Player themselves).

**Body:**
```json
{
  "role": "JUNGLE",
  "secondaryRole": "EXP",
  "signatureHero": "...",
  "photo": "...",
  "realName": "...",
  "isSubstitute": true
}
```

#### `DELETE /api/teams/[id]/players/[playerId]`
Remove player from team (Captain, Admin, or Player themselves).

**Note:** If captain leaves, captaincy auto-transfers to longest-serving starter.

---

### Free Agents

#### `GET /api/free-agents?mainRole=MAGE&limit=50&skip=0`
Browse free agents (players open to offers).

**Query Parameters:**
- `mainRole` - Filter by main role
- `limit` - Items per page
- `skip` - Skip items

#### `PUT /api/free-agents`
Toggle free agent status (Authenticated user).

**Body:**
```json
{
  "openToOffers": true
}
```

**Note:** Cannot mark as free agent while on a team.

---

## Authentication

All routes except public GET endpoints require authentication via NextAuth session.

**Headers:**
```
Cookie: next-auth.session-token=...
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Authorization

- **Public:** Anyone can access
- **Authenticated:** Requires valid session
- **Admin:** Requires admin role (any type)
- **SUPER_ADMIN:** Requires SUPER_ADMIN role

## Validation

- **Email:** Standard email format
- **IGN:** 3-20 characters (alphanumeric, spaces, underscores)
- **Team Tag:** 3-5 uppercase alphanumeric characters
- **Hex Color:** Format `#RRGGBB`
- **Region:** Must be one of: Accra, Kumasi, Takoradi, Tema, Cape Coast
- **Password:** Minimum 8 characters



