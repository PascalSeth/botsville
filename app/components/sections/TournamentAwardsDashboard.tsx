'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Zap, Shield, Crown, Medal } from 'lucide-react';

/* ────────────────────────────────────────────────────────── */
/*  Types                                                     */
/* ────────────────────────────────────────────────────────── */
type TeamAward = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  seed?: number;
  points?: number;
};

type PlayerProfile = {
  id: string;
  ign: string;
  photo: string | null;
  role: string;
  team: {
    id: string;
    name: string;
    tag: string;
    logo: string | null;
  };
};

type SeasonAwardsData = {
  seasonId: string;
  seasonName: string;
  championTeam: TeamAward | null;
  runnerUpTeam: TeamAward | null;
  thirdPlaceTeam: TeamAward | null;
  seasonMvp: PlayerProfile | null;
  bestOffender: PlayerProfile | null;
  bestDefender: PlayerProfile | null;
  awardedAt: string;
};

type TournamentMvpData = {
  playerId: string;
  playerIgn: string;
  playerPhoto: string | null;
  playerRole: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  teamLogo: string | null;
  mvpCount: number;
  totalKills: number;
  totalAssists: number;
  totalDeaths: number;
  winRate: number;
  ranking: number;
};

/* ────────────────────────────────────────────────────────── */
/*  Pod icast position components                             */
/* ────────────────────────────────────────────────────────── */
const PodiumBase = () => (
  <svg className="w-full h-full" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet">
    <rect x="0" y="80" width="100" height="120" fill="url(#gradBronze)" />
    <rect x="100" y="20" width="100" height="180" fill="url(#gradGold)" rx="4" />
    <rect x="200" y="60" width="100" height="140" fill="url(#gradSilver)" />
    <defs>
      <linearGradient id="gradGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#facc15', stopOpacity: 0.8 }} />
        <stop offset="100%" style={{ stopColor: '#ca8a04', stopOpacity: 0.8 }} />
      </linearGradient>
      <linearGradient id="gradSilver" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#e5e7eb', stopOpacity: 0.8 }} />
        <stop offset="100%" style={{ stopColor: '#9ca3af', stopOpacity: 0.8 }} />
      </linearGradient>
      <linearGradient id="gradBronze" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#d97706', stopOpacity: 0.8 }} />
        <stop offset="100%" style={{ stopColor: '#b45309', stopOpacity: 0.8 }} />
      </linearGradient>
    </defs>
  </svg>
);

