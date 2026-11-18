type InviteDirection = {
  fromUserId: string;
  toUserId?: string | null;
  toIGN: string;
  fromUser?: { ign: string } | null;
  team?: { captainId?: string | null } | null;
};

// Applications store the applicant's IGN and are addressed to the captain.
// Checking the sender's IGN also preserves direction after captaincy changes.
export function isTeamApplication(invite: InviteDirection): boolean {
  return invite.toIGN.toLowerCase() === invite.fromUser?.ign.toLowerCase()
    || Boolean(invite.team?.captainId && invite.toUserId === invite.team.captainId && invite.fromUserId !== invite.team.captainId);
}

export function invitedRole(message?: string | null): string | undefined {
  return message?.match(/(?:Preferred|Invited) Role:\s*(EXP|JUNGLE|MID|GOLD|ROAM)\b/i)?.[1].toUpperCase();
}
