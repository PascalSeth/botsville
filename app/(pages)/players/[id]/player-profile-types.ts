export interface PlayerInfo {
  id: string;
  ign: string;
  realName: string | null;
  role: string;
  secondaryRole: string | null;
  signatureHero: string | null;
  photo: string | null;
  rankBadge: string | null;
  region: string | null;
  headline: string | null;
  team: { id: string; name: string; tag: string; color: string | null; logo: string | null } | null;
}

export interface PlayerStats {
  totalGames: number;
  totalWins: number;
  winRate: number;
  overallKda: number;
  killPressure: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  mvpCount: number;
  maniacs: number;
  savages: number;
}

export interface HeroStat {
  hero: string;
  games: number;
  wins: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  imageUrl?: string | null;
}

export interface RecentGame {
  matchId: string;
  gameNumber: number;
  hero: string;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  isMvp: boolean;
  maniacs: number;
  savages: number;
  won: boolean;
  date: string;
  vsTeam: string | null;
  imageUrl?: string | null;
}

export interface ProfileData {
  player: PlayerInfo;
  stats: PlayerStats | null;
  heroBreakdown: HeroStat[];
  recentGames: RecentGame[];
}

export type HeroSort = 'games' | 'winRate' | 'kda' | 'kills';
export const HERO_SORT_LABELS: Record<HeroSort, string> = {
  games: 'Most played',
  winRate: 'Highest win rate',
  kda: 'Highest KDA',
  kills: 'Most kills',
};
