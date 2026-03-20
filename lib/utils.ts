import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * MLBB Professional Tournament Points System
 * Used in MPL, MSC, and M-Series tournaments
 */
export type MatchResult = '2-0' | '2-1' | '1-2' | '0-2' | 'FORFEIT_WIN' | 'FORFEIT_LOSS';

export function calculateMatchPoints(result: MatchResult, pointsPerWin: number = 3): number {
  switch (result) {
    case '2-0':
      return pointsPerWin; // Dominant win: 3 points
    case '2-1':
      return Math.floor(pointsPerWin * 0.667); // Winning close match: 2 points (for 3 PPW)
    case '1-2':
      return Math.floor(pointsPerWin * 0.333); // Losing close match: 1 point (for 3 PPW)
    case '0-2':
      return 0; // Clear loss: 0 points
    case 'FORFEIT_WIN':
      return pointsPerWin; // Forfeit win counts as full points
    case 'FORFEIT_LOSS':
      return -1; // Forfeit loss is penalized
    default:
      return 0;
  }
}

/**
 * Get readable description of match result
 */
export function getMatchResultLabel(result: MatchResult): string {
  const labels: Record<MatchResult, string> = {
    '2-0': '2-0 Win',
    '2-1': '2-1 Win',
    '1-2': '1-2 Loss',
    '0-2': '0-2 Loss',
    'FORFEIT_WIN': 'Forfeit Win (+3)',
    'FORFEIT_LOSS': 'Forfeit Loss (-1)',
  };
  return labels[result];
}

/**
 * Calculate team standing points from match results
 * Returns { wins, draws, losses, forfeits, totalPoints }
 */
export interface TeamStandingPoints {
  wins: number;
  twoOneWins: number;
  oneTwoLosses: number;
  losses: number;
  forfeits: number;
  totalPoints: number;
}

export function calculateTeamPoints(
  matches: Array<{ result: MatchResult; pointsPerWin?: number }>,
  pointsPerWin: number = 3
): TeamStandingPoints {
  const standing: TeamStandingPoints = {
    wins: 0,
    twoOneWins: 0,
    oneTwoLosses: 0,
    losses: 0,
    forfeits: 0,
    totalPoints: 0,
  };

  for (const match of matches) {
    const ptsPerWin = match.pointsPerWin || pointsPerWin;
    standing.totalPoints += calculateMatchPoints(match.result, ptsPerWin);

    switch (match.result) {
      case '2-0':
        standing.wins++;
        break;
      case '2-1':
        standing.twoOneWins++;
        break;
      case '1-2':
        standing.oneTwoLosses++;
        break;
      case '0-2':
        standing.losses++;
        break;
      case 'FORFEIT_WIN':
        standing.wins++;
        break;
      case 'FORFEIT_LOSS':
        standing.forfeits++;
        break;
    }
  }

  return standing;
}
