'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Shield, Zap, Swords, Star, Target, Wind, Crown,
  TrendingUp, TrendingDown, Minus, Trophy, Flame,
  Loader2, Calendar, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Medal
} from 'lucide-react';

// ── MLBB Role meta ─────────────────────────────────────────
const ROLE_META: Record<string, { color: string; icon: React.ReactNode }> = {
  EXP: { color: '#e8a000', icon: <Swords size={12} /> },
  JUNGLE: { color: '#e84040', icon: <Zap size={12} /> },
  MAGE: { color: '#9b59b6', icon: <Star size={12} /> },
  MARKSMAN: { color: '#27ae60', icon: <Target size={12} /> },
  ROAM: { color: '#4a90d9', icon: <Shield size={12} /> },
  Tank: { color: '#4a90d9', icon: <Shield size={12} /> },
  Fighter: { color: '#e8a000', icon: <Swords size={12} /> },
  Assassin: { color: '#e84040', icon: <Zap size={12} /> },
  Support: { color: '#16a085', icon: <Wind size={12} /> },
  MID: { color: '#3b82f6', icon: <Star size={12} /> },
  GOLD: { color: '#e8a000', icon: <Target size={12} /> },
};

// ── Types ──────────────────────────────────────────────────
// (Same as original but condensed for brevity)
interface ApiTeamStanding {
  id: string; rank: number; wins: number; losses: number; points: number; tier: string;
  team: { id: string; name: string; tag: string; logo: string | null; color: string | null; totalPrizeMoney: number; };
  tournamentBreakdown: Array<{ tournamentId: string; tournamentName: string; points: number }>;
}
interface ApiPlayerRanking {
  id: string; rank: number; mvpCount: number; kda: number; winRate: number; hero?: string | null;
  player: { id: string; ign: string; role: string; photo: string | null; team?: { id: string; name: string; tag: string; color: string | null }; signatureHero?: string; user?: { photo: string | null } };
}
interface ApiHeroMeta { id: string; heroName: string; role: string; pickRate: number; banRate: number; winRate: number; tier: string; }
interface SeasonStanding {
  id: string; rank: number; previousRank: number | null; wins: number; losses: number; forfeits: number; points: number; streak: string | null; tier: string;
  team: { id: string; name: string; tag: string; logo: string | null; color: string | null };
  tournamentBreakdown: Array<{ tournamentId: string; tournamentName: string; points: number }>;
}
interface MonthlyRow { id: string; rank: number | null; wins: number; losses: number; forfeits: number; points: number; team: { id: string; name: string; tag: string; logo: string | null; color: string | null }; }
interface ActiveSeason { id: string; name: string; status: string; }
interface Tournament { id: string; name: string; status: string; }
interface TournamentStandingRow { id: string; wins: number; losses: number; draws: number; groupPoints: number; team: { id: string; name: string; tag: string; color: string | null; logo: string | null; }; }

// ── Helpers ────────────────────────────────────────────────
const RankDelta = ({ curr, prev }: { curr: number; prev: number | null }) => {
  if (!prev || prev === 0) return <Minus size={10} className="text-white/20" />;
  const d = prev - curr;
  if (d > 0) return <span className="flex items-center text-[#27ae60] text-[10px] font-bold"><TrendingUp size={10} className="mr-0.5" />{d}</span>;
  if (d < 0) return <span className="flex items-center text-[#e84040] text-[10px] font-bold"><TrendingDown size={10} className="mr-0.5" />{Math.abs(d)}</span>;
  return <Minus size={10} className="text-white/20" />;
};

