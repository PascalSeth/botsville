'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users } from 'lucide-react';

/* ────────────────────────────────────────────────────────── */
/*  Types                                                     */
/* ────────────────────────────────────────────────────────── */
type BracketType = 'WINNER_BRACKET' | 'LOSER_BRACKET' | 'GRAND_FINAL' | 'GROUP_STAGE';

type BracketTeam = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  seed?: number;
};

type BracketMatch = {
  id: string;
  teamA: BracketTeam | null;
  teamB: BracketTeam | null;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED';
  scheduledTime: string;
  bracketType: BracketType;
  bracketPosition: number;
  round: number;
  nextMatchId: string | null;
  loserNextId: string | null;
};

type BracketRound = {
  roundNumber: number;
  matches: BracketMatch[];
};

type BracketBranch = {
  bracketType: BracketType;
  rounds: BracketRound[];
  title: string;
  color: string;
};

/* ────────────────────────────────────────────────────────── */
/*  Bracket builders                                         */
/* ────────────────────────────────────────────────────────── */
const organizeBracket = (matches: BracketMatch[]): BracketBranch[] => {
  const branches: Record<BracketType, BracketMatch[]> = {
    WINNER_BRACKET: [],
    LOSER_BRACKET: [],
    GRAND_FINAL: [],
    GROUP_STAGE: [],
  };

  matches.forEach(m => {
    branches[m.bracketType]?.push(m);
  });

  const result: BracketBranch[] = [];

  if (branches.GROUP_STAGE.length > 0) {
    const grouped = groupByRound(branches.GROUP_STAGE);
    result.push({
      bracketType: 'GROUP_STAGE',
      rounds: grouped,
      title: 'Group Stage',
      color: 'from-blue-500/20 to-blue-600/20',
    });
  }

  if (branches.WINNER_BRACKET.length > 0) {
    const grouped = groupByRound(branches.WINNER_BRACKET);
    result.push({
      bracketType: 'WINNER_BRACKET',
      rounds: grouped,
      title: 'Winner Bracket',
      color: 'from-amber-500/20 to-amber-600/20',
    });
  }

  if (branches.LOSER_BRACKET.length > 0) {
    const grouped = groupByRound(branches.LOSER_BRACKET);
    result.push({
      bracketType: 'LOSER_BRACKET',
      rounds: grouped,
      title: 'Loser Bracket',
      color: 'from-slate-500/20 to-slate-600/20',
    });
  }

  if (branches.GRAND_FINAL.length > 0) {
    const grouped = groupByRound(branches.GRAND_FINAL);
    result.push({
      bracketType: 'GRAND_FINAL',
      rounds: grouped,
      title: 'Grand Finals',
      color: 'from-purple-500/20 to-purple-600/20',
    });
  }

  return result;
};

const groupByRound = (matches: BracketMatch[]): BracketRound[] => {
  const grouped = new Map<number, BracketMatch[]>();

  matches.forEach(m => {
    const round = m.round || 0;
    if (!grouped.has(round)) grouped.set(round, []);
    grouped.get(round)!.push(m);
  });

  const rounds: BracketRound[] = [];
  Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([roundNumber, matches]) => {
      rounds.push({
        roundNumber,
        matches: matches.sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0)),
      });
    });

  return rounds;
};

