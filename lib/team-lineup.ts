export const TEAM_ROLES = ['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export class TeamActionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function parseTeamRole(value: unknown): TeamRole {
  if (typeof value !== 'string' || !TEAM_ROLES.includes(value.toUpperCase() as TeamRole)) {
    throw new TeamActionError('Choose a valid role: EXP, JUNGLE, MID, GOLD, or ROAM.');
  }
  return value.toUpperCase() as TeamRole;
}

export interface LineupPlayer {
  id: string;
  ign: string;
  role: string;
  isSubstitute: boolean;
}

export interface LineupCommand {
  role?: unknown;
  isSubstitute?: unknown;
  replacePlayerId?: unknown;
  swapRoleWithPlayerId?: unknown;
  swapRoleIfTaken?: unknown;
}

export type LineupChange = { id: string; role?: TeamRole; isSubstitute?: boolean };

// Calculate and validate the entire change before writing either player's record.
export function planLineupChange(players: LineupPlayer[], playerId: string, command: LineupCommand): LineupChange[] {
  const player = players.find(p => p.id === playerId);
  if (!player) throw new TeamActionError('Player not found on this team.', 404);
  if (command.isSubstitute !== undefined && typeof command.isSubstitute !== 'boolean') {
    throw new TeamActionError('isSubstitute must be a boolean.');
  }
  const role = command.role === undefined ? undefined : parseTeamRole(command.role);
  const changes: LineupChange[] = [];
  if (command.replacePlayerId && command.swapRoleWithPlayerId) {
    throw new TeamActionError('Choose either a substitution or a role swap.');
  }
  const partnerId = command.replacePlayerId || command.swapRoleWithPlayerId;
  if (partnerId) {
    const partner = players.find(p => p.id === partnerId);
    if (!partner || partner.id === player.id) throw new TeamActionError('Choose another player on this team.');
    if (command.swapRoleWithPlayerId) {
      if (player.isSubstitute || partner.isSubstitute) throw new TeamActionError('Role swaps require two starters. Use a substitution to bring in a sub.');
      if (role !== undefined || command.isSubstitute !== undefined) throw new TeamActionError('Submit role swaps separately from other lineup changes.');
      changes.push({ id: player.id, role: parseTeamRole(partner.role) }, { id: partner.id, role: parseTeamRole(player.role) });
    } else {
      if (player.isSubstitute === partner.isSubstitute) throw new TeamActionError('A substitution needs one starter and one substitute.');
      const incoming = player.isSubstitute ? player : partner;
      const outgoing = player.isSubstitute ? partner : player;
      if (command.isSubstitute !== undefined && command.isSubstitute !== !player.isSubstitute) throw new TeamActionError('The selected substitution conflicts with the requested position.');
      changes.push({ id: outgoing.id, isSubstitute: true }, { id: incoming.id, isSubstitute: false, role: role ?? parseTeamRole(outgoing.role) });
    }
  } else {
    const change: LineupChange = { id: player.id };
    if (role !== undefined) change.role = role;
    if (typeof command.isSubstitute === 'boolean') change.isSubstitute = command.isSubstitute;
    const willStart = change.isSubstitute === undefined ? !player.isSubstitute : !change.isSubstitute;
    const occupant = willStart && role ? players.find(p => p.id !== player.id && !p.isSubstitute && p.role === role) : undefined;
    if (occupant && command.swapRoleIfTaken === true) {
      if (player.isSubstitute) throw new TeamActionError('Select the starter to replace when promoting into an occupied role.');
      changes.push({ id: occupant.id, role: parseTeamRole(player.role) });
    }
    changes.push(change);
  }
  const result = players.map(p => ({ ...p, ...changes.find(c => c.id === p.id) }));
  const starters = result.filter(p => !p.isSubstitute);
  if (starters.length > 5) throw new TeamActionError('Starting lineup is full. Select a starter to replace.');
  const occupied = new Set<string>();
  for (const starter of starters) {
    if (occupied.has(starter.role)) throw new TeamActionError(`${starter.role} already has a starter. Choose an open role or make a substitution.`);
    occupied.add(starter.role);
  }
  return changes;
}

export function chooseJoinPosition(players: LineupPlayer[], role: TeamRole, requested?: unknown) {
  if (requested !== undefined && typeof requested !== 'boolean') throw new TeamActionError('isSubstitute must be a boolean.');
  const occupied = players.some(p => !p.isSubstitute && p.role === role);
  const full = players.filter(p => !p.isSubstitute).length >= 5;
  if (requested === false && (occupied || full)) throw new TeamActionError('That starting position is no longer open. Accept as a substitute or choose an open role.');
  return requested === undefined ? occupied || full : requested;
}
