'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Shield, Zap, Swords, Star, Target, Wind, Crown, TrendingUp, TrendingDown, Minus, Trophy, Flame, Loader2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// ── MLBB Role meta ─────────────────────────────────────────
const ROLE_META: Record<string, { color: string; icon: React.ReactNode }> = {
  EXP:      { color: '#e8a000', icon: <Swords size={9} /> },
  JUNGLE:   { color: '#e84040', icon: <Zap    size={9} /> },
  MAGE:     { color: '#9b59b6', icon: <Star   size={9} /> },
  MARKSMAN: { color: '#27ae60', icon: <Target size={9} /> },
  ROAM:     { color: '#4a90d9', icon: <Shield size={9} /> },
  Tank:      { color: '#4a90d9', icon: <Shield size={9} /> },
  Fighter:   { color: '#e8a000', icon: <Swords size={9} /> },
  Assassin:  { color: '#e84040', icon: <Zap    size={9} /> },
  Support:   { color: '#16a085', icon: <Wind   size={9} /> },
  MID:       { color: '#3b82f6', icon: <Star   size={9} /> },
  GOLD:      { color: '#e8a000', icon: <Target size={9} /> },
};

// ── API Response Types ────────────────────────────────────
interface ApiTeamStanding {
  id: string; rank: number; wins: number; losses: number; points: number; tier: string;
  team: { id: string; name: string; tag: string; logo: string | null; banner: string | null; color: string | null; region: string; totalPrizeMoney: number; trophies: string[] };
}
interface ApiPlayerRanking {
  id: string; rank: number; mvpCount: number;
  player: { id: string; ign: string; role: string; secondaryRole?: string; signatureHero?: string; photo: string | null; realName?: string; kda: number; winRate: number; mvpCount: number; user?: { id: string; ign: string; photo: string | null }; team?: { id: string; name: string; tag: string; color: string | null } };
}
interface ApiHeroMeta { id: string; heroName: string; role: string; pickRate: number; banRate: number; winRate: number; tier: string; }

interface SeasonStanding {
  id: string; rank: number; previousRank: number | null; wins: number; losses: number; forfeits: number; points: number; streak: string | null; tier: string;
  team: { id: string; name: string; tag: string; logo: string | null; color: string | null };
}
interface MonthlyRow {
  id: string; rank: number | null; wins: number; losses: number; forfeits: number; points: number;
  team: { id: string; name: string; tag: string; logo: string | null; color: string | null };
}
interface ActiveSeason { id: string; name: string; status: string; }