const TierBadge = ({ tier }: { tier: string }) => {
  const colors: Record<string, string> = { 'S_PLUS': '#e8a000', 'S+': '#e8a000', S: '#e8a000', A: '#4a90d9', B: '#9b59b6', C: '#555' };
  const c = colors[tier] ?? '#555';
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase" style={{ color: c, background: `${c}22`, border: `1px solid ${c}44` }}>
      {tier === 'S_PLUS' ? 'S+' : tier}
    </span>
  );
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
type Tab = 'season' | 'standings' | 'players' | 'meta';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('season');
  const [seasonTab, setSeasonTab] = useState<'cumulative' | 'monthly' | 'tournaments'>('cumulative');

  const [activeSeason, setActiveSeason] = useState<ActiveSeason | null>(null);
  const [seasonStandings, setSeasonStandings] = useState<SeasonStanding[]>([]);
  const [monthlyData, setMonthlyData] = useState<Record<string, MonthlyRow[]>>({});
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [tournamentStandings, setTournamentStandings] = useState<Record<string, TournamentStandingRow[]>>({});
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [standings, setStandings] = useState<ApiTeamStanding[]>([]);
  const [playerRankings, setPlayerRankings] = useState<ApiPlayerRanking[]>([]);
  const [heroMeta, setHeroMeta] = useState<ApiHeroMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

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

      const seasons: ActiveSeason[] = Array.isArray(seasonsData) ? seasonsData : (seasonsData?.data ?? []);
      const active = seasons[0] ?? null;
      setActiveSeason(active);

      if (active) {
        const sRes = await fetch(`/api/seasons/${active.id}/standings`);
        const sData = await sRes.json();
        const payload = sData?.data ?? sData ?? {};
        setSeasonStandings(payload?.cumulative ?? []);
        const grouped: Record<string, MonthlyRow[]> = payload?.monthly ?? {};
        setMonthlyData(grouped);
        const keys = Object.keys(grouped).sort();
        if (keys.length) setSelectedMonthKey(keys[keys.length - 1]);

        const tRes = await fetch(`/api/tournaments?seasonId=${active.id}`);
        const tData = await tRes.json();
        const tournamentList = tData?.data?.tournaments ?? tData?.tournaments ?? [];
        setTournaments(tournamentList);
        if (tournamentList.length > 0) setSelectedTournamentId(tournamentList[0].id);
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

  useEffect(() => {
    if (selectedTournamentId && seasonTab === 'tournaments') {
      fetchTournamentStandings(selectedTournamentId);
    }
  }, [selectedTournamentId, seasonTab]);

  const fetchTournamentStandings = async (id: string) => {
    setLoadingTournament(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/standings`);
      const data = await res.json();
      setTournamentStandings(data.groups || {});
    } catch (err) {
      console.error('Failed to fetch tournament standings:', err);
    } finally {
      setLoadingTournament(false);
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

  // Player Slider Logic
  const roles = Array.from(new Set(playerRankings.map((p) => p.player.role))).filter(Boolean);
  const roleTopList = roles.map((role) => {
    const sorted = playerRankings.filter(p => p.player.role === role).slice().sort((a, b) => {
      if (b.mvpCount !== a.mvpCount) return b.mvpCount - a.mvpCount;
      if (b.kda !== a.kda) return b.kda - a.kda;
      return b.winRate - a.winRate;
    });
    return { role, top: sorted[0] ?? null };
  });
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  useEffect(() => {
    if (roleTopList.length === 0) return;
    const id = setInterval(() => setActiveRoleIndex(i => (i + 1) % roleTopList.length), 5000);
    return () => clearInterval(id);
  }, [playerRankings, roleTopList.length]);
  const featuredRole = roleTopList[activeRoleIndex] ?? null;

  if (loading) return (
    <main className="min-h-screen bg-[#08080d] flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-10 h-10 animate-spin text-[#e8a000] mb-4" />
      <p className="text-white/60 font-black uppercase tracking-[0.2em] text-xs">Loading Rankings...</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#08080d] text-white selection:bg-[#e8a000]/30 pb-20">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="relative pt-12 pb-8 px-4 overflow-hidden border-b border-white/[0.05]">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-[#e8a000] rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-blue-600 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-3 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <Trophy size={12} className="text-[#e8a000]" />
              <span className="text-[#e8a000] text-[10px] font-black uppercase tracking-[0.2em]">
                {activeSeason?.name || 'Ghana MLBB'}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white mb-2 italic">
              Leaderboards
            </h1>
            <p className="text-white/40 text-[10px] md:text-sm uppercase tracking-[0.1em] font-medium">
              MLGH · Real-time Pro Player & Team Stats
            </p>
          </div>

          {/* Quick Podium - Mobile Optimized */}
          {seasonStandings.length > 0 && tab === 'season' && (
            <div className="mt-10 grid grid-cols-3 gap-2 md:gap-4 max-w-2xl mx-auto items-end">
              {/* 2nd Place */}
              {seasonStandings[1] && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-slate-400 p-1 relative">
                    <img src={seasonStandings[1].team.logo || ''} alt="" className="w-full h-full rounded-full object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-slate-400 text-black font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">2</div>
                  </div>
                  <p className="text-[10px] font-black truncate w-full text-center">{seasonStandings[1].team.tag}</p>
                </div>
              )}
              {/* 1st Place */}
              {seasonStandings[0] && (
                <div className="flex flex-col items-center gap-2 -translate-y-4">
                  <Crown size={20} className="text-[#e8a000] animate-bounce" />
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-[#e8a000] p-1.5 relative shadow-[0_0_30px_rgba(232,160,0,0.3)]">
                    <img src={seasonStandings[0].team.logo || ''} alt="" className="w-full h-full rounded-full object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-[#e8a000] text-black font-black text-xs w-6 h-6 rounded-full flex items-center justify-center">1</div>
                  </div>
                  <p className="text-xs font-black truncate w-full text-center">{seasonStandings[0].team.tag}</p>
                </div>
              )}
              {/* 3rd Place */}
              {seasonStandings[2] && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-amber-700 p-1 relative">
                    <img src={seasonStandings[2].team.logo || ''} alt="" className="w-full h-full rounded-full object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-amber-700 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">3</div>
                  </div>
                  <p className="text-[10px] font-black truncate w-full text-center">{seasonStandings[2].team.tag}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── STICKY TABS ────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[#08080d]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-2 flex items-center justify-between overflow-x-auto no-scrollbar">
          {(['season', 'standings', 'players', 'meta'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 min-w-fit px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative
                ${tab === t ? 'text-[#e8a000]' : 'text-white/40'}`}
            >
              {t}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e8a000]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── SEASON STANDINGS ── */}
        {tab === 'season' && (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg w-fit">
              {(['cumulative', 'monthly', 'tournaments'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSeasonTab(st)}
                  className={`px-4 py-2 text-[10px] font-black uppercase rounded-md transition-all
                    ${seasonTab === st ? 'bg-[#e8a000] text-black shadow-lg shadow-[#e8a000]/20' : 'text-white/40 hover:text-white'}`}
                >
                  {st === 'cumulative' ? 'Total' : st === 'monthly' ? 'Monthly' : 'Tourneys'}
                </button>
              ))}
            </div>

            {seasonTab === 'cumulative' && (
              <div className="space-y-3">
                {/* Header Hidden on Mobile, shown on Desktop */}
                <div className="hidden md:grid grid-cols-[64px_1fr_60px_60px_60px_100px_80px_80px] gap-4 px-4 text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">
                  <span className="text-center">Rank</span>
                  <span>Team</span>
                  <span className="text-center">W</span>
                  <span className="text-center">L</span>
                  <span className="text-center">FF</span>
                  <span className="text-center">Points</span>
                  <span className="text-center">Tier</span>
                  <span className="text-center">Delta</span>
                </div>

                {seasonStandings.map((s) => (
                  <div key={s.id} className="group">
                    <div
                      onClick={() => setExpandedTeamId(expandedTeamId === s.id ? null : s.id)}
                      className="bg-[#0f0f18] border border-white/[0.05] rounded-xl p-3 md:p-4 transition-all hover:border-white/20 active:scale-[0.98] cursor-pointer flex items-center justify-between md:grid md:grid-cols-[64px_1fr_60px_60px_60px_100px_80px_80px] md:gap-4 md:items-center"
                    >
                      {/* 1. Rank */}
                      <div className="flex flex-col items-center justify-center md:border-r md:border-white/5 pr-2">
                        <span className={`text-lg font-black italic leading-none ${s.rank <= 3 ? 'text-[#e8a000]' : 'text-white/40'}`}>
                          {s.rank}
                        </span>
                        <div className="mt-1">
                          <RankDelta curr={s.rank} prev={s.previousRank} />
                        </div>
                      </div>

                      {/* 2. Team */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 p-1 border border-white/10 flex-shrink-0 overflow-hidden">
                          <img src={s.team.logo || ''} alt={s.team.tag} className="w-full h-full object-cover rounded" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-sm uppercase tracking-tight group-hover:text-[#e8a000] transition-colors truncate">{s.team.name}</p>
                          <p className="text-[10px] text-white/40 font-bold tracking-widest md:hidden">[{s.team.tag}] · {s.wins}W {s.losses}L</p>
                          <p className="hidden md:block text-[9px] text-white/20 font-black uppercase tracking-widest">[{s.team.tag}]</p>
                        </div>
                      </div>

                      {/* 3. Wins */}
                      <span className="hidden md:block font-black text-emerald-400 text-center text-sm">{s.wins}</span>
                      
                      {/* 4. Losses */}
                      <span className="hidden md:block font-black text-red-500 text-center text-sm">{s.losses}</span>
                      
                      {/* 5. Forfeits */}
                      <span className="hidden md:block font-bold text-white/40 text-center text-xs">{s.forfeits}</span>

                      {/* 6. Points Area (Visible Mobile/Desktop) */}
                      <div className="flex flex-col items-end md:items-center bg-white/[0.03] md:bg-transparent px-3 py-1 md:p-0 rounded-lg border border-white/5 md:border-0">
                        <span className="text-xl md:text-2xl font-black text-[#e8a000] italic leading-none">{s.points}</span>
                        <span className="text-[8px] text-white/20 uppercase font-black tracking-tighter mt-1">Points</span>
                      </div>

                      {/* 7. Tier */}
                      <div className="hidden md:flex justify-center"><TierBadge tier={s.tier} /></div>
                      
                      {/* 8. Delta/Expand */}
                      <div className="text-right flex items-center justify-center">
                        <div className="hidden md:block"><RankDelta curr={s.rank} prev={s.previousRank} /></div>
                        <div className="md:hidden">
                          {expandedTeamId === s.id ? <ChevronUp size={16} className="text-white/20" /> : <ChevronDown size={16} className="text-white/20" />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Mobile View */}
                    {expandedTeamId === s.id && (
                      <div className="mt-1 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] uppercase text-white/30 font-black mb-1">Season Tier</p>
                            <TierBadge tier={s.tier} />
                          </div>
                          <div>
                            <p className="text-[8px] uppercase text-white/30 font-black mb-1">Tournament Wins</p>
                            <p className="text-xs font-bold text-white/80">{s.tournamentBreakdown?.length || 0} Participated</p>
                          </div>
                        </div>
                        {s.tournamentBreakdown && s.tournamentBreakdown.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                            {s.tournamentBreakdown.map(tb => (
                              <div key={tb.tournamentId} className="flex justify-between items-center text-[10px]">
                                <span className="text-white/40 font-black uppercase">{tb.tournamentName}</span>
                                <span className="text-[#e8a000] font-black">{tb.points} PTS</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Monthly & Tournament View similarly revamped to avoid overflow */}
            {seasonTab === 'monthly' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#0f0f18] p-3 rounded-xl border border-white/10">
                  <button
                    onClick={() => currentMonthIdx > 0 && setSelectedMonthKey(monthKeys[currentMonthIdx - 1])}
                    className="p-2 bg-white/5 rounded-lg active:bg-white/10 disabled:opacity-20"
                    disabled={currentMonthIdx <= 0}
                  ><ChevronLeft size={16} /></button>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-[#e8a000] uppercase">Selected Month</p>
                    <p className="font-black text-sm uppercase tracking-widest">{parsedMonth || 'No Data'}</p>
                  </div>
                  <button
                    onClick={() => currentMonthIdx < monthKeys.length - 1 && setSelectedMonthKey(monthKeys[currentMonthIdx + 1])}
                    className="p-2 bg-white/5 rounded-lg active:bg-white/10 disabled:opacity-20"
                    disabled={currentMonthIdx >= monthKeys.length - 1}
                  ><ChevronRight size={16} /></button>
                </div>

                {currentMonthRows.length === 0 ? (
                  <div className="py-20 text-center opacity-30 text-xs font-black uppercase italic border border-dashed border-white/10 rounded-xl">No records for this month</div>
                ) : (
                  <div className="space-y-2">
                    <div className="hidden md:grid grid-cols-[64px_1fr_100px] gap-4 px-4 text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">
                      <span className="text-center">Rank</span>
                      <span>Team Name</span>
                      <span className="text-center">Monthly Points</span>
                    </div>
                    {currentMonthRows.map((row, i) => (
                      <div key={row.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl md:grid md:grid-cols-[64px_1fr_100px] md:gap-4 md:items-center hover:bg-white/5 transition-colors">
                        <span className="text-sm font-black italic text-white/40 md:text-center">#{i + 1}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                            <img src={row.team.logo || ''} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-tight">{row.team.name}</span>
                        </div>
                        <div className="text-right md:text-center">
                          <p className="text-sm font-black text-[#e8a000]">{row.points} <span className="text-[8px] text-white/20">PTS</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {seasonTab === 'tournaments' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {tournaments.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTournamentId(t.id)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border
                          ${selectedTournamentId === t.id ? 'bg-[#e8a000] text-black border-[#e8a000]' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>

                  {loadingTournament ? (
                    <div className="py-20 flex flex-col items-center justify-center opacity-30">
                      <Loader2 size={24} className="animate-spin mb-2" />
                      <p className="text-[10px] font-black uppercase">Loading Standings...</p>
                    </div>
                  ) : Object.keys(tournamentStandings).length === 0 ? (
                    <div className="py-20 text-center opacity-30 text-xs font-black uppercase italic border border-dashed border-white/10 rounded-xl">No tournament data available</div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(tournamentStandings).map(([groupName, rows]) => (
                        <div key={groupName} className="space-y-3">
                          <div className="flex items-center gap-3 px-1">
                            <div className="h-0.5 w-8 bg-[#e8a000]" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">{groupName}</h3>
                          </div>

                          <div className="space-y-2">
                            <div className="hidden md:grid grid-cols-[64px_1fr_60px_60px_60px_100px] gap-4 px-4 text-[10px] font-black text-white/30 uppercase tracking-widest">
                              <span className="text-center">#</span>
                              <span>Team</span>
                              <span className="text-center">W</span>
                              <span className="text-center">L</span>
                              <span className="text-center">D</span>
                              <span className="text-center">PTS</span>
                            </div>

                            {rows.map((r, idx) => (
                              <div key={r.id} className="bg-[#0f0f18] border border-white/5 rounded-xl p-3 flex items-center justify-between md:grid md:grid-cols-[64px_1fr_60px_60px_60px_100px] md:gap-4 md:items-center transition-all hover:border-white/20">
                                <span className="w-8 md:w-full text-center text-sm font-black italic text-white/20">#{idx + 1}</span>
                                
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white/5 p-1 border border-white/10 flex-shrink-0">
                                    <img src={r.team.logo || ''} alt="" className="w-full h-full object-cover rounded-sm" />
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-tight">{r.team.name}</span>
                                </div>

                                <span className="hidden md:block text-center font-black text-emerald-400 text-xs">{r.wins}</span>
                                <span className="hidden md:block text-center font-black text-red-500 text-xs">{r.losses}</span>
                                <span className="hidden md:block text-center font-black text-amber-500 text-xs">{r.draws}</span>
                                
                                <div className="text-right md:text-center">
                                  <span className="text-lg font-black text-[#e8a000] italic leading-none">{r.groupPoints}</span>
                                  <p className="md:hidden text-[8px] font-black text-white/20 uppercase">Points</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PLAYERS ── */}
        {tab === 'players' && (
          <div className="space-y-6">
            {/* Featured MVP Slider */}
            {featuredRole?.top && (
              <div className="relative overflow-hidden rounded-2xl bg-[#0f0f18] border border-white/[0.08] p-6 shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Crown size={120} className="rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                  <div className="relative group">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#e8a000]/30 p-1 relative">
                      <Image
                        src={featuredRole.top.player.photo || featuredRole.top.player.user?.photo || '/heroes/stun.png'}
                        alt="" fill className="object-cover rounded-full"
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#e8a000] text-black text-[9px] font-black px-3 py-1 rounded-full uppercase">
                      #{featuredRole.top.rank}
                    </div>
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                      <span className="text-[#e8a000]" style={{ color: (ROLE_META[featuredRole.role] || ROLE_META.ROAM).color }}>
                        {(ROLE_META[featuredRole.role] || ROLE_META.ROAM).icon}
                      </span>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{featuredRole.role} Meta-Leader</span>
                    </div>
                    <h2 className="text-3xl font-black italic uppercase text-white mb-4 leading-none">{featuredRole.top.player.ign}</h2>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[8px] font-black uppercase text-white/30 mb-1">MVP Wins</p>
                        <p className="text-lg font-black text-[#e8a000]">{featuredRole.top.mvpCount}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[8px] font-black uppercase text-white/30 mb-1">KDA Ratio</p>
                        <p className="text-lg font-black text-white">{featuredRole.top.kda.toFixed(1)}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[8px] font-black uppercase text-white/30 mb-1">Win Rate</p>
                        <p className="text-lg font-black text-[#27ae60]">{Math.round(featuredRole.top.winRate * 100)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role Filter - Horizontal Scroll optimized */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
              <button
                onClick={() => setSelectedRole('ALL')}
                className={`flex-shrink-0 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all
                  ${selectedRole === 'ALL' ? 'bg-[#e8a000] text-black border-[#e8a000]' : 'bg-white/5 text-white/40 border-white/10'}`}
              >All</button>
              {roles.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`flex-shrink-0 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2
                    ${selectedRole === r ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10'}`}
                >
                  <span style={{ color: selectedRole === r ? 'black' : (ROLE_META[r] || ROLE_META.ROAM).color }}>
                    {(ROLE_META[r] || ROLE_META.ROAM).icon}
                  </span>
                  {r}
                </button>
              ))}
            </div>

            {/* Player List */}
            <div className="space-y-2">
              {playerRankings
                .filter(p => selectedRole === 'ALL' || p.player.role === selectedRole)
                .slice()
                .sort((a, b) => b.mvpCount - a.mvpCount)
                .map((p, idx) => (
                  <div key={p.id} className="bg-[#0f0f18] p-3 rounded-xl border border-white/5 flex items-center gap-4 transition-all hover:bg-white/[0.05]">
                    <span className="w-6 text-xs font-black italic text-white/20">{idx + 1}</span>
                    <div className="w-12 h-12 rounded-full bg-white/5 p-0.5 border border-white/10 overflow-hidden relative">
                      <Image src={p.player.photo || p.player.user?.photo || '/heroes/stun.png'} alt="" fill className="object-cover rounded-full" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-sm uppercase tracking-tighter">{p.player.ign}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                          {p.player.role}
                        </span>
                        <span className="text-[8px] font-black text-[#e8a000] flex items-center gap-1">
                          <Medal size={8} /> {p.mvpCount} MVPs
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-white">{p.kda.toFixed(1)}</p>
                      <p className="text-[8px] font-black uppercase text-white/20">KDA Ratio</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── HERO META ── */}
        {tab === 'meta' && (
          <div className="grid grid-cols-1 gap-3">
            {heroMeta.map((h) => {
              const meta = ROLE_META[h.role] || ROLE_META.ROAM;
              return (
                <div key={h.id} className="bg-[#0f0f18] p-4 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center font-black text-lg italic text-[#e8a000]">
                        {h.heroName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black uppercase tracking-tight text-sm">{h.heroName}</h3>
                        <span className="text-[9px] font-black uppercase flex items-center gap-1" style={{ color: meta.color }}>
                          {meta.icon} {h.role}
                        </span>
                      </div>
                    </div>
                    <TierBadge tier={h.tier} />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase text-white/30">
                        <span>Pick</span>
                        <span>{Math.round(h.pickRate * 100)}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${h.pickRate * 100}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase text-white/30">
                        <span>Ban</span>
                        <span>{Math.round(h.banRate * 100)}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${h.banRate * 100}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase text-white/30">
                        <span>Win</span>
                        <span>{Math.round(h.winRate * 100)}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#27ae60]" style={{ width: `${h.winRate * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ALL-TIME TEAMS ── */}
        {tab === 'standings' && (
          <div className="space-y-3">
            {/* Header */}
            <div className="hidden md:grid grid-cols-[64px_1fr_120px_100px] gap-4 px-4 text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">
              <span className="text-center">Rank</span>
              <span>Team</span>
              <span className="text-center">Prize Earned</span>
              <span className="text-center">Total Points</span>
            </div>

            {uniqueStandings.map((s) => (
              <div key={s.id} className="bg-[#0f0f18] border border-white/[0.05] rounded-xl p-3 md:p-4 transition-all hover:border-white/20 cursor-pointer flex items-center justify-between md:grid md:grid-cols-[64px_1fr_120px_100px] md:gap-4 md:items-center">
                
                {/* 1. Rank */}
                <div className="w-12 md:w-full flex justify-center md:border-r md:border-white/5">
                  <span className="text-xl font-black italic text-white/10 uppercase italic">#{s.rank}</span>
                </div>

                {/* 2. Team */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 p-1 border border-white/10 flex-shrink-0 overflow-hidden">
                    <img src={s.team.logo || ''} alt="" className="w-full h-full object-cover rounded" />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase leading-tight text-white">{s.team.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <TierBadge tier={s.tier} />
                      <p className="md:hidden text-[10px] font-bold text-white/30 italic">₵{(s.team.totalPrizeMoney / 100).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Prize */}
                <div className="hidden md:flex justify-center text-center">
                   <p className="text-xs font-bold text-emerald-400 font-mono italic">₵{(s.team.totalPrizeMoney / 100).toLocaleString()}</p>
                </div>

                {/* 4. Points */}
                <div className="text-right md:text-center">
                  <p className="text-xl font-black text-[#e8a000] italic leading-none">{s.points.toLocaleString()}</p>
                  <p className="text-[8px] font-black uppercase text-white/20 mt-1">All-time</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}