const PodiumCard = ({
  team,
  place,
  position,
}: {
  team: TeamAward | null;
  place: 1 | 2 | 3;
  position: 'left' | 'center' | 'right';
}) => {
  if (!team) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="h-24 flex items-center justify-center">
          <div className={`text-center ${
            place === 1 ? 'h-full bg-gradient-to-b from-yellow-400/20 to-yellow-600/20' :
            place === 2 ? 'h-5/6 bg-gradient-to-b from-gray-300/20 to-gray-500/20' :
            'h-2/3 bg-gradient-to-b from-orange-400/20 to-orange-600/20'
          } w-20 rounded-t-lg border border-white/20 flex items-center justify-center`}>
            <span className="text-white/20 text-xs font-bold">TBD</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-white/30">{place}</div>
          <div className="text-xs text-white/20 font-semibold">No Team</div>
        </div>
      </motion.div>
    );
  }

  const colors = {
    1: 'from-yellow-400/20 to-yellow-600/20 border-yellow-500/40',
    2: 'from-gray-300/20 to-gray-500/20 border-gray-400/40',
    3: 'from-orange-400/20 to-orange-600/20 border-orange-500/40',
  };

  const heights = {
    1: 'h-28',
    2: 'h-24',
    3: 'h-20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (3 - place) * 0.1 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="relative">
        {team.logo ? (
          <motion.div
            className={`w-20 h-20 rounded-full border-4 border-white/40 overflow-hidden ${heights[place]} bg-linear-to-br ${colors[place]} backdrop-blur-sm flex items-center justify-center`}
            whileHover={{ scale: 1.05 }}
          >
            <Image
              src={team.logo}
              alt={team.name}
              fill
              className="object-cover"
            />
          </motion.div>
        ) : (
          <div
            className={`w-20 h-20 rounded-full border-4 border-white/40 flex items-center justify-center text-2xl font-black text-white/40 bg-linear-to-br ${colors[place]} backdrop-blur-sm ${heights[place]}`}
          >
            {team.tag.slice(0, 2).toUpperCase()}
          </div>
        )}
        
        {/* Place badge */}
        <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-lg font-black ${
          place === 1 ? 'bg-yellow-500/30 text-yellow-200' :
          place === 2 ? 'bg-gray-400/30 text-gray-100' :
          'bg-orange-500/30 text-orange-100'
        }`}>
          {place}
        </div>
      </div>

      <div className="text-center">
        <h4 className="text-sm font-bold text-white truncate max-w-24">{team.name}</h4>
        <p className="text-xs text-white/50 font-mono">{team.tag.toUpperCase()}</p>
        {team.points && (
          <p className="text-xs text-white/60 font-semibold mt-1">{team.points} pts</p>
        )}
      </div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  MVP Card                                                  */
/* ────────────────────────────────────────────────────────── */
const MvpCard = ({ player, title, icon: Icon }: {
  player: PlayerProfile | null;
  title: string;
  icon: React.ReactNode;
}) => {
  if (!player) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-lg bg-white/3 border border-white/10 p-4 flex flex-col items-center gap-3"
      >
        <div className="text-white/30">{Icon}</div>
        <div className="text-center">
          <p className="text-xs text-white/40 font-semibold">{title}</p>
          <p className="text-xs text-white/30 mt-1">No Award</p>
        </div>
      </motion.div>
    );
  }

  const roleColors: Record<string, string> = {
    EXP: 'bg-red-500/20 text-red-300',
    JUNGLE: 'bg-green-500/20 text-green-300',
    MID: 'bg-blue-500/20 text-blue-300',
    GOLD: 'bg-yellow-500/20 text-yellow-300',
    ROAM: 'bg-purple-500/20 text-purple-300',
  };

  const roleColor = roleColors[player.role] || 'bg-white/10 text-white/70';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="rounded-lg bg-linear-to-br from-white/5 to-white/2 border border-white/20 p-4 flex flex-col gap-3 cursor-pointer hover:border-white/40 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-white/70">{Icon}</div>
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider">{title}</h4>
          </div>
          <p className="text-sm font-bold text-white truncate">{player.ign}</p>
          <p className="text-xs text-white/60">{player.team.name}</p>
        </div>
        {player.photo && (
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/20 shrink-0">
            <Image
              src={player.photo}
              alt={player.ign}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
      <div className={`inline-flex items-center gap-1 w-fit text-xs font-semibold px-2 py-1 rounded-full ${roleColor}`}>
        <span>{player.role}</span>
      </div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Tournament MVP Table                                      */
/* ────────────────────────────────────────────────────────── */
const TournamentMvpTable = ({ mvps, isLoading }: {
  mvps: TournamentMvpData[];
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border border-white/20 border-t-white" />
      </div>
    );
  }

  if (mvps.length === 0) {
    return (
      <div className="text-center py-8 text-white/50">
        <p className="text-sm">No tournament MVP data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mvps.slice(0, 5).map((mvp, idx) => (
        <motion.div
          key={mvp.playerId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/3 border border-white/10 hover:border-white/20 transition-colors"
        >
          <div className="text-lg font-black text-white/40 min-w-6 text-center">
            {mvp.ranking}
          </div>
          {mvp.playerPhoto ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/20">
              <Image
                src={mvp.playerPhoto}
                alt={mvp.playerIgn}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/20 flex items-center justify-center text-xs font-bold text-white/40">
              {mvp.playerIgn.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{mvp.playerIgn}</p>
            <p className="text-xs text-white/50">{mvp.teamName} • {mvp.playerRole}</p>
          </div>
          <div className="text-right min-w-16">
            <div className="text-lg font-black text-amber-400">{mvp.mvpCount}</div>
            <div className="text-[10px] text-white/50 font-mono">MVPs</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  Main Dashboard Component                                 */
/* ────────────────────────────────────────────────────────── */
export type TournamentAwardsDashboardProps = {
  seasonAwards?: SeasonAwardsData | null;
  tournamentMvps?: TournamentMvpData[];
  isLoading?: boolean;
  onViewMore?: () => void;
};

export const TournamentAwardsDashboard = ({
  seasonAwards,
  tournamentMvps = [],
  isLoading = false,
  onViewMore,
}: TournamentAwardsDashboardProps) => {
  const [activeTab, setActiveTab] = useState<'podium' | 'mvp' | 'tournament'>('podium');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Awards & Recognition</h2>
        {seasonAwards && (
          <p className="text-white/50 text-sm">{seasonAwards.seasonName}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('podium')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'podium'
              ? 'border-yellow-400 text-yellow-400'
              : 'border-transparent text-white/50 hover:text-white/70'
          }`}
        >
          <Trophy size={16} className="inline mr-2" />
          Season Podium
        </button>
        <button
          onClick={() => setActiveTab('mvp')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'mvp'
              ? 'border-yellow-400 text-yellow-400'
              : 'border-transparent text-white/50 hover:text-white/70'
          }`}
        >
          <Crown size={16} className="inline mr-2" />
          Season MVP
        </button>
        <button
          onClick={() => setActiveTab('tournament')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'tournament'
              ? 'border-yellow-400 text-yellow-400'
              : 'border-transparent text-white/50 hover:text-white/70'
          }`}
        >
          <Medal size={16} className="inline mr-2" />
          Tournament MVPs
        </button>
      </div>

      {/* Content */}
      <div className="min-h-96">
        <AnimatePresence mode="wait">
          {activeTab === 'podium' && (
            <motion.div
              key="podium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Podium */}
              <div className="flex justify-center items-flex-end gap-8 py-8">
                <PodiumCard
                  team={seasonAwards?.runnerUpTeam || null}
                  place={2}
                  position="left"
                />
                <PodiumCard
                  team={seasonAwards?.championTeam || null}
                  place={1}
                  position="center"
                />
                <PodiumCard
                  team={seasonAwards?.thirdPlaceTeam || null}
                  place={3}
                  position="right"
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'mvp' && (
            <motion.div
              key="mvp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <MvpCard
                player={seasonAwards?.seasonMvp || null}
                title="Season MVP"
                icon={<Crown size={20} />}
              />
              <MvpCard
                player={seasonAwards?.bestOffender || null}
                title="Best Offender"
                icon={<Flame size={20} />}
              />
              <MvpCard
                player={seasonAwards?.bestDefender || null}
                title="Best Defender"
                icon={<Shield size={20} />}
              />
            </motion.div>
          )}

          {activeTab === 'tournament' && (
            <motion.div
              key="tournament"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="rounded-lg bg-white/3 border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Zap size={20} className="text-amber-400" />
                  Top Tournament MVPs
                </h3>
                <TournamentMvpTable mvps={tournamentMvps} isLoading={isLoading} />
              </div>
              {onViewMore && tournamentMvps.length > 5 && (
                <button
                  onClick={onViewMore}
                  className="w-full py-2 rounded-lg border border-white/20 text-white/70 font-semibold hover:bg-white/5 hover:border-white/40 transition-colors text-sm"
                >
                  View All MVPs
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TournamentAwardsDashboard;
