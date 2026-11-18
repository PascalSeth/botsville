export interface Player {
  id: string;
  ign: string;
  role: string;
  secondaryRole?: string | null;
  signatureHero?: string | null;
  photo: string | null;
  isSubstitute: boolean;
  kda: number;
  winRate: number;
  mvpCount: number;
  matchesPlayed: number;
  user?: { id: string; ign: string; photo: string | null } | null;
}

export interface Standing {
  rank: number;
  wins: number;
  losses: number;
  forfeits: number;
  points: number;
  streak: string | null;
  tier: string;
  season: { id: string; name: string; status: string };
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  region: string;
  color: string | null;
  logo: string | null;
  banner: string | null;
  isRecruiting?: boolean;
  captainId: string;
  trophies: string[];
  totalPrizeMoney: number;
  registeredAt: string;
  captain?: { id: string; ign: string; photo: string | null } | null;
  players: Player[];
  standings: Standing[];
  nameHistory: { oldName: string; oldTag: string; changedAt: string }[];
  registrations: {
    id: string;
    tournament?: { id: string; name: string; status: string };
    name?: string;
    status?: string;
  }[];
  _count?: { players: number; registrations: number; matchesAsA: number; matchesAsB: number };
}

export interface ReceivedInvite {
  id: string;
  teamId: string;
  status: string;
  role?: string | null;
}