/* ────────────────────────────────────────────────────────── */
/*  Team card component                                       */
/* ────────────────────────────────────────────────────────── */
const BracketTeamCard = ({ team, score, won, isLive }: {
  team: BracketTeam | null;
  score: number;
  won: boolean;
  isLive: boolean;
}) => {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/10 min-w-32">
        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
          <Users size={14} className="text-white/40" />
        </div>
        <span className="text-xs text-white/40 font-medium">TBD</span>
      </div>
    );
  }

  const bgGradient = won ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5' : 'bg-gradient-to-br from-white/5 to-white/2';
  const liveIndicator = isLive ? 'animate-pulse' : '';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        won ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/5 border-white/15'
      } ${liveIndicator}`}
    >
      {team.logo ? (
        <div className="w-6 h-6 rounded bg-white/10 overflow-hidden shrink-0">
          <Image src={team.logo} alt={team.name} width={24} height={24} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[9px] font-bold text-white/60 max-w-4">
          {team.tag.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-white truncate">{team.name}</div>
        <div className="text-[10px] text-white/50 font-mono">{team.tag.toUpperCase()}</div>
      </div>
      <div className={`text-sm font-black font-mono tabular-nums ${won ? 'text-emerald-400' : 'text-white/60'}`}>
        {score}
      </div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Match component                                          */
/* ────────────────────────────────────────────────────────── */
const BracketMatchSlot = ({ match }: { match: BracketMatch }) => {
  const [expanded, setExpanded] = useState(false);

  const isCompleted = match.status === 'COMPLETED';
  const isLive = match.status === 'LIVE';
  const teamAWon = isCompleted && match.winnerId === match.teamA?.id;
  const teamBWon = isCompleted && match.winnerId === match.teamB?.id;

  const statusConfig = {
    UPCOMING: { label: 'Upcoming', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    LIVE: { label: 'LIVE', color: 'text-red-400', bg: 'bg-red-500/10' },
    COMPLETED: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    FORFEITED: { label: 'Forfeited', color: 'text-slate-400', bg: 'bg-slate-500/10' },
    DISPUTED: { label: 'Disputed', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  };

  const status = statusConfig[match.status];

  return (
    <motion.div
      layout
      className="flex flex-col gap-2 p-3 rounded-lg bg-white/3 border border-white/15 hover:border-white/30 transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
      whileHover={{ borderColor: 'rgba(255,255,255,0.3)' }}
    >
      {/* Match header */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${status.color}`}>
          {status.label}
        </span>
        {isLive && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] text-red-400 font-semibold">LIVE</span>
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="flex flex-col gap-1.5">
        <BracketTeamCard
          team={match.teamA}
          score={match.scoreA}
          won={teamAWon}
          isLive={isLive}
        />
        <BracketTeamCard
          team={match.teamB}
          score={match.scoreB}
          won={teamBWon}
          isLive={isLive}
        />
      </div>

      {/* Expand button */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2 pt-2 border-t border-white/10 text-[11px]"
          >
            <div className="flex justify-between">
              <span className="text-white/50">Match ID:</span>
              <span className="text-white/70 font-mono text-[10px]">{match.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Round:</span>
              <span className="text-white/70 font-semibold">{match.round}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Type:</span>
              <span className="text-white/70 font-semibold">{match.bracketType.replace('_', ' ')}</span>
            </div>
            {match.scheduledTime && (
              <div className="flex justify-between">
                <span className="text-white/50">Scheduled:</span>
                <span className="text-white/70 font-mono">
                  {new Date(match.scheduledTime).toLocaleDateString()}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Round component                                          */
/* ────────────────────────────────────────────────────────── */
const BracketRoundColumn = ({ round, bracketType }: { round: BracketRound; bracketType: BracketType }) => {
  const getRoundLabel = (round: number, bracketType: BracketType) => {
    if (bracketType === 'GROUP_STAGE') return `Group ${String.fromCharCode(65 + round)}`;
    if (bracketType === 'GRAND_FINAL') return 'Grand Final';
    if (round === 0) return 'Round 1';
    if (round === 1) return 'Semi Finals';
    if (round === 2) return 'Finals';
    return `Round ${round + 1}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-bold text-white/60 uppercase tracking-widest px-1">
        {getRoundLabel(round.roundNumber, bracketType)}
      </div>
      <div className="flex flex-col gap-3">
        {round.matches.map(match => (
          <BracketMatchSlot key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Branch component                                         */
/* ────────────────────────────────────────────────────────── */
const BracketBranchView = ({ branch }: { branch: BracketBranch }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg bg-linear-to-br ${branch.color} border border-white/10 p-6 backdrop-blur-sm space-y-6`}
    >
      {/* Branch header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <Trophy size={18} className="text-white/60" />
        <h3 className="text-lg font-bold text-white">{branch.title}</h3>
        <span className="ml-auto text-xs text-white/50 font-mono">
          {branch.rounds.reduce((sum, r) => sum + r.matches.length, 0)} matches
        </span>
      </div>

      {/* Rounds horizontal scroll */}
      <div className="overflow-x-auto pb-2 -mr-6 pr-6">
        <div className="flex gap-6 min-w-min">
          {branch.rounds.map(round => (
            <BracketRoundColumn key={`round-${round.roundNumber}`} round={round} bracketType={branch.bracketType} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Main component                                           */
/* ────────────────────────────────────────────────────────── */
export type BracketVisualizationProps = {
  matches: BracketMatch[];
  tournamentName?: string;
  isLoading?: boolean;
};

export const BracketVisualization = ({
  matches,
  tournamentName = 'Tournament',
  isLoading = false,
}: BracketVisualizationProps) => {
  const branches = useMemo(() => organizeBracket(matches), [matches]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border border-white/20 border-t-white" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-white/10 bg-white/3">
        <Trophy size={32} className="text-white/30 mb-3" />
        <p className="text-white/50 text-sm">No bracket data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{tournamentName} Bracket</h2>
        <p className="text-white/50 text-sm">
          {matches.length} total matches • {branches.length} bracket(s)
        </p>
      </div>

      {/* Branches */}
      <div className="space-y-6">
        {branches.map(branch => (
          <BracketBranchView key={branch.bracketType} branch={branch} />
        ))}
      </div>

      {/* Legend */}
      <div className="pt-4 border-t border-white/10 flex flex-wrap gap-4 text-[11px]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500/60" />
          <span className="text-white/60">Winner</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white/5 border border-white/20" />
          <span className="text-white/60">Upcoming</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white/60">Live</span>
        </div>
      </div>
    </div>
  );
};

export default BracketVisualization;
