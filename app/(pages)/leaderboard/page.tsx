'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Shield, Zap, Swords, Star, Target, Wind, Crown, TrendingUp, TrendingDown, Minus, Trophy, Flame, Loader2 } from 'lucide-react';

// ── MLBB Role meta ─────────────────────────────────────────
const ROLE_META: Record<string, { color: string; icon: React.ReactNode }> = {
  EXP:      { color: '#e8a000', icon: <Swords size={9} /> },
  JUNGLE:   { color: '#e84040', icon: <Zap    size={9} /> },
  MAGE:     { color: '#9b59b6', icon: <Star   size={9} /> },
  MARKSMAN: { color: '#27ae60', icon: <Target size={9} /> },
  ROAM:     { color: '#4a90d9', icon: <Shield size={9} /> },
  // Legacy roles for display
  Tank:      { color: '#4a90d9', icon: <Shield size={9} /> },
  Fighter:   { color: '#e8a000', icon: <Swords size={9} /> },
  Assassin:  { color: '#e84040', icon: <Zap    size={9} /> },
  Support:   { color: '#16a085', icon: <Wind   size={9} /> },
};

// ── API Response Types ─────────────────────────────────────────
interface ApiTeamStanding {
  id: string;
  rank: number;
  wins: number;
  losses: number;
  points: number;
  tier: string;
  team: {
    id: string;
    name: string;
    tag: string;
    logo: string | null;
    banner: string | null;
    color: string | null;
    region: string;
    totalPrizeMoney: number;
    trophies: string[];
  };
}

interface ApiPlayerRanking {
  id: string;
  rank: number;
  mvpCount: number;
  player: {
    id: string;
    ign: string;
    role: string;
    secondaryRole?: string;
    signatureHero?: string;
    photo: string | null;
    realName?: string;
    kda: number;
    winRate: number;
    mvpCount: number;
    user?: {
      id: string;
      ign: string;
      photo: string | null;
    };
    team?: {
      id: string;
      name: string;
      tag: string;
      color: string | null;
    };
  };
}

interface ApiHeroMeta {
  id: string;
  heroName: string;
  role: string;
  pickRate: number;
  banRate: number;
  winRate: number;
  tier: string;
}

// ── Helpers ────────────────────────────────────────────────
const RankDelta = ({ curr, prev }: { curr: number; prev: number }) => {
  const d = prev - curr;
  if (d > 0) return <span className="flex items-center gap-0.5 text-[#27ae60] text-[9px] font-bold"><TrendingUp size={9} />+{d}</span>;
  if (d < 0) return <span className="flex items-center gap-0.5 text-[#e84040] text-[9px] font-bold"><TrendingDown size={9} />{d}</span>;
  return <span className="text-[#333] text-[9px]"><Minus size={9} /></span>;
};

const StreakBadge = ({ wins, losses }: { wins: number; losses: number }) => {
  // Calculate streak based on recent form
  const streak = wins > losses ? `W${Math.min(wins, 5)}` : `L${Math.min(losses, 5)}`;
  const isWin = streak.startsWith('W');
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 tracking-wide"
      style={isWin
        ? { background: '#27ae6022', color: '#27ae60', border: '1px solid #27ae6044' }
        : { background: '#e8404022', color: '#e84040', border: '1px solid #e8404044' }
      }>
      {streak}
    </span>
  );
};

const TierBadge = ({ tier }: { tier: string }) => {
  const colors: Record<string, string> = { 'S_PLUS': '#e8a000', 'S+': '#e8a000', S: '#e8a000', A: '#4a90d9', B: '#9b59b6', C: '#555' };
  const c = colors[tier] ?? '#555';
  const displayTier = tier === 'S_PLUS' ? 'S+' : tier;
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5" style={{ color: c, background: `${c}22`, border: `1px solid ${c}44` }}>
      {displayTier}
    </span>
  );
};

