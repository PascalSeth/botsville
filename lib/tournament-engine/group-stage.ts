import { generateRoundRobinSchedule, MatchPair } from "./round-robin";

export type GroupAssignment = {
  groupName: string;
  teamIds: string[];
};

export type GroupStageSchedule = {
  groups: GroupAssignment[];
  groupMatches: {
    groupName: string;
    round: number;
    teamAId: string;
    teamBId: string;
  }[];
};

/**
 * Distributes team IDs into groups using Snake Seeding or Random distribution.
 */
export function divideTeamsIntoGroups(
  seedOrderedTeamIds: string[],
  numGroups: number,
  drawMode: "SEEDED" | "RANDOM" | "MANUAL" = "SEEDED",
  manualGroups?: Record<string, string[]>
): GroupAssignment[] {
  if (numGroups < 2) {
    throw new Error("Group stage requires at least 2 groups");
  }

  if (drawMode === "MANUAL" && manualGroups) {
    return Object.entries(manualGroups).map(([groupName, teamIds]) => ({
      groupName,
      teamIds,
    }));
  }

  const groupNames = Array.from({ length: numGroups }, (_, i) =>
    String.fromCharCode(65 + i)
  ); // Group A, Group B, Group C...

  const groups: GroupAssignment[] = groupNames.map((name) => ({
    groupName: `Group ${name}`,
    teamIds: [],
  }));

  const teamsToDistribute = [...seedOrderedTeamIds];

  if (drawMode === "RANDOM") {
    // Fisher-Yates shuffle
    for (let i = teamsToDistribute.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teamsToDistribute[i], teamsToDistribute[j]] = [
        teamsToDistribute[j],
        teamsToDistribute[i],
      ];
    }
    // Round-robin assignment
    teamsToDistribute.forEach((teamId, index) => {
      groups[index % numGroups].teamIds.push(teamId);
    });
  } else {
    // Snake Seeding (1, 2, 3, 3, 2, 1, 1, 2, 3...)
    let groupIdx = 0;
    let forward = true;

    teamsToDistribute.forEach((teamId) => {
      groups[groupIdx].teamIds.push(teamId);
      if (forward) {
        if (groupIdx === numGroups - 1) {
          forward = false;
        } else {
          groupIdx++;
        }
      } else {
        if (groupIdx === 0) {
          forward = true;
        } else {
          groupIdx--;
        }
      }
    });
  }

  return groups;
}

/**
 * Builds the complete schedule of round-robin matches for all groups.
 */
export function buildGroupStageSchedule(
  groups: GroupAssignment[]
): GroupStageSchedule {
  const groupMatches: GroupStageSchedule["groupMatches"] = [];

  for (const group of groups) {
    const rounds = generateRoundRobinSchedule(group.teamIds);
    rounds.forEach((roundMatches, roundIdx) => {
      roundMatches.forEach(([teamAId, teamBId]: MatchPair) => {
        groupMatches.push({
          groupName: group.groupName,
          round: roundIdx + 1,
          teamAId,
          teamBId,
        });
      });
    });
  }

  return { groups, groupMatches };
}
