'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { 
  Volume2, Trophy, Crown, Sparkles, Clock, Loader2, CheckCircle2, 
  ChevronRight, Swords, HelpCircle, User, Shield, AlertCircle, Settings, AlertTriangle
} from 'lucide-react';

interface ProCandidate {
  id: string;
  name: string;
  role: 'COACH' | 'PLAYER';
  team: string;
  avatar: string; // gradient classes
  photo?: string | null;
  title: string;
  bio: string;
  metaFocus: string;
  achievements: string[];
  voteCount: number;
  votePercentage: number;
  hasUserVoted: boolean;
  isCommunity?: boolean;
}

interface VotingStats {
  candidates: ProCandidate[];
  totalVotes: number;
  userVotedId: string | null;
}

export default function MeetTheProsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [stats, setStats] = useState<VotingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'PROS' | 'COMMUNITY'>('ALL');
  const [isPending, startTransition] = useTransition();

  const isAdmin = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'TOURNAMENT_ADMIN';

  // Countdown timer mockup (e.g. 5 days, 14 hours left)
  const [timeLeft, setTimeLeft] = useState({ days: 5, hours: 14, minutes: 32, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        clearInterval(timer);
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load voting stats from API
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/pros/vote', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to retrieve voting stats');
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching pro stats:', err);
      toast.error('Could not connect to voting terminal. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Cast or toggle vote
  const handleVote = useCallback((candidateId: string) => {
    if (sessionStatus === 'unauthenticated') {
      toast.error('Authentication Required', {
        description: 'You must be signed into your account to cast an interview vote.',
        action: {
          label: 'Login Now',
          onClick: () => window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
        },
        duration: 5000
      });
      return;
    }

    if (!stats) return;

    const previousStats = { ...stats };
    const currentVotedId = stats.userVotedId;
    const isRemove = currentVotedId === candidateId;

    // 1. Optimistically calculate new state to give instantaneous click feel
    setStats(prev => {
      if (!prev) return null;

      const updatedCandidates = prev.candidates.map(candidate => {
        let count = candidate.voteCount;
        
        // Handle changes to previous selection
        if (candidate.id === currentVotedId && !isRemove) {
          count = Math.max(0, count - 1);
        }
        
        // Handle target candidate click
        if (candidate.id === candidateId) {
          count = isRemove ? Math.max(0, count - 1) : count + 1;
        }

        return {
          ...candidate,
          voteCount: count,
          hasUserVoted: !isRemove && candidate.id === candidateId
        };
      });

      // Recalculate totals
      const newTotal = updatedCandidates.reduce((sum, c) => sum + c.voteCount, 0);
      
      // Recalculate percentages
      const finalCandidates = updatedCandidates.map(c => ({
        ...c,
        votePercentage: newTotal > 0 ? Math.round((c.voteCount / newTotal) * 100) : 0
      })).sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.name.localeCompare(b.name);
      });

      return {
        candidates: finalCandidates,
        totalVotes: newTotal,
        userVotedId: isRemove ? null : candidateId
      };
    });

    setVotingId(candidateId);

    // 2. Perform the server call in a React transition
    startTransition(async () => {
      try {
        const res = await fetch('/api/pros/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Server error casting vote');
        }

        const updatedData = await res.json();
        
        // Sync state with server response (which includes recalculations)
        setStats({
          candidates: updatedData.candidates,
          totalVotes: updatedData.totalVotes,
          userVotedId: updatedData.userVotedId
        });

        toast.success(isRemove ? 'Vote withdrawn successfully.' : 'Vote cast! Your choice has been registered.', {
          duration: 2500
        });

      } catch (err: any) {
        console.error('Vote failed, reverting state:', err);
        toast.error(err.message || 'Transmission failed. Reverting...');
        setStats(previousStats);
      } finally {
        setVotingId(null);
      }
    });

  }, [sessionStatus, stats]);

  // Admin: Reset Votes
  const handleResetVotes = async (candidateId?: string) => {
    if (!isAdmin) return;
    const isGlobal = !candidateId;
    if (isGlobal && !window.confirm("Are you sure you want to reset ALL interview votes and start a new round? This cannot be undone.")) return;
    if (!isGlobal && !window.confirm(`Reset votes for ${candidateId}?`)) return;

    setResettingId(candidateId || 'ALL');
    try {
      const res = await fetch('/api/admin/pros/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, resetAll: isGlobal })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error resetting votes');
      }

      const updatedData = await res.json();
      setStats({
        candidates: updatedData.candidates,
        totalVotes: updatedData.totalVotes,
        userVotedId: updatedData.userVotedId
      });
      
      toast.success(isGlobal ? 'All votes reset for new round!' : 'Candidate votes reset!');
    } catch (err: any) {
      console.error('Reset failed:', err);
      toast.error(err.message || 'Reset failed.');
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#040509] text-zinc-100 pt-24 lg:pt-28 pb-12 relative overflow-hidden">
      {/* Background Cyberpunk Accents */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[-15%] w-[600px] h-[600px] rounded-full bg-purple-500/[0.02] blur-[160px]" />
        <div className="absolute top-[40%] right-[-15%] w-[600px] h-[600px] rounded-full bg-cyan-500/[0.02] blur-[160px]" />
        {/* Fine Matrix grid lines */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(168, 85, 247, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.08) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* BREADCRUMB / HUB INDICATOR */}
        <div className="flex items-center justify-center lg:justify-start gap-2 mb-4 font-mono text-[9px] tracking-[0.25em] text-purple-400 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          COMMUNITY DECISION PORTAL
          <ChevronRight size={10} className="text-zinc-600" />
          <span className="text-zinc-500">MEET THE PROS</span>
        </div>

        {/* HERO DECK TERMINAL HEADER */}
        <div className="relative border border-purple-500/20 bg-[#080911]/90 rounded-2xl p-6 md:p-8 overflow-hidden mb-12 shadow-[0_0_35px_rgba(168,85,247,0.03)]">
          <div className="absolute top-0 right-0 w-24 h-[1px] bg-gradient-to-l from-purple-500/60 to-transparent" />
          <div className="absolute bottom-0 left-0 w-24 h-[1px] bg-gradient-to-r from-cyan-500/60 to-transparent" />
          
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-center">
            {/* Title & Brief */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-950/30 border border-purple-500/30 rounded text-[9px] font-bold text-purple-300 font-mono tracking-wider uppercase mb-3">
                <Crown size={10} className="text-purple-400" />
                Next Interview Selection
              </div>
              
              <h1 
                className="text-white font-black text-3xl sm:text-4xl md:text-5xl uppercase tracking-wider mb-4 leading-none"
                style={{ fontFamily: '"Anton", "Barlow Condensed", sans-serif', letterSpacing: '0.04em' }}
              >
                MEET THE PROS
              </h1>
              
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-2xl">
                Get inside the professional MLBB scene. Cast your vote to decide who we interview next. Top-tier coaches and professional players will reveal their meta-rotations, drafting strategies, and secret lane guides based on your choices.
              </p>
            </div>

            {/* Live Statistics Panel */}
            <div className="border border-white/5 bg-[#05060b] p-4 rounded-xl flex flex-col justify-between gap-4 relative">
              {/* Scanline detailing */}
              <div className="absolute top-2 left-2 text-[#444] font-mono text-[7px]">HUD_SYS_v2.4</div>
              
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={10} className="text-purple-400" />
                  Voting Terminal Status
                </span>
                <span className="font-mono text-[9px] text-[#e8a000] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e8a000]" />
                  Active Season
                </span>
              </div>

              {/* Ticker HUD counters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950/50 border border-white/[0.03] p-2.5 rounded text-center">
                  <span className="block font-mono text-[8px] text-zinc-500 uppercase tracking-widest">Total Votes Cast</span>
                  <span className="block font-mono font-black text-xl text-white mt-1">
                    {loading ? (
                      <Loader2 size={16} className="animate-spin text-purple-400 mx-auto" />
                    ) : (
                      stats?.totalVotes.toLocaleString() || '0'
                    )}
                  </span>
                </div>

                <div className="bg-zinc-950/50 border border-white/[0.03] p-2.5 rounded text-center">
                  <span className="block font-mono text-[8px] text-zinc-500 uppercase tracking-widest">Time Remaining</span>
                  <div className="font-mono font-black text-xs text-purple-400 mt-1.5 tracking-wider uppercase">
                    {timeLeft.days}d : {timeLeft.hours}h : {timeLeft.minutes}m
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-zinc-500 text-center font-mono leading-normal">
                {sessionStatus === 'authenticated' ? (
                  <span className="text-cyan-400/80">Authorized Account: {session.user?.ign}</span>
                ) : (
                  <span>Visitors can view real-time standings. Sign in to vote.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* LOADING TERMINAL STATE */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-900 bg-[#05060b]/50 rounded-2xl">
            <Loader2 size={36} className="animate-spin text-purple-500" />
            <p className="font-mono text-xs text-zinc-500 tracking-wider uppercase">Syncing with secure voting terminal...</p>
          </div>
        )}

        {!loading && stats && (
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 bg-[#080911] border border-white/5 p-1 rounded-lg">
              {['ALL', 'PROS', 'COMMUNITY'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat as any)}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-mono font-bold tracking-widest uppercase transition-all duration-300 ${
                    activeCategory === cat 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <button
                onClick={() => handleResetVotes()}
                disabled={resettingId === 'ALL'}
                className="px-4 py-2 bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 hover:border-red-500/60 text-red-400 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2"
              >
                {resettingId === 'ALL' ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
                Reset All Round Votes
              </button>
            )}
          </div>
        )}

        {/* PRO CANDIDATES CARD GRID */}
        {!loading && stats && (
          <div className="space-y-12">
            {Object.entries(
              stats.candidates
                .filter(c => {
                  if (activeCategory === 'COMMUNITY') return c.isCommunity;
                  if (activeCategory === 'PROS') return !c.isCommunity;
                  return true;
                })
                .reduce((acc, candidate) => {
                  const team = candidate.team || 'Free Agents';
                  if (!acc[team]) acc[team] = [];
                  acc[team].push(candidate);
                  return acc;
                }, {} as Record<string, typeof stats.candidates>)
            ).map(([teamName, teamCandidates]) => (
              <div key={teamName}>
                <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6 border-b border-white/10 pb-3 flex items-center gap-3">
                  <Shield size={20} className="text-purple-400" />
                  {teamName}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                  {teamCandidates.map((candidate, idx) => {
                    const hasUserVotedThis = stats.userVotedId === candidate.id;
                    const isUserVotedOther = stats.userVotedId !== null && !hasUserVotedThis;
                    
                    return (
                      <div 
                        key={candidate.id}
                        className={`group relative flex flex-col bg-[#07080f]/90 border rounded-2xl overflow-hidden transition-all duration-300 ${
                          hasUserVotedThis 
                            ? 'border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.06)] bg-[#070914]' 
                            : 'border-white/[0.04] hover:border-purple-500/25 hover:bg-[#090812]'
                        }`}
                      >
                        {/* Glowing dynamic background backlight based on candidate's avatar theme */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${candidate.avatar} opacity-[0.03] blur-3xl pointer-events-none transition-all duration-300 group-hover:opacity-[0.06]`} />
                        
                        {/* Decorative diagonal line for sci-fi look */}
                        <div className="absolute top-0 right-0 w-12 h-[1px] bg-white/10 rotate-45 translate-x-4 translate-y-2 pointer-events-none" />

                        {/* Header info bar */}
                        <div className="p-5 pb-3 flex items-start gap-4 border-b border-white/[0.03]">
                          {/* Player Image / Avatar */}
                          {candidate.photo ? (
                            <div className="w-14 h-14 rounded-lg bg-zinc-900 border border-white/10 overflow-hidden shrink-0 relative">
                              <img src={candidate.photo} alt={candidate.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${candidate.avatar} border border-white/10 flex items-center justify-center shrink-0`}>
                              <User size={24} className="text-white/50" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded font-mono text-[7px] font-bold tracking-widest uppercase border ${
                                  candidate.role === 'COACH' 
                                    ? 'bg-purple-950/20 border-purple-500/20 text-purple-400' 
                                    : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
                                }`}>
                                  {candidate.role}
                                </span>
                              </div>
                              {/* Rank indicator badge */}
                              <div className="w-6 h-6 shrink-0 rounded bg-zinc-950 border border-white/5 flex items-center justify-center font-mono text-[10px] font-black text-zinc-500">
                                #{idx + 1}
                              </div>
                            </div>
                            
                            <h3 className="text-white font-black text-lg tracking-wide uppercase leading-tight group-hover:text-purple-400 transition-colors">
                              {candidate.name}
                            </h3>
                            
                            <p className="text-zinc-500 text-[10px] tracking-wide mt-0.5 truncate uppercase">
                              {candidate.title}
                            </p>
                          </div>
                        </div>

                        {/* Body description & tags */}
                        <div className="p-5 flex-1 flex flex-col gap-4">
                          {/* Bio */}
                          <p className="text-zinc-400 text-xs leading-relaxed">
                            {candidate.bio}
                          </p>

                          {/* Key achievements list */}
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.achievements.map((ach, aIdx) => (
                              <span 
                                key={aIdx} 
                                className="px-2 py-0.5 bg-zinc-950 border border-white/[0.04] text-zinc-500 rounded font-mono text-[8px] uppercase tracking-wide flex items-center gap-1"
                              >
                                <Sparkles size={8} className="text-[#e8a000] shrink-0" />
                                {ach}
                              </span>
                            ))}
                          </div>

                          {/* Focus metric banner */}
                          <div className="bg-zinc-950/80 border border-white/[0.03] p-2.5 rounded-lg font-mono mt-auto">
                            <span className="block text-[7px] text-zinc-600 uppercase tracking-widest">Interview Focus Meta</span>
                            <span className="block text-[9px] text-zinc-300 mt-0.5 truncate uppercase">
                              {candidate.metaFocus}
                            </span>
                          </div>
                        </div>

                        {/* Standings Percent Bar & Buttons */}
                        <div className="p-5 pt-0 border-t border-white/[0.03] mt-auto">
                          {/* Live Meter Progress */}
                          <div className="mb-4 pt-4">
                            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mb-1.5">
                              <span className="uppercase tracking-widest flex items-center gap-1.5">
                                <Swords size={10} className="text-purple-400" />
                                Current Standings
                              </span>
                              <span className="font-bold text-white tabular-nums">
                                {candidate.votePercentage}% <span className="text-zinc-600 font-normal">({candidate.voteCount.toLocaleString()} votes)</span>
                              </span>
                            </div>
                            
                            {/* Custom themed progress bar */}
                            <div className="w-full h-2 bg-zinc-950 rounded overflow-hidden relative border border-white/5">
                              <motion.div 
                                className={`h-full bg-gradient-to-r rounded ${
                                  hasUserVotedThis
                                    ? 'from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                                    : 'from-purple-600 to-indigo-500'
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${candidate.votePercentage}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                              />
                            </div>
                          </div>

                          {/* Button trigger */}
                          {sessionStatus === 'unauthenticated' ? (
                            <button
                              type="button"
                              onClick={() => handleVote(candidate.id)}
                              className="w-full py-2.5 bg-zinc-900 border border-white/10 hover:border-purple-500/40 text-zinc-400 hover:text-white rounded-lg font-mono text-[9px] font-black tracking-widest uppercase hover:bg-purple-950/10 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              Login to Vote
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleVote(candidate.id)}
                              disabled={votingId !== null}
                              className={`w-full py-2.5 rounded-lg font-mono text-[9px] font-black tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                                hasUserVotedThis
                                  ? 'bg-cyan-950/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                  : 'bg-zinc-950/60 border border-white/5 text-zinc-400 hover:border-purple-500/40 hover:text-white hover:bg-purple-950/15'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {votingId === candidate.id ? (
                                <>
                                  <Loader2 size={11} className="animate-spin text-purple-400" />
                                  Transmitting...
                                </>
                              ) : hasUserVotedThis ? (
                                <>
                                  <CheckCircle2 size={11} className="text-cyan-400" />
                                  Voted
                                </>
                              ) : (
                                <>
                                  <Volume2 size={11} />
                                  Cast Vote
                                </>
                              )}
                            </button>
                          )}

                          {/* Admin Individual Reset */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleResetVotes(candidate.id)}
                              disabled={resettingId === candidate.id}
                              className="w-full mt-2 py-2 border border-red-500/20 text-red-500/60 hover:text-red-400 hover:bg-red-950/20 hover:border-red-500/50 rounded-lg font-mono text-[8px] font-black tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-1.5"
                            >
                              {resettingId === candidate.id ? <Loader2 size={10} className="animate-spin" /> : <Settings size={10} />}
                              Interview Done (Reset)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SCI-FI FOOTER HUD FAQ DETAILS */}
        {!loading && (
          <details className="mt-12 group border border-white/5 bg-[#07080d]/80 rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none text-zinc-500 hover:text-zinc-300 text-[10px] font-mono font-black tracking-widest uppercase transition-all">
              <span className="flex items-center gap-2">
                <HelpCircle size={12} className="text-purple-400" />
                Voter Protocol & Directives
              </span>
              <ChevronRight size={14} className="group-open:rotate-90 transition-transform text-zinc-600" />
            </summary>
            
            <div className="px-5 pb-5 text-zinc-500 text-xs space-y-3 font-mono leading-relaxed border-t border-white/[0.02] pt-4">
              <p>• Only active and verified logged-in BotsVille accounts are permitted to register selection votes.</p>
              <p>• Roster restriction: A user may only support exactly **one** active selection at a time.</p>
              <p>• Dynamically Toggled: You may change or withdraw your vote at any point prior to selection shutdown.</p>
              <p>• In the event of a tie when voting completes, both candidates will be booked for consecutive weekly masterclasses.</p>
              <p>• Once selection closes, direct interview schedules and outlines will be announced in the main Community Hub.</p>
            </div>
          </details>
        )}

      </div>
    </div>
  );
}