type Tab = 'standings' | 'players' | 'meta';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('standings');
  const [standings, setStandings] = useState<ApiTeamStanding[]>([]);
  const [playerRankings, setPlayerRankings] = useState<ApiPlayerRanking[]>([]);
  const [heroMeta, setHeroMeta] = useState<ApiHeroMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const [standingsRes, playersRes, heroesRes] = await Promise.all([
        fetch('/api/leaderboards/teams'),
        fetch('/api/leaderboards/players'),
        fetch('/api/leaderboards/heroes'),
      ]);

      const [standingsData, playersData, heroesData] = await Promise.all([
        standingsRes.json(),
        playersRes.json(),
        heroesRes.json(),
      ]);

      if (standingsRes.ok && standingsData.standings) {
        setStandings(standingsData.standings);
      }
      if (playersRes.ok && playersData.rankings) {
        setPlayerRankings(playersData.rankings);
      }
      if (heroesRes.ok && heroesData.heroes) {
        setHeroMeta(heroesData.heroes);
      }
    } catch (err) {
      console.error('Error fetching leaderboards:', err);
      setError('Failed to load leaderboards');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08080d] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#e8a000]" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#08080d] flex items-center justify-center">
        <p className="text-[#e84040]">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08080d]">

      {/* Hero header */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-linear-to-br from-[#e8a000]/8 via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
          <div className="flex items-end justify-between gap-4">

            {/* Title */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} className="text-[#e8a000]" />
                <p className="text-[#e8a000] text-[10px] tracking-[0.4em] uppercase font-semibold">Ghana MLBB Season 5</p>
              </div>
              <h1 className="text-white font-black text-3xl md:text-4xl tracking-tight uppercase">Leaderboards</h1>
              <p className="text-[#444] text-sm mt-1 tracking-wide">APL · AFL · IESF Africa qualifier · Updated live</p>
            </div>

            {/* Right side: gif */}
            <div className="flex items-end gap-4 sm:gap-6 shrink-0">

              {/* ── Chou gif ── */}
              <div className="pointer-events-none select-none">
                <Image
                  src="/gif/chou.gif"
                  alt="Chou"
                  width={120}
                  height={120}
                  className="object-contain sm:w-[140px] sm:h-[140px] md:w-[180px] md:h-[180px]
                             drop-shadow-[0_0_32px_rgba(232,160,0,0.45)]"
                  unoptimized
                />
              </div>
            </div>
          </div>

          {/* Top 3 quick cards */}
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-lg">
            {standings.slice(0, 3).map((s, i) => {
              const teamColor = s.team.color || '#e8a000';
              return (
                <div key={s.id} className="bg-[#0f0f18] border border-white/[0.06] p-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: teamColor }} />
                  {i === 0 && <Crown size={10} className="absolute top-2 right-2 text-[#e8a000]" />}
                  <p className="text-[#444] text-[8px] uppercase tracking-widest mb-0.5">#{s.rank}</p>
                  <p className="text-white font-black text-[11px] uppercase tracking-wide leading-tight">{s.team.name}</p>
                  <p className="font-mono text-[10px] font-bold mt-1" style={{ color: teamColor }}>{s.points.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tabs */}
        <div className="flex items-center gap-0 mb-6 border-b border-white/[0.06] overflow-x-auto">
          {([
            { key: 'standings', label: 'Team Standings', icon: <Trophy size={11} /> },
            { key: 'players',   label: 'Player MVP',     icon: <Flame   size={11} /> },
            { key: 'meta',      label: 'Hero Meta',      icon: <Star    size={11} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-3 text-[11px] font-black tracking-[0.15em] uppercase transition-all border-b-2 -mb-px shrink-0"
              style={tab === t.key
                ? { color: '#e8a000', borderColor: '#e8a000' }
                : { color: '#444',    borderColor: 'transparent' }
              }>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── STANDINGS ── */}
        {tab === 'standings' && (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[32px_1fr_60px_60px_80px_60px_80px_80px] gap-3 px-3 mb-2">
                {['#', 'Team', 'W', 'L', 'Points', 'Streak', 'Prize', 'Tier'].map((h) => (
                  <p key={h} className="text-[#333] text-[9px] uppercase tracking-widest font-bold">{h}</p>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {standings.length === 0 ? (
                  <p className="text-[#333] text-center py-8">No standings available</p>
                ) : (
                  standings.map((s) => {
                    const teamColor = s.team.color || '#e8a000';
                    const prize = s.team.totalPrizeMoney > 0 ? `₵${(s.team.totalPrizeMoney / 100).toLocaleString()}` : '—';
                    return (
                      <div key={s.id}
                        className="grid grid-cols-[32px_1fr_60px_60px_80px_60px_80px_80px] gap-3 items-center px-3 py-3 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors group cursor-pointer"
                        style={{ borderLeft: s.rank <= 3 ? `2px solid ${teamColor}` : '2px solid transparent' }}>
                        <div className="flex flex-col items-center">
                          <span className="text-white font-black text-sm font-mono">
                            {s.rank <= 3 ? ['🥇','🥈','🥉'][s.rank-1] : s.rank}
                          </span>
                          <RankDelta curr={s.rank} prev={s.rank} />
                        </div>
                        <div>
                          <p className="text-white font-black text-[12px] uppercase tracking-wide group-hover:text-[#e8a000] transition-colors">{s.team.name}</p>
                          <p className="text-[#444] text-[9px] tracking-widest">{s.team.tag}</p>
                        </div>
                        <p className="text-[#27ae60] font-black text-sm">{s.wins}</p>
                        <p className="text-[#e84040] font-black text-sm">{s.losses}</p>
                        <p className="text-[#e8a000] font-black font-mono text-sm">{s.points.toLocaleString()}</p>
                        <StreakBadge wins={s.wins} losses={s.losses} />
                        <p className="text-[#666] text-[11px] font-mono">{prize}</p>
                        <TierBadge tier={s.tier} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PLAYERS ── */}
        {tab === 'players' && (
          <div className="flex flex-col gap-1 overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[32px_1fr_80px_80px_60px_60px_60px] gap-3 px-3 mb-2">
                {['#', 'Player', 'Role', 'Signature', 'KDA', 'Win%', 'MVP'].map((h) => (
                  <p key={h} className="text-[#333] text-[9px] uppercase tracking-widest font-bold">{h}</p>
                ))}
              </div>
              {playerRankings.length === 0 ? (
                <p className="text-[#333] text-center py-8">No player rankings available</p>
              ) : (
                playerRankings.map((p) => {
                  const roleMeta = ROLE_META[p.player.role] || ROLE_META.ROAM;
                  const photoUrl = p.player.photo || p.player.user?.photo || '/heroes/stun.png';
                  const teamTag = p.player.team?.tag || '—';
                  const winRatePercent = Math.round(p.player.winRate * 100);
                  return (
                    <div key={p.id}
                      className="grid grid-cols-[32px_1fr_80px_80px_60px_60px_60px] gap-3 items-center px-3 py-3 mb-1 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors group cursor-pointer">
                      <span className="text-white font-black text-sm font-mono text-center">
                        {p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : p.rank}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 overflow-hidden shrink-0 border border-white/10">
                          <Image src={photoUrl} alt={p.player.ign} fill className="object-cover grayscale group-hover:grayscale-0 transition-all" />
                        </div>
                        <div>
                          <p className="text-white font-black text-[12px] tracking-wide group-hover:text-[#e8a000] transition-colors">{p.player.ign}</p>
                          <p className="text-[#444] text-[9px] tracking-widest">{teamTag}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5 w-fit"
                        style={{ color: roleMeta.color, background: `${roleMeta.color}22`, border: `1px solid ${roleMeta.color}33` }}>
                        {roleMeta.icon} {p.player.role}
                      </span>
                      <p className="text-[#666] text-[11px] tracking-wide">{p.player.signatureHero || '—'}</p>
                      <p className="text-white font-black text-sm font-mono">{p.player.kda.toFixed(1)}</p>
                      <div>
                        <p className="text-[#27ae60] font-bold text-[11px] font-mono">{winRatePercent}%</p>
                        <div className="w-full h-0.5 bg-white/[0.05] mt-1 overflow-hidden">
                          <div className="h-full bg-[#27ae60]" style={{ width: `${winRatePercent}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Crown size={9} className="text-[#e8a000]" />
                        <p className="text-[#e8a000] font-black text-sm">{p.mvpCount}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── HERO META ── */}
        {tab === 'meta' && (
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <p className="text-[#444] text-[10px] tracking-[0.3em] uppercase mb-4">
                Ghana Season 5 · Most picked & banned heroes in competitive play
              </p>
              <div className="grid grid-cols-[1fr_80px_80px_80px_80px_60px] gap-4 px-3 mb-2">
                {['Hero', 'Role', 'Pick%', 'Ban%', 'Win%', 'Tier'].map((h) => (
                  <p key={h} className="text-[#333] text-[9px] uppercase tracking-widest font-bold">{h}</p>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {heroMeta.length === 0 ? (
                  <p className="text-[#333] text-center py-8">No hero meta data available</p>
                ) : (
                  heroMeta.map((h) => {
                    const roleMeta = ROLE_META[h.role] || ROLE_META.ROAM;
                    const pickRatePercent = Math.round(h.pickRate * 100);
                    const banRatePercent = Math.round(h.banRate * 100);
                    const winRatePercent = Math.round(h.winRate * 100);
                    return (
                      <div key={h.id}
                        className="grid grid-cols-[1fr_80px_80px_80px_80px_60px] gap-4 items-center px-3 py-3 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors cursor-pointer group">
                        <p className="text-white font-black text-[13px] tracking-wide group-hover:text-[#e8a000] transition-colors">{h.heroName}</p>
                        <span className="flex items-center gap-1 text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5 w-fit"
                          style={{ color: roleMeta.color, background: `${roleMeta.color}22`, border: `1px solid ${roleMeta.color}33` }}>
                          {roleMeta.icon} {h.role}
                        </span>
                        <div>
                          <p className="text-[#4a90d9] font-mono text-[11px] font-bold">{pickRatePercent}%</p>
                          <div className="w-full h-0.5 bg-white/[0.05] mt-1">
                            <div className="h-full bg-[#4a90d9]" style={{ width: `${pickRatePercent}%` }} />
                          </div>
                        </div>
                        <div>
                          <p className="text-[#e84040] font-mono text-[11px] font-bold">{banRatePercent}%</p>
                          <div className="w-full h-0.5 bg-white/[0.05] mt-1">
                            <div className="h-full bg-[#e84040]" style={{ width: `${banRatePercent}%` }} />
                          </div>
                        </div>
                        <div>
                          <p className="text-[#27ae60] font-mono text-[11px] font-bold">{winRatePercent}%</p>
                          <div className="w-full h-0.5 bg-white/[0.05] mt-1">
                            <div className="h-full bg-[#27ae60]" style={{ width: `${winRatePercent}%` }} />
                          </div>
                        </div>
                        <TierBadge tier={h.tier} />
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-[#2a2a2a] text-[9px] tracking-wide mt-6 text-center uppercase">
                Data sourced from APL S5 · AFL S5.1 · Ghana MLBB Open 2024 · IESF Africa Qualifier
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
