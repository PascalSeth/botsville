/**
 * Round Robin Schedule Generator (Circle Method)
 * Works for any number of teams N >= 2.
 * If N is odd, adds a ghost "__BYE__" team so every team gets 1 bye week.
 */
export type MatchPair = [string, string];

export function generateRoundRobinSchedule(teamIds: string[]): MatchPair[][] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) {
    teams.push("__BYE__");
  }
  const n = teams.length;
  const rounds: MatchPair[][] = [];

  for (let round = 0; round < n - 1; round++) {
    const roundMatches: MatchPair[] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home !== "__BYE__" && away !== "__BYE__") {
        roundMatches.push([home, away]);
      }
    }
    rounds.push(roundMatches);
    // Rotate clockwise around index 0
    teams.splice(1, 0, teams.pop()!);
  }

  return rounds;
}
