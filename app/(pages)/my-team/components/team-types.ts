export interface TeamPlayer {
  id: string;
  ign: string;
  role: string;
  photo: string | null;
  isSubstitute: boolean;
  user?: { id: string; ign: string; photo: string | null } | null;
}

export interface TeamRequest {
  id: string;
  kind?: 'APPLICATION' | 'INVITE';
  fromUserId?: string | null;
  toUserId?: string | null;
  toIGN?: string | null;
  message?: string | null;
  role?: string | null;
  sentAt?: string | null;
  expiresAt?: string | null;
  fromUser?: { id: string; ign: string; photo?: string | null; mainRole?: string | null } | null;
  toUser?: { id: string; ign: string; photo?: string | null } | null;
}

export interface PlayerUpdates {
  role?: string;
  isSubstitute?: boolean;
  photo?: string | null;
  replacePlayerId?: string;
  swapRoleWithPlayerId?: string;
  swapRoleIfTaken?: boolean;
}