// ── Helpers ────────────────────────────────────────────────
const RankDelta = ({ curr, prev }: { curr: number; prev: number | null }) => {
  if (!prev || prev === 0) return <span className="text-[#333] text-[9px]"><Minus size={9} /></span>;
  const d = prev - curr;
  if (d > 0) return <span className="flex items-center gap-0.5 text-[#27ae60] text-[9px] font-bold"><TrendingUp size={9} />+{d}</span>;
  if (d < 0) return <span className="flex items-center gap-0.5 text-[#e84040] text-[9px] font-bold"><TrendingDown size={9} />{d}</span>;
  return <span className="text-[#333] text-[9px]"><Minus size={9} /></span>;
};
const StreakBadge = ({ streak }: { streak: string | null }) => {
  if (!streak) return <span className="text-[#333] text-[9px]">—</span>;
  const isWin = streak.startsWith('W');
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 tracking-wide"
      style={isWin ? { background: '#27ae6022', color: '#27ae60', border: '1px solid #27ae6044' } : { background: '#e8404022', color: '#e84040', border: '1px solid #e8404044' }}>
      {streak}
    </span>
  );
};
const TierBadge = ({ tier }: { tier: string }) => {
  const colors: Record<string, string> = { 'S_PLUS': '#e8a000', 'S+': '#e8a000', S: '#e8a000', A: '#4a90d9', B: '#9b59b6', C: '#555' };
  const c = colors[tier] ?? '#555';
  return <span className="text-[9px] font-black px-1.5 py-0.5" style={{ color: c, background: `${c}22`, border: `1px solid ${c}44` }}>{tier === 'S_PLUS' ? 'S+' : tier}</span>;
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type Tab = 'season' | 'standings' | 'players' | 'meta';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('season');
  const [seasonTab, setSeasonTab] = useState<'cumulative' | 'monthly'>('cumulative');

  // Season data
  const [activeSeason, setActiveSeason] = useState<ActiveSeason | null>(null);
  const [seasonStandings, setSeasonStandings] = useState<SeasonStanding[]>([]);
  const [monthlyData, setMonthlyData] = useState<Record<string, MonthlyRow[]>>({});
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');

  // Legacy leaderboard data
  const [standings, setStandings] = useState<ApiTeamStanding[]>([]);
  const [playerRankings, setPlayerRankings] = useState<ApiPlayerRanking[]>([]);
  const [heroMeta, setHeroMeta] = useState<ApiHeroMeta[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [seasonsRes, standingsRes, playersRes, heroesRes] = await Promise.all([
        fetch('/api/seasons?status=ACTIVE'),
        fetch('/api/leaderboards/teams'),
        fetch('/api/leaderboards/players'),
        fetch('/api/leaderboards/heroes'),
      ]);
      const [seasonsData, standingsData, playersData, heroesData] = await Promise.all([
        seasonsRes.json(), standingsRes.json(), playersRes.json(), heroesRes.json(),
      ]);

      // Active season standings
      const seasons: ActiveSeason[] = Array.isArray(seasonsData) ? seasonsData : (seasonsData?.data ?? []);
      const active = seasons[0] ?? null;
      setActiveSeason(active);

      if (active) {
        const sRes = await fetch(`/api/seasons/${active.id}/standings`);
        const sData = await sRes.json();
        setSeasonStandings(sData?.data?.cumulative ?? []);
        const grouped: Record<string, MonthlyRow[]> = sData?.data?.monthly ?? {};
        setMonthlyData(grouped);
        const keys = Object.keys(grouped).sort();
        if (keys.length) setSelectedMonthKey(keys[keys.length - 1]);
      }

      if (standingsData?.standings) setStandings(standingsData.standings);
      if (playersData?.rankings) setPlayerRankings(playersData.rankings);
      if (heroesData?.heroes) setHeroMeta(heroesData.heroes);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthKeys = Object.keys(monthlyData).sort();
  const currentMonthIdx = monthKeys.indexOf(selectedMonthKey);
  const currentMonthRows = monthlyData[selectedMonthKey] ?? [];

  const parsedMonth = selectedMonthKey ? (() => {
    const [y, m] = selectedMonthKey.split('-');
    return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
  })() : '';

  const uniqueStandings = Array.from(new Map(standings.map((e) => [e.team.id, e])).values());

  if (loading) return (
    <main className="min-h-screen bg-[#08080d] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#e8a000]" />
    </main>
  );

  return (
    <main className="min-h-screen bg-[#08080d]">
      {/* Hero header */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-linear-to-br from-[#e8a000]/8 via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} className="text-[#e8a000]" />
                <p className="text-[#e8a000] text-[10px] tracking-[0.4em] uppercase font-semibold">
                  {activeSeason ? activeSeason.name : 'Ghana MLBB'}
                </p>
              </div>
              <h1 className="text-white font-black text-3xl md:text-4xl tracking-tight uppercase">Leaderboards</h1>
              <p className="text-[#444] text-sm mt-1 tracking-wide">MLGH · Reckoning of Champions · Updated after every match</p>
            </div>
            <div className="pointer-events-none select-none">
              <Image src="/gif/chou.gif" alt="Chou" width={120} height={120} className="object-contain sm:w-[140px] sm:h-[140px] md:w-[180px] md:h-[180px] drop-shadow-[0_0_32px_rgba(232,160,0,0.45)]" unoptimized />
            </div>
          </div>
          {/* Top 3 quick cards from season standings */}
          {seasonStandings.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-8 max-w-lg">
              {seasonStandings.slice(0, 3).map((s, i) => {
                const c = s.team.color || '#e8a000';
                return (
                  <div key={s.id} className="bg-[#0f0f18] border border-white/[0.06] p-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: c }} />
                    {i === 0 && <Crown size={10} className="absolute top-2 right-2 text-[#e8a000]" />}
                    <p className="text-[#444] text-[8px] uppercase tracking-widest mb-0.5">#{s.rank}</p>
                    <p className="text-white font-black text-[11px] uppercase tracking-wide leading-tight">{s.team.name}</p>
                    <p className="font-mono text-[10px] font-bold mt-1" style={{ color: c }}>{s.points} pts</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-0 mb-6 border-b border-white/[0.06] overflow-x-auto">
          {([
            { key: 'season',    label: 'Season Standings', icon: <Trophy size={11} /> },
            { key: 'standings', label: 'All-time Teams',   icon: <Crown  size={11} /> },
            { key: 'players',   label: 'Player MVP',       icon: <Flame  size={11} /> },
            { key: 'meta',      label: 'Hero Meta',        icon: <Star   size={11} /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-3 text-[11px] font-black tracking-[0.15em] uppercase transition-all border-b-2 -mb-px shrink-0"
              style={tab === t.key ? { color: '#e8a000', borderColor: '#e8a000' } : { color: '#444', borderColor: 'transparent' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── SEASON STANDINGS ── */}
        {tab === 'season' && (
          <div className="space-y-4">
            {!activeSeason ? (
              <p className="text-[#444] text-center py-12">No active season right now. Check back soon.</p>
            ) : (
              <>
                {/* Sub-tabs */}
                <div className="flex gap-3 mb-4">
                  {(['cumulative', 'monthly'] as const).map((st) => (
                    <button key={st} onClick={() => setSeasonTab(st)}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border transition-colors ${
                        seasonTab === st ? 'border-[#e8a000] text-[#e8a000] bg-[#e8a000]/10' : 'border-white/10 text-[#555] hover:border-white/30'
                      }`}>
                      {st === 'cumulative' ? '🏆 Season Total' : '📅 Monthly'}
                    </button>
                  ))}
                </div>

                {/* Cumulative table */}
                {seasonTab === 'cumulative' && (
                  seasonStandings.length === 0 ? (
                    <p className="text-[#444] text-center py-12">No matches played yet this season.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="min-w-[580px]">
                        <div className="grid grid-cols-[36px_1fr_50px_50px_50px_70px_70px_60px_50px] gap-2 px-3 mb-2">
                          {['#', 'Team', 'W', 'L', 'FF', 'PTS', 'Streak', 'Tier', 'Δ'].map((h) => (
                            <p key={h} className="text-[#333] text-[9px] uppercase tracking-widest font-bold">{h}</p>
                          ))}
                        </div>
                        {seasonStandings.map((s) => {
                          const c = s.team.color || '#e8a000';
                          return (
                            <div key={s.id} className="grid grid-cols-[36px_1fr_50px_50px_50px_70px_70px_60px_50px] gap-2 items-center px-3 py-3 mb-1 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors"
                              style={{ borderLeft: s.rank <= 4 ? `2px solid ${c}` : '2px solid transparent' }}>
                              <span className="text-white font-black text-sm font-mono">
                                {s.rank <= 3 ? ['🥇','🥈','🥉'][s.rank-1] : s.rank === 4 ? '4' : s.rank}
                              </span>
                              <div className="flex items-center gap-2">
                                {s.team.logo ? (
                                  <img src={s.team.logo} alt={s.team.tag} className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black" style={{ background: c + '33', color: c }}>
                                    {s.team.tag.slice(0, 2)}
                                  </div>
                                )}
                                <div>
                                  <p className="text-white font-black text-[12px] uppercase tracking-wide leading-none">{s.team.name}</p>
                                  <p className="text-[#444] text-[9px]">[{s.team.tag}]</p>
                                </div>
                              </div>
                              <p className="text-[#27ae60] font-black text-sm">{s.wins}</p>
                              <p className="text-[#e84040] font-black text-sm">{s.losses}</p>
                              <p className="text-[#666] text-sm">{s.forfeits}</p>
                              <p className={`font-black font-mono text-sm ${s.points < 0 ? 'text-[#e84040]' : 'text-[#e8a000]'}`}>{s.points}</p>
                              <StreakBadge streak={s.streak} />
                              <TierBadge tier={s.tier} />
                              <RankDelta curr={s.rank} prev={s.previousRank} />
                            </div>
                          );
                        })}
                        <p className="text-[#2a2a2a] text-[9px] mt-4 text-center uppercase tracking-widest">
                          Win +2 pts · Loss 0 pts · Forfeit -1 pt · Tiebreaker: Head-to-Head
                        </p>
                      </div>
                    </div>
                  )
                )}

                {/* Monthly table */}
                {seasonTab === 'monthly' && (
                  <div className="space-y-4">
                    {monthKeys.length === 0 ? (
                      <p className="text-[#444] text-center py-12">No monthly data yet.</p>
                    ) : (
                      <>
                        {/* Month navigator */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => currentMonthIdx > 0 && setSelectedMonthKey(monthKeys[currentMonthIdx - 1])}
                            disabled={currentMonthIdx <= 0}
                            className="p-1 text-[#555] hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <div className="flex items-center gap-2">
                            <Calendar size={13} className="text-[#e8a000]" />
                            <span className="text-white font-black text-sm uppercase tracking-wider">{parsedMonth}</span>
                          </div>
                          <button
                            onClick={() => currentMonthIdx < monthKeys.length - 1 && setSelectedMonthKey(monthKeys[currentMonthIdx + 1])}
                            disabled={currentMonthIdx >= monthKeys.length - 1}
                            className="p-1 text-[#555] hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <ChevronRight size={16} />
                          </button>
                          <div className="flex gap-1 ml-2">
                            {monthKeys.map((k) => {
                              const [, m] = k.split('-');
                              return (
                                <button key={k} onClick={() => setSelectedMonthKey(k)}
                                  className={`px-2 py-0.5 text-[9px] font-bold uppercase transition-colors ${k === selectedMonthKey ? 'text-[#e8a000]' : 'text-[#444] hover:text-white'}`}>
                                  {MONTH_NAMES[parseInt(m) - 1]}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {currentMonthRows.length === 0 ? (
                          <p className="text-[#444] text-center py-8">No matches in {parsedMonth}.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <div className="min-w-[480px]">
                              <div className="grid grid-cols-[36px_1fr_50px_50px_50px_70px_50px] gap-2 px-3 mb-2">
                                {['#', 'Team', 'W', 'L', 'FF', 'PTS', 'Tier'].map((h) => (
                                  <p key={h} className="text-[#333] text-[9px] uppercase tracking-widest font-bold">{h}</p>
                                ))}
                              </div>
                              {[...currentMonthRows].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).map((s, i) => {
                                const c = s.team.color || '#e8a000';
                                return (
                                  <div key={s.id} className="grid grid-cols-[36px_1fr_50px_50px_50px_70px_50px] gap-2 items-center px-3 py-3 mb-1 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors">
                                    <span className="text-white font-black text-sm font-mono">{i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</span>
                                    <div className="flex items-center gap-2">
                                      {s.team.logo ? (
                                        <img src={s.team.logo} alt={s.team.tag} className="w-5 h-5 rounded-full object-cover" />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black" style={{ background: c + '33', color: c }}>
                                          {s.team.tag.slice(0, 2)}
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-white font-black text-[12px] uppercase leading-none">{s.team.name}</p>
                                        <p className="text-[#444] text-[9px]">[{s.team.tag}]</p>
                                      </div>
                                    </div>
                                    <p className="text-[#27ae60] font-black text-sm">{s.wins}</p>
                                    <p className="text-[#e84040] font-black text-sm">{s.losses}</p>
                                    <p className="text-[#666] text-sm">{s.forfeits}</p>
                                    <p className={`font-black font-mono text-sm ${s.points < 0 ? 'text-[#e84040]' : 'text-[#e8a000]'}`}>{s.points}</p>
                                    <span className="text-[#555] text-[9px]">—</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ALL-TIME STANDINGS ── */}
        {tab === 'standings' && (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[32px_1fr_60px_60px_80px_60px_80px_80px] gap-3 px-3 mb-2">
                {['#', 'Team', 'W', 'L', 'Points', 'Streak', 'Prize', 'Tier'].map((h) => (
                  <p key={h} className="text-[#333] text-[9px] uppercase tracking-widest font-bold">{h}</p>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {uniqueStandings.length === 0 ? (
                  <p className="text-[#333] text-center py-8">No standings available</p>
                ) : uniqueStandings.map((s) => {
                  const teamColor = s.team.color || '#e8a000';
                  const prize = s.team.totalPrizeMoney > 0 ? `₵${(s.team.totalPrizeMoney / 100).toLocaleString()}` : '—';
                  return (
                    <div key={s.id} className="grid grid-cols-[32px_1fr_60px_60px_80px_60px_80px_80px] gap-3 items-center px-3 py-3 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors group cursor-pointer"
                      style={{ borderLeft: s.rank <= 3 ? `2px solid ${teamColor}` : '2px solid transparent' }}>
                      <div className="flex flex-col items-center">
                        <span className="text-white font-black text-sm font-mono">{s.rank <= 3 ? ['🥇','🥈','🥉'][s.rank-1] : s.rank}</span>
                        <RankDelta curr={s.rank} prev={s.rank} />
                      </div>
                      <div>
                        <p className="text-white font-black text-[12px] uppercase tracking-wide group-hover:text-[#e8a000] transition-colors">{s.team.name}</p>
                        <p className="text-[#444] text-[9px] tracking-widest">{s.team.tag}</p>
                      </div>
                      <p className="text-[#27ae60] font-black text-sm">{s.wins}</p>
                      <p className="text-[#e84040] font-black text-sm">{s.losses}</p>
                      <p className="text-[#e8a000] font-black font-mono text-sm">{s.points.toLocaleString()}</p>
                      <StreakBadge streak={null} />
                      <p className="text-[#666] text-[11px] font-mono">{prize}</p>
                      <TierBadge tier={s.tier} />
                    </div>
                  );
                })}
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
              {playerRankings.length === 0 ? <p className="text-[#333] text-center py-8">No player rankings available</p>
              : playerRankings.map((p) => {
                const roleMeta = ROLE_META[p.player.role] || ROLE_META.ROAM;
                const photoUrl = p.player.photo || p.player.user?.photo || '/heroes/stun.png';
                return (
                  <div key={p.id} className="grid grid-cols-[32px_1fr_80px_80px_60px_60px_60px] gap-3 items-center px-3 py-3 mb-1 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors group cursor-pointer">
                    <span className="text-white font-black text-sm font-mono text-center">{p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : p.rank}</span>
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 overflow-hidden shrink-0 border border-white/10">
                        <Image src={photoUrl} alt={p.player.ign} fill className="object-cover grayscale group-hover:grayscale-0 transition-all" />
                      </div>
                      <div>
                        <p className="text-white font-black text-[12px] tracking-wide group-hover:text-[#e8a000]">{p.player.ign}</p>
                        <p className="text-[#444] text-[9px]">{p.player.team?.tag ?? '—'}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5 w-fit"
                      style={{ color: roleMeta.color, background: `${roleMeta.color}22`, border: `1px solid ${roleMeta.color}33` }}>
                      {roleMeta.icon} {p.player.role}
                    </span>
                    <p className="text-[#666] text-[11px]">{p.player.signatureHero || '—'}</p>
                    <p className="text-white font-black text-sm font-mono">{p.player.kda.toFixed(1)}</p>
                    <div>
                      <p className="text-[#27ae60] font-bold text-[11px] font-mono">{Math.round(p.player.winRate * 100)}%</p>
                      <div className="w-full h-0.5 bg-white/[0.05] mt-1"><div className="h-full bg-[#27ae60]" style={{ width: `${Math.round(p.player.winRate * 100)}%` }} /></div>
                    </div>
                    <div className="flex items-center gap-1"><Crown size={9} className="text-[#e8a000]" /><p className="text-[#e8a000] font-black text-sm">{p.mvpCount}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── HERO META ── */}
        {tab === 'meta' && (
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="grid grid-cols-[1fr_80px_80px_80px_80px_60px] gap-4 px-3 mb-2">
                {['Hero', 'Role', 'Pick%', 'Ban%', 'Win%', 'Tier'].map((h) => (
                  <p key={h} className="text-[#333] text-[9px] uppercase tracking-widest font-bold">{h}</p>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {heroMeta.length === 0 ? <p className="text-[#333] text-center py-8">No hero meta data available</p>
                : heroMeta.map((h) => {
                  const roleMeta = ROLE_META[h.role] || ROLE_META.ROAM;
                  return (
                    <div key={h.id} className="grid grid-cols-[1fr_80px_80px_80px_80px_60px] gap-4 items-center px-3 py-3 bg-[#0f0f18] border border-white/[0.05] hover:border-white/[0.12] transition-colors cursor-pointer group">
                      <p className="text-white font-black text-[13px] group-hover:text-[#e8a000] transition-colors">{h.heroName}</p>
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 w-fit" style={{ color: roleMeta.color, background: `${roleMeta.color}22`, border: `1px solid ${roleMeta.color}33` }}>{roleMeta.icon} {h.role}</span>
                      {[{ v: h.pickRate, c: '#4a90d9' }, { v: h.banRate, c: '#e84040' }, { v: h.winRate, c: '#27ae60' }].map(({ v, c }, i) => (
                        <div key={i}><p className="font-mono text-[11px] font-bold" style={{ color: c }}>{Math.round(v*100)}%</p><div className="w-full h-0.5 bg-white/[0.05] mt-1"><div className="h-full" style={{ background: c, width: `${Math.round(v*100)}%` }} /></div></div>
                      ))}
                      <TierBadge tier={h.tier} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
