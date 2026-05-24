'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Award, HelpCircle, Trophy, Volume2, 
  Flame, Zap, Play, CheckCircle2, Crown, Sparkles, ChevronRight, Swords, ChevronLeft
} from 'lucide-react';

type FeatureKey = 'PROFILES' | 'TRIVIA' | 'PROS' | 'TOURNAMENTS';

interface FeatureItem {
  id: FeatureKey;
  icon: React.ReactNode;
  badge: string;
  title: string;
  shortDesc: string;
  color: string;
  glowColor: string;
}

const FEATURES: FeatureItem[] = [
  {
    id: 'PROFILES',
    icon: <User className="w-5 h-5" />,
    badge: 'STATS HUD',
    title: 'Public Player Profiles',
    shortDesc: 'Flex your stats pro-style. Moonton Esports layout with KDA, Maniacs, and Savages.',
    color: '#06b6d4', // Cyan
    glowColor: 'rgba(6, 182, 212, 0.4)',
  },
  {
    id: 'TRIVIA',
    icon: <HelpCircle className="w-5 h-5" />,
    badge: 'PLAY TO WIN',
    title: 'Trivia Rankings',
    shortDesc: 'Climb leaderboards for Diamond Packs and Season Cash Prizes.',
    color: '#e8a000', // Gold
    glowColor: 'rgba(232, 160, 0, 0.4)',
  },
  {
    id: 'PROS',
    icon: <Volume2 className="w-5 h-5" />,
    badge: 'METASHIFT',
    title: 'Meet the Pros',
    shortDesc: 'Rotations, secret drafting, and meta guides directly from top-tier coaches.',
    color: '#a855f7', // Purple
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  {
    id: 'TOURNAMENTS',
    icon: <Trophy className="w-5 h-5" />,
    badge: 'Role Prizes',
    title: 'Sponsored Tournaments',
    shortDesc: 'Massive cash pools with dedicated Roamer, Jungler, and Gold Laner rewards.',
    color: '#ef4444', // Red
    glowColor: 'rgba(239, 68, 68, 0.4)',
  },
];

const FALLBACK_PLAYERS = [
  {
    rank: 1,
    mvpCount: 14,
    kda: 8.42,
    winRate: 0.724,
    hero: 'Chou',
    player: {
      ign: 'SKYLER',
      role: 'EXP',
      team: { tag: 'BOTS' }
    }
  },
  {
    rank: 2,
    mvpCount: 11,
    kda: 7.15,
    winRate: 0.682,
    hero: 'Ling',
    player: {
      ign: 'MAMBA',
      role: 'JUNGLE',
      team: { tag: 'VLT' }
    }
  },
  {
    rank: 3,
    mvpCount: 9,
    kda: 6.89,
    winRate: 0.655,
    hero: 'Lolita',
    player: {
      ign: 'ZEUS',
      role: 'ROAM',
      team: { tag: 'OP' }
    }
  }
];

export const RoadmapUpdates = () => {
  const [activeTab, setActiveTab] = useState<FeatureKey>('PROFILES');
  const [activeRoleTab, setActiveRoleTab] = useState<'JUNGLER' | 'ROAMER' | 'GOLD'>('JUNGLER');
  
  // Player profiles leaderboard integration
  const [players, setPlayers] = useState<any[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState<number>(0);
  const [loadingPlayers, setLoadingPlayers] = useState<boolean>(true);
  const [manualInteractionCount, setManualInteractionCount] = useState<number>(0);

  // Fetch real players from the backend leaderboard database
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch('/api/leaderboards/players?limit=5');
        const data = await res.json();
        if (data?.rankings && Array.isArray(data.rankings) && data.rankings.length > 0) {
          setPlayers(data.rankings);
        }
      } catch (err) {
        console.error('Failed to fetch player stats for roadmap profiles:', err);
      } finally {
        setLoadingPlayers(false);
      }
    };
    fetchPlayers();
  }, []);

  const displayPlayers = players.length > 0 ? players : FALLBACK_PLAYERS;
  const currentPlayer = displayPlayers.length > 0 ? displayPlayers[activePlayerIdx % displayPlayers.length] : null;

  // Auto cycle through profiles when activeTab is PROFILES, reset timer on manual click
  useEffect(() => {
    if (activeTab !== 'PROFILES' || displayPlayers.length <= 1) return;
    const interval = setInterval(() => {
      setActivePlayerIdx(prev => (prev + 1) % displayPlayers.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [activeTab, displayPlayers.length, manualInteractionCount]);

  return (
    <section className="relative bg-[#05060b] overflow-hidden py-16 border-t border-cyan-500/10">
      {/* Visual Backlight Ambient Vignettes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[150px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/[0.03] blur-[150px]" />
        {/* Retro Grid Background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-12 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/30 border border-cyan-500/25 rounded font-mono text-[9px] text-cyan-400 tracking-[0.2em] uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            MPL ROADMAP EXPANSION
          </div>
          <h2 
            className="text-white font-black text-3xl md:text-4xl tracking-wider uppercase mb-3"
            style={{ fontFamily: '"Anton", "Barlow Condensed", sans-serif', letterSpacing: '0.06em' }}
          >
            THE NEXT LEVEL IS HERE
          </h2>
          <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
            We are bringing the professional MPL esports experience straight to your screens. Check out the massive new upgrades dropping soon.
          </p>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-12 bg-cyan-500/[0.04] blur-2xl pointer-events-none" />
        </div>

        {/* Console layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 items-stretch">
          
          {/* LEFT: 4 Clickable Cards */}
          <div className="flex flex-col gap-3 justify-center">
            {FEATURES.map((item) => {
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative text-left w-full p-4 rounded-xl border transition-all duration-300 overflow-hidden flex gap-4 items-start ${
                    isActive 
                      ? 'bg-[#0a0c16]/95 shadow-[0_0_25px_rgba(6,182,212,0.06)]' 
                      : 'bg-zinc-950/40 hover:bg-zinc-950/80 border-white/[0.04] hover:border-white/[0.08]'
                  }`}
                  style={{
                    borderColor: isActive ? item.color : 'rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Neon Glow edge (active) */}
                  {isActive && (
                    <div 
                      className="absolute inset-y-0 left-0 w-[3px]" 
                      style={{ backgroundColor: item.color }} 
                    />
                  )}

                  {/* Left Side Icon Hex */}
                  <div 
                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border transition-colors duration-300"
                    style={{
                      backgroundColor: isActive ? `${item.color}15` : 'rgba(255,255,255,0.02)',
                      borderColor: isActive ? `${item.color}35` : 'rgba(255,255,255,0.08)',
                      color: isActive ? item.color : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {item.icon}
                  </div>

                  {/* Text descriptions */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="font-mono text-[7px] font-bold tracking-[0.16em] uppercase px-1.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: isActive ? `${item.color}10` : 'rgba(255,255,255,0.02)',
                          borderColor: isActive ? `${item.color}20` : 'rgba(255,255,255,0.05)',
                          color: isActive ? item.color : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {item.badge}
                      </span>
                      {isActive && (
                        <motion.span 
                          layoutId="pulse-beacon"
                          className="w-1 h-1 rounded-full bg-green-500" 
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                    </div>
                    
                    <h3 
                      className="text-sm font-bold uppercase tracking-wide transition-colors"
                      style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)' }}
                    >
                      {item.title}
                    </h3>
                    
                    <p className="text-zinc-500 text-[11px] mt-1 leading-relaxed line-clamp-2 group-hover:text-zinc-400 transition-colors">
                      {item.shortDesc}
                    </p>
                  </div>

                  {/* Corner indicator */}
                  <div className="self-center shrink-0">
                    <ChevronRight 
                      className="w-4 h-4 transition-all duration-300"
                      style={{
                        transform: isActive ? 'translateX(2px)' : 'none',
                        color: isActive ? item.color : 'rgba(255,255,255,0.15)',
                      }}
                    />
                  </div>

                  {/* Ambient background glow inside the card */}
                  {isActive && (
                    <div 
                      className="absolute right-0 bottom-0 w-32 h-32 rounded-full opacity-[0.06] blur-2xl pointer-events-none"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* RIGHT: Console Holographic Display Screen */}
          <div className="relative rounded-2xl border border-cyan-500/25 bg-[#04060d]/90 p-6 flex flex-col justify-between overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.04)] min-h-[380px] lg:min-h-[440px]">
            {/* Scanlines Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-30"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,#fff 2px,#fff 3px)', backgroundSize: '100% 3px' }} />
            
            {/* Display screen corners decoration */}
            <div className="absolute top-3 left-3 text-cyan-400/30 font-mono text-[7px]">SYS_SCREEN_01</div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-[7px] text-cyan-400/50">LIVE LINK</span>
            </div>
            <div className="absolute bottom-3 left-3 text-cyan-400/20 font-mono text-[6px]">REFRESH_RATE: 120HZ</div>
            <div className="absolute bottom-3 right-3 text-cyan-400/20 font-mono text-[6px]">BOTSVILLE_SYS</div>

            {/* Screen Inner Content (Animated based on active tab) */}
            <div className="relative w-full h-[295px] flex flex-col justify-center items-center z-10 shrink-0 select-none overflow-hidden">
              <AnimatePresence mode="wait">
                
                {/* 1. MOCK PLAYER CARD SCREEN */}
                {activeTab === 'PROFILES' && (() => {
                  const currentPlayerPhoto = currentPlayer?.player?.photo || currentPlayer?.player?.user?.photo || '';
                  const currentPlayerIgn = currentPlayer?.player?.ign || 'SKYLER';
                  const currentPlayerRole = currentPlayer?.player?.role || 'EXP';
                  const currentPlayerTeamTag = currentPlayer?.player?.team?.tag || 'BOTS';
                  const currentPlayerKda = currentPlayer?.kda !== undefined ? currentPlayer.kda : 8.42;
                  const currentPlayerWinRate = currentPlayer?.winRate !== undefined ? currentPlayer.winRate : 0.724;
                  const currentPlayerHero = currentPlayer?.player?.signatureHero || currentPlayer?.hero || 'Chou';
                  const currentPlayerMvpCount = currentPlayer?.mvpCount !== undefined ? currentPlayer.mvpCount : 14;
                  const currentPlayerRank = currentPlayer?.rank !== undefined ? currentPlayer.rank : 1;

                  return (
                    <motion.div
                      key={`profile-${activePlayerIdx}`}
                      initial={{ opacity: 0, scale: 0.94, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -10 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="w-full max-w-[310px] relative"
                    >
                      {/* Glowing stats card card frame */}
                      <div className="absolute -inset-2 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-2xl blur-xl opacity-30 pointer-events-none" />
                      
                      <div className="relative border border-cyan-500/30 bg-[#070914] p-4 rounded-xl overflow-hidden">
                        {/* Diagonal aesthetic lines */}
                        <div className="absolute top-0 right-0 w-16 h-[2px] bg-cyan-400/30 transform rotate-45 translate-x-4 translate-y-4" />
                        
                        {/* Player Profile Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="relative w-12 h-12 rounded-lg bg-zinc-900 border border-cyan-500/30 flex items-center justify-center overflow-hidden shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-transparent" />
                            {currentPlayerPhoto ? (
                              <img 
                                src={currentPlayerPhoto} 
                                alt={currentPlayerIgn} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <User className="w-6 h-6 text-cyan-400" />
                            )}
                            {/* Mini rank icon overlay */}
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#e8a000] rounded-sm flex items-center justify-center font-mono text-[6px] font-black text-black">
                              #{currentPlayerRank}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-white font-black text-sm tracking-widest uppercase truncate">
                              {currentPlayerIgn} 
                              <span className="text-[10px] text-zinc-500 ml-1.5 font-mono">
                                [{currentPlayerTeamTag}]
                              </span>
                            </h4>
                            <p className="text-cyan-400 font-mono text-[8px] tracking-wide uppercase mt-0.5">
                              ROLE: {currentPlayerRole} LANER
                            </p>
                          </div>
                        </div>

                        {/* Main KDA Box */}
                        <div className="bg-cyan-950/20 border border-cyan-500/15 p-3 rounded-lg flex items-center justify-around mb-3 relative">
                          <div className="text-center">
                            <span className="block font-mono text-[7px] text-zinc-500 uppercase tracking-widest">KDA Ratio</span>
                            <span className="block font-black text-lg text-white font-mono mt-0.5">
                              {typeof currentPlayerKda === 'number' ? currentPlayerKda.toFixed(2) : currentPlayerKda}
                            </span>
                          </div>
                          <div className="h-6 w-px bg-cyan-500/20" />
                          <div className="text-center">
                            <span className="block font-mono text-[7px] text-zinc-500 uppercase tracking-widest">W/L Rate</span>
                            <span className="block font-black text-lg text-cyan-400 font-mono mt-0.5">
                              {typeof currentPlayerWinRate === 'number' ? `${(currentPlayerWinRate * 100).toFixed(1)}%` : '72.4%'}
                            </span>
                          </div>
                        </div>

                        {/* Moonton inspired special achievements banner */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#05060b] border border-white/5 p-2 rounded flex flex-col items-center">
                            <Flame className="w-4 h-4 text-amber-500 mb-1" />
                            <span className="text-[7px] text-zinc-500 uppercase font-mono">SIGNATURE HERO</span>
                            <span className="text-[10px] font-black text-white font-mono mt-0.5 truncate uppercase max-w-full">
                              {currentPlayerHero}
                            </span>
                          </div>
                          <div className="bg-[#05060b] border border-white/5 p-2 rounded flex flex-col items-center">
                            <Crown className="w-4 h-4 text-[#e8a000] mb-1 animate-pulse" />
                            <span className="text-[7px] text-zinc-500 uppercase font-mono">MVP AWARDS</span>
                            <span className="text-[10px] font-black text-[#e8a000] font-mono mt-0.5 uppercase">
                              {currentPlayerMvpCount} MVPS
                            </span>
                          </div>
                        </div>

                        {/* Sci-fi paginator control deck */}
                        <div className="mt-3.5 pt-2.5 border-t border-cyan-500/10 flex items-center justify-between font-mono text-[8px] text-zinc-500 select-none">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setManualInteractionCount(prev => prev + 1);
                              setActivePlayerIdx(prev => (prev - 1 + displayPlayers.length) % displayPlayers.length);
                            }}
                            className="p-1 hover:text-cyan-400 active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
                          >
                            <ChevronLeft className="w-3 h-3" />
                            PREV
                          </button>
                          <span className="uppercase tracking-[0.15em] text-[7px] text-cyan-400/70 font-black">
                            LEADERBOARD {activePlayerIdx + 1} / {displayPlayers.length}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setManualInteractionCount(prev => prev + 1);
                              setActivePlayerIdx(prev => (prev + 1) % displayPlayers.length);
                            }}
                            className="p-1 hover:text-cyan-400 active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
                          >
                            NEXT
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* 2. DIAMOND TRIVIA REWARDS SCREEN */}
                {activeTab === 'TRIVIA' && (
                  <motion.div
                    key="trivia"
                    initial={{ opacity: 0, scale: 0.94, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="w-full max-w-[310px] flex flex-col gap-4"
                  >
                    {/* Glowing diamond chest preview */}
                    <div className="relative border border-amber-500/30 bg-[#0c0906] p-4 rounded-xl flex items-center gap-4 overflow-hidden">
                      {/* Chest halo backlights */}
                      <div className="absolute top-1/2 left-6 -translate-y-1/2 w-16 h-16 bg-[#e8a000]/25 rounded-full blur-xl animate-pulse pointer-events-none" />
                      
                      {/* Left icon wrapper */}
                      <div className="relative w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0 overflow-hidden">
                        <Sparkles className="w-6 h-6 text-[#e8a000]" />
                      </div>
                      
                      {/* Diamond pack description */}
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[7px] text-amber-500 font-bold uppercase tracking-widest">REWARD TIER</span>
                        <h4 className="text-white font-black text-sm uppercase tracking-wider mt-0.5">DIAMOND PACKS</h4>
                        <p className="text-zinc-500 text-[10px] leading-relaxed mt-0.5">Climb the trivia charts weekly to secure premium packs.</p>
                      </div>
                    </div>

                    {/* Leaderboard snapshot */}
                    <div className="border border-white/5 bg-[#05060b]/60 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                        <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest">TRIVIA LEADERBOARD</span>
                        <span className="font-mono text-[8px] text-amber-500">₵500 PRIZE POOL</span>
                      </div>

                      {[
                        { rank: 1, ign: 'Mamba_24', score: '98 PTS', prize: '250💎 + Cash' },
                        { rank: 2, ign: 'Vixen_G', score: '92 PTS', prize: '100💎 + Cash' },
                        { rank: 3, ign: 'Zeus_OP', score: '89 PTS', prize: '50💎' },
                      ].map((item) => (
                        <div key={item.rank} className="flex items-center gap-2.5 text-[10px] text-zinc-300 font-mono py-0.5">
                          <span className={`w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-black text-black shrink-0 ${
                            item.rank === 1 ? 'bg-[#e8a000]' : item.rank === 2 ? 'bg-zinc-400' : 'bg-amber-800'
                          }`}>
                            {item.rank}
                          </span>
                          <span className="font-bold flex-1 truncate">{item.ign}</span>
                          <span className="text-zinc-500 shrink-0">{item.score}</span>
                          <span className="text-amber-500 shrink-0 font-bold">{item.prize}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 3. PROS AUDIO INTERVIEW SCREEN */}
                {activeTab === 'PROS' && (
                  <motion.div
                    key="pros"
                    initial={{ opacity: 0, scale: 0.94, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="w-full max-w-[310px] flex flex-col gap-4"
                  >
                    {/* Media Mockup Player */}
                    <div className="relative border border-purple-500/20 bg-[#0c0914] rounded-xl p-4 overflow-hidden">
                      {/* Dynamic audio waves spectrum */}
                      <div className="flex gap-[4px] items-end justify-center h-16 mb-4">
                        <style>{`
                          @keyframes audioWave {
                            0%, 100% { height: 15%; }
                            50% { height: 85%; }
                          }
                          .audio-bar {
                            animation: audioWave ease-in-out infinite;
                          }
                        `}</style>
                        {[
                          { duration: '1.0s', delay: '0.1s' },
                          { duration: '1.4s', delay: '0.3s' },
                          { duration: '0.8s', delay: '0.0s' },
                          { duration: '1.2s', delay: '0.5s' },
                          { duration: '0.9s', delay: '0.2s' },
                          { duration: '1.5s', delay: '0.4s' },
                          { duration: '1.1s', delay: '0.7s' },
                          { duration: '0.7s', delay: '0.1s' },
                          { duration: '1.3s', delay: '0.6s' },
                          { duration: '1.0s', delay: '0.3s' },
                          { duration: '1.2s', delay: '0.2s' },
                          { duration: '0.8s', delay: '0.4s' },
                        ].map((bar, i) => (
                          <div 
                            key={i} 
                            className="w-[3px] bg-purple-500 rounded-full audio-bar"
                            style={{ 
                              animationDuration: bar.duration,
                              animationDelay: bar.delay,
                              boxShadow: '0 0 10px rgba(168, 85, 247, 0.4)'
                            }}
                          />
                        ))}
                      </div>

                      {/* Interview details metadata */}
                      <div className="flex items-center justify-between border-t border-purple-500/10 pt-3">
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-[7px] text-purple-400 font-bold uppercase tracking-widest">NOW PLAYING: PRO MASTERCLASS</span>
                          <h4 className="text-white font-black text-sm uppercase tracking-wide truncate mt-0.5">COACH YEB: DRAFT SECRETS</h4>
                          <p className="text-zinc-500 text-[10px] truncate mt-0.5">Learn professional map rotations & lane cuts</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center shrink-0 cursor-pointer shadow-lg shadow-purple-600/30">
                          <Play className="w-3 h-3 text-black fill-black ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Meta topics checklists */}
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                      {[
                        { title: 'Drafting secrets', desc: 'Moonton counters' },
                        { title: 'Lane rotations', desc: 'Jungler timings' },
                        { title: 'Item prioritization', desc: 'Defense scaling' },
                        { title: 'Team comm guides', desc: 'MPL match comms' },
                      ].map((s, idx) => (
                        <div key={idx} className="border border-white/5 bg-[#05060b]/40 rounded p-2 flex gap-1.5 items-start">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-white font-bold uppercase tracking-wide leading-tight">{s.title}</p>
                            <p className="text-zinc-500 mt-0.5">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 4. TOURNAMENT ROLE REWARDS SCREEN */}
                {activeTab === 'TOURNAMENTS' && (
                  <motion.div
                    key="tournaments"
                    initial={{ opacity: 0, scale: 0.94, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="w-full max-w-[310px] flex flex-col gap-4"
                  >
                    {/* Main Trophy Showcase */}
                    <div className="relative border border-red-500/20 bg-[#140909] rounded-xl p-4 overflow-hidden flex items-center gap-4">
                      <div className="absolute top-1/2 left-6 -translate-y-1/2 w-16 h-16 bg-red-500/25 rounded-full blur-xl animate-pulse pointer-events-none" />
                      
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0 overflow-hidden">
                        <Swords className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[7px] text-red-500 font-bold uppercase tracking-widest">ACTIVE UPGRADE</span>
                        <h4 className="text-white font-black text-sm uppercase tracking-wide mt-0.5">ROLE-BASED PRIZES</h4>
                        <p className="text-zinc-500 text-[10px] mt-0.5">Earn premium rewards for dominating specific lanes.</p>
                      </div>
                    </div>

                    {/* Role tabs and details */}
                    <div className="border border-white/5 bg-[#05060b]/60 rounded-xl p-3 flex flex-col gap-3">
                      {/* Role selection tab bar */}
                      <div className="grid grid-cols-3 gap-1 bg-[#09090e] p-0.5 rounded border border-white/5">
                        {[
                          { id: 'JUNGLER', label: 'JUNGLER' },
                          { id: 'ROAMER', label: 'ROAMER' },
                          { id: 'GOLD', label: 'GOLD LANER' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveRoleTab(t.id as any)}
                            className={`py-1 text-[8px] font-mono font-black uppercase text-center rounded transition-all duration-200 ${
                              activeRoleTab === t.id 
                                ? 'bg-red-600 text-white' 
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Active role contents details */}
                      <div className="bg-red-950/10 border border-red-500/10 p-2.5 rounded font-mono text-[9px]">
                        <AnimatePresence mode="wait">
                          {activeRoleTab === 'JUNGLER' && (
                            <motion.div
                              key="jungler"
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 5 }}
                              transition={{ duration: 0.18 }}
                              className="flex flex-col gap-1.5"
                            >
                              <div className="flex justify-between items-center text-red-400 font-bold">
                                <span>🏆 TOP JUNGLER AWARD</span>
                                <span>500 💎</span>
                              </div>
                              <p className="text-zinc-400 text-[9px] leading-relaxed">
                                Awarded to the player with the highest total Jungler performance rating, KDA ratio, and turtle/lord objectives secured at the end of the tournament season cycle.
                              </p>
                            </motion.div>
                          )}
                          {activeRoleTab === 'ROAMER' && (
                            <motion.div
                              key="roamer"
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 5 }}
                              transition={{ duration: 0.18 }}
                              className="flex flex-col gap-1.5"
                            >
                              <div className="flex justify-between items-center text-red-400 font-bold">
                                <span>🏆 BEST ROAMER AWARD</span>
                                <span>500 💎</span>
                              </div>
                              <p className="text-zinc-400 text-[9px] leading-relaxed">
                                Awarded to the top-ranked Roamer based on team assist metrics, crowd-control contributions, match-saving saves, and map vision scores recorded live in match lobby sessions.
                              </p>
                            </motion.div>
                          )}
                          {activeRoleTab === 'GOLD' && (
                            <motion.div
                              key="gold"
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 5 }}
                              transition={{ duration: 0.18 }}
                              className="flex flex-col gap-1.5"
                            >
                              <div className="flex justify-between items-center text-red-400 font-bold">
                                <span>🏆 GOLD LANER OF THE SEASON</span>
                                <span>500 💎</span>
                              </div>
                              <p className="text-zinc-400 text-[9px] leading-relaxed">
                                Awarded to the top marksman displaying elite scaling mechanics, highest damage dealt per minute, and turret siege statistics throughout the championship matches.
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
            
            {/* Action CTAs */}
            <div className="relative z-10 border-t border-cyan-500/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <span className="block font-mono text-[7px] text-zinc-500 uppercase tracking-widest">STATUS UPDATE</span>
                <span className="block text-[10px] font-black text-white uppercase tracking-wider mt-0.5">LAUNCHING NEXT MAJOR DEPLOYMENT</span>
              </div>
              {(() => {
                let href = '#';
                let label = 'STAY TUNED';
                
                if (activeTab === 'PROS') {
                  href = '/pros';
                  label = 'VOTE FOR INTERVIEW';
                } else if (activeTab === 'TRIVIA') {
                  href = '/leaderboard/trivia';
                  label = 'VIEW TRIVIA RANKINGS';
                } else if (activeTab === 'PROFILES') {
                  href = '/leaderboard';
                  label = 'VIEW LEADERBOARD';
                } else if (activeTab === 'TOURNAMENTS') {
                  href = '/tournaments';
                  label = 'VIEW TOURNAMENTS';
                }

                return (
                  <Link
                    href={href}
                    className="w-full sm:w-auto px-4 py-2 border border-cyan-500/30 text-cyan-400 bg-cyan-950/20 font-mono text-[9px] font-black tracking-widest uppercase hover:bg-cyan-500/10 rounded transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {label}
                    <ChevronRight size={10} />
                  </Link>
                );
              })()}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
