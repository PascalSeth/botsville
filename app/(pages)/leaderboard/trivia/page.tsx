'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Trophy, Sparkles, Medal, Search, 
  HelpCircle, ChevronLeft, ArrowRight, Activity, 
  TrendingUp, RefreshCcw, Loader2, Play
} from 'lucide-react';

interface TriviaRank {
  id: string;
  rank: number;
  ign: string;
  photo: string | null;
  region: string | null;
  rankBadge: string | null;
  mainRole: string;
  totalAnswers: number;
  correctAnswers: number;
  totalXp: number;
  accuracy: number;
  lastActiveAt: string | null;
}

const FALLBACK_RANKINGS: TriviaRank[] = [
  {
    id: 'f1',
    rank: 1,
    ign: 'SKYLER',
    photo: '/heroes/stun.png',
    region: 'Accra',
    rankBadge: 'Mythical Glory',
    mainRole: 'EXP',
    totalAnswers: 30,
    correctAnswers: 28,
    totalXp: 280,
    accuracy: 93,
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'f2',
    rank: 2,
    ign: 'Mamba_24',
    photo: null,
    region: 'Kumasi',
    rankBadge: 'Mythical Honor',
    mainRole: 'JUNGLE',
    totalAnswers: 28,
    correctAnswers: 25,
    totalXp: 250,
    accuracy: 89,
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'f3',
    rank: 3,
    ign: 'Vixen_G',
    photo: null,
    region: 'Accra',
    rankBadge: 'Mythic',
    mainRole: 'MAGE',
    totalAnswers: 25,
    correctAnswers: 22,
    totalXp: 220,
    accuracy: 88,
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'f4',
    rank: 4,
    ign: 'Zeus_OP',
    photo: null,
    region: 'Tema',
    rankBadge: 'Legend',
    mainRole: 'ROAM',
    totalAnswers: 24,
    correctAnswers: 19,
    totalXp: 190,
    accuracy: 79,
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'f5',
    rank: 5,
    ign: 'Kraken',
    photo: null,
    region: 'Takoradi',
    rankBadge: 'Mythic',
    mainRole: 'MARKSMAN',
    totalAnswers: 22,
    correctAnswers: 17,
    totalXp: 170,
    accuracy: 77,
    lastActiveAt: new Date().toISOString(),
  }
];

const RECENT_ACTIVITIES = [
  { id: 1, user: 'Skyler', action: 'answered "OG Heroes" trivia correctly!', time: '2m ago', correct: true },
  { id: 2, user: 'Mamba_24', action: 'answered "Lore" trivia correctly!', time: '12m ago', correct: true },
  { id: 3, user: 'Vixen_G', action: 'answered "Emoji Guess" trivia!', time: '25m ago', correct: false },
  { id: 4, user: 'GamerX', action: 'earned "Trivia Novice" badge!', time: '1h ago', correct: true },
  { id: 5, user: 'Zeus_OP', action: 'answered "Skin Trivia" correctly!', time: '2h ago', correct: true },
];

export default function TriviaRankingPage() {
  const [rankings, setRankings] = useState<TriviaRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRankings = async () => {
    try {
      const res = await fetch('/api/leaderboards/trivia');
      const data = await res.json();
      if (data?.rankings && Array.isArray(data.rankings) && data.rankings.length > 0) {
        setRankings(data.rankings);
      } else {
        setRankings(FALLBACK_RANKINGS);
      }
    } catch (err) {
      console.error('Failed to fetch trivia rankings:', err);
      setRankings(FALLBACK_RANKINGS);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRankings();
  };

  const filteredRankings = rankings.filter((item) =>
    item.ign.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const podium1 = filteredRankings[0] || null;
  const podium2 = filteredRankings[1] || null;
  const podium3 = filteredRankings[2] || null;
  const listPlayers = filteredRankings.slice(3);

  return (
    <main className="min-h-screen bg-[#05060b] text-white selection:bg-[#e8a000]/30 pb-20 relative overflow-hidden">
      
      {/* Decorative Cyberpunk Background overlays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[10%] left-[-15%] w-[600px] h-[600px] rounded-full bg-[#e8a000]/[0.02] blur-[160px]" />
        <div className="absolute bottom-[20%] right-[-15%] w-[600px] h-[600px] rounded-full bg-amber-500/[0.02] blur-[160px]" />
        {/* Scanning grid */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(232, 160, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(232, 160, 0, 0.08) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pt-8">
        
        {/* Navigation Return Hook */}
        <Link 
          href="/leaderboard" 
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/[0.04] text-[10px] uppercase tracking-widest font-black text-zinc-400 hover:text-white hover:border-[#e8a000]/30 transition-all duration-300 mb-8 active:scale-[0.98]"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Leaderboards
        </Link>

        {/* Hero Section Banner */}
        <div className="relative border border-amber-500/10 rounded-2xl bg-[#0a0806]/85 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden mb-12 shadow-2xl">
          {/* Neon gold side-glow */}
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#e8a000] to-amber-600" />
          
          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/25 font-mono text-[9px] text-[#e8a000] tracking-[0.2em] uppercase mb-4">
              <Brain className="w-3 h-3 animate-pulse" />
              PLAY TO WIN REWARDS
            </div>
            <h1 
              className="text-4xl md:text-5xl font-black uppercase tracking-wide text-white leading-none italic mb-3"
              style={{ letterSpacing: '0.04em' }}
            >
              TRIVIA CHAMPIONS
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm max-w-xl leading-relaxed">
              Show off your Mobile Legends lore, hero skills, and skins mastery. Dominate the rankings daily to claim cash prizes and premium diamond bundles at the end of the season.
            </p>
          </div>

          {/* Seasonal Prize Bezel */}
          <div className="shrink-0 w-full md:w-auto p-5 rounded-xl border border-amber-500/25 bg-[#0f0b07] shadow-xl relative overflow-hidden flex flex-col justify-center items-center md:items-start">
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-[#e8a000]/10 rounded-full blur-2xl" />
            <span className="font-mono text-[8px] text-[#e8a000] font-black uppercase tracking-widest mb-1">SEASON REWARDS</span>
            <p className="text-2xl font-black italic uppercase text-white leading-none">₵500.00 CASH</p>
            <p className="text-sm font-bold text-amber-500 mt-1 flex items-center gap-1 uppercase tracking-tight">
              <Sparkles className="w-3.5 h-3.5" /> + 500 Diamonds Bundle
            </p>
            <div className="h-[1px] w-full bg-white/[0.08] my-3" />
            <span className="text-[9px] text-zinc-500 font-mono">SEASON ENDS IN: 8 DAYS</span>
          </div>
        </div>

        {loading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#e8a000] mb-4" />
            <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Synchronizing Standings...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-8 items-start">
            
            {/* LEFT: Leaderboard Podium and Grid */}
            <div className="space-y-12">
              
              {/* Top 3 Podium Displays */}
              <div className="grid grid-cols-3 gap-3 md:gap-6 items-end max-w-2xl mx-auto pt-6 px-2">
                
                {/* 2nd Place: Silver Stand */}
                {podium2 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative group flex flex-col items-center">
                      {/* Avatar Frame with Silver Bezel */}
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-slate-400 p-1 relative bg-[#0a0a0f] flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105">
                        <img 
                          src={podium2.photo || '/heroes/stun.png'} 
                          alt={podium2.ign} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                        <div className="absolute -bottom-1 -right-1 bg-slate-400 text-black font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#05060b]">
                          2
                        </div>
                      </div>
                      
                      {/* IGN & Stats */}
                      <div className="text-center mt-3">
                        <h4 className="font-black text-xs md:text-sm uppercase tracking-tight text-white">{podium2.ign}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{podium2.totalXp} XP</p>
                        <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">{podium2.accuracy}% ACC</p>
                      </div>
                    </div>
                    {/* Stand base */}
                    <div className="w-full h-12 md:h-16 mt-4 bg-gradient-to-b from-[#151720] to-[#0d0e14] border-t border-slate-400/30 rounded-t-lg relative flex items-center justify-center">
                      <div className="absolute bottom-1 w-4/5 h-[1px] bg-slate-400/20" />
                      <Medal className="w-5 h-5 text-slate-400 opacity-60" />
                    </div>
                  </motion.div>
                )}

                {/* 1st Place: Golden Stand */}
                {podium1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center -translate-y-4"
                  >
                    <Trophy className="w-6 h-6 text-[#e8a000] mb-2 animate-bounce" />
                    <div className="relative group flex flex-col items-center">
                      {/* Avatar Frame with Gold Bezel */}
                      <div className="w-20 h-20 md:w-26 md:h-26 rounded-full border-4 border-[#e8a000] p-1.5 relative bg-[#0a0a0f] flex items-center justify-center shadow-[0_0_30px_rgba(232,160,0,0.25)] transition-transform duration-300 group-hover:scale-105">
                        <img 
                          src={podium1.photo || '/heroes/stun.png'} 
                          alt={podium1.ign} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                        <div className="absolute -bottom-1 -right-1 bg-[#e8a000] text-black font-black text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#05060b]">
                          1
                        </div>
                      </div>
                      
                      {/* IGN & Stats */}
                      <div className="text-center mt-3">
                        <h4 className="font-black text-sm md:text-base uppercase tracking-tight text-white">{podium1.ign}</h4>
                        <p className="text-xs font-black text-[#e8a000] mt-0.5">{podium1.totalXp} XP</p>
                        <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{podium1.accuracy}% ACCURACY</p>
                      </div>
                    </div>
                    {/* Stand base */}
                    <div className="w-full h-16 md:h-24 mt-4 bg-gradient-to-b from-[#1a150e] to-[#0e0c07] border-t border-[#e8a000]/40 rounded-t-lg relative flex items-center justify-center">
                      <div className="absolute bottom-1 w-4/5 h-[1px] bg-[#e8a000]/20" />
                      <Trophy className="w-6 h-6 text-[#e8a000] opacity-80" />
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place: Bronze Stand */}
                {podium3 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative group flex flex-col items-center">
                      {/* Avatar Frame with Bronze Bezel */}
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-amber-700 p-1 relative bg-[#0a0a0f] flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105">
                        <img 
                          src={podium3.photo || '/heroes/stun.png'} 
                          alt={podium3.ign} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                        <div className="absolute -bottom-1 -right-1 bg-amber-700 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#05060b]">
                          3
                        </div>
                      </div>
                      
                      {/* IGN & Stats */}
                      <div className="text-center mt-3">
                        <h4 className="font-black text-xs md:text-sm uppercase tracking-tight text-white">{podium3.ign}</h4>
                        <p className="text-[10px] font-bold text-amber-700 mt-0.5">{podium3.totalXp} XP</p>
                        <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">{podium3.accuracy}% ACC</p>
                      </div>
                    </div>
                    {/* Stand base */}
                    <div className="w-full h-10 md:h-12 mt-4 bg-gradient-to-b from-[#141211] to-[#0c0a09] border-t border-amber-700/30 rounded-t-lg relative flex items-center justify-center">
                      <div className="absolute bottom-1 w-4/5 h-[1px] bg-amber-700/20" />
                      <Medal className="w-4 h-4 text-amber-700 opacity-60" />
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Data Table Controller (Search & Refresh) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/40 p-4 rounded-xl border border-white/[0.04]">
                  
                  {/* Search input bar */}
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="text"
                      placeholder="Search player IGN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/5 text-white pl-9 pr-4 py-2 rounded-lg text-xs outline-none focus:border-[#e8a000]/40 focus:ring-1 focus:ring-[#e8a000]/10 placeholder-zinc-600 uppercase"
                    />
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Rankings based on lifetime Trivia XP
                    </p>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-900/40 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:border-[#e8a000]/30 hover:text-white transition-colors duration-300 disabled:opacity-50 active:scale-[0.98]"
                    >
                      <RefreshCcw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Data Grid list */}
                <div className="space-y-2.5">
                  
                  {/* Headings */}
                  <div className="hidden md:grid grid-cols-[64px_1fr_120px_180px_100px] gap-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    <span className="text-center">Rank</span>
                    <span>Player Profile</span>
                    <span className="text-center">Trivia Accuracy</span>
                    <span className="text-center">Answers Score</span>
                    <span className="text-right">Total XP</span>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {filteredRankings.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.05, 0.4) }}
                        className="bg-[#0b0c11]/85 border border-white/[0.04] rounded-xl p-4 flex flex-col md:grid md:grid-cols-[64px_1fr_120px_180px_100px] md:gap-4 md:items-center transition-all hover:border-white/10"
                      >
                        {/* 1. Rank Indicator */}
                        <div className="flex items-center justify-between md:justify-center border-b border-white/[0.04] pb-2 md:pb-0 md:border-0 mb-3 md:mb-0">
                          <span className="md:hidden text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Rank</span>
                          <span className={`text-base font-black italic tracking-wide ${
                            item.rank === 1 ? 'text-[#e8a000]' : item.rank === 2 ? 'text-zinc-400' : item.rank === 3 ? 'text-amber-700' : 'text-zinc-600'
                          }`}>
                            #{item.rank}
                          </span>
                        </div>

                        {/* 2. User info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 p-0.5 relative shrink-0 overflow-hidden">
                            <img 
                              src={item.photo || '/heroes/stun.png'} 
                              alt={item.ign} 
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                          <div>
                            <p className="font-black text-sm uppercase tracking-tight text-white group-hover:text-[#e8a000] transition-colors">{item.ign}</p>
                            <div className="flex flex-wrap gap-1.5 items-center mt-1">
                              <span className="text-[8px] font-mono text-zinc-500 uppercase">
                                {item.region || 'Accra'}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-zinc-800" />
                              <span className="text-[8px] font-black uppercase text-[#e8a000] bg-amber-500/5 border border-amber-500/10 px-1 py-0.5 rounded">
                                {item.mainRole}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Accuracy Indicator */}
                        <div className="flex justify-between items-center md:justify-center mt-3 md:mt-0">
                          <span className="md:hidden text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Accuracy</span>
                          <div className="text-center">
                            <span className="text-xs font-black text-emerald-400 font-mono">{item.accuracy}%</span>
                            <div className="w-20 h-1 bg-zinc-900 rounded-full overflow-hidden mt-1 hidden md:block">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" 
                                style={{ width: `${item.accuracy}%` }} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* 4. Score stats */}
                        <div className="flex justify-between items-center md:justify-center mt-2 md:mt-0">
                          <span className="md:hidden text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Correct / Total</span>
                          <span className="text-xs font-mono text-zinc-400">
                            <span className="text-white font-bold">{item.correctAnswers}</span> / {item.totalAnswers} <span className="text-[9px] text-zinc-600 font-bold">Q&A</span>
                          </span>
                        </div>

                        {/* 5. XP */}
                        <div className="flex justify-between items-center md:justify-end mt-2 md:mt-0 border-t border-white/[0.04] pt-2 md:pt-0 md:border-0">
                          <span className="md:hidden text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Total XP</span>
                          <span className="text-sm font-black text-[#e8a000] italic font-mono">{item.totalXp} XP</span>
                        </div>

                      </motion.div>
                    ))}

                    {filteredRankings.length === 0 && (
                      <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl opacity-40">
                        <HelpCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest italic">No trivia players found matching search query</p>
                      </div>
                    )}
                  </AnimatePresence>

                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR: Rewards Card & Recent Activity Feed */}
            <div className="space-y-6">
              
              {/* CTA Play Box */}
              <div className="relative border border-amber-500/25 bg-[#0f0c08] rounded-2xl p-5 overflow-hidden shadow-2xl">
                <div className="absolute top-1/2 right-4 -translate-y-1/2 w-20 h-20 bg-[#e8a000]/10 rounded-full blur-xl animate-pulse pointer-events-none" />
                
                <h4 className="font-black text-sm uppercase tracking-wider text-white">READY TO PLAY?</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                  Answer 5 new trivia questions daily in the Community deck to earn XP and secure your rank.
                </p>
                <Link
                  href="/community"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#e8a000] text-black text-xs font-black uppercase py-2.5 hover:bg-[#ffa800] transition-colors duration-300 group active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  Answer Daily Trivia
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Diamond Reward details card */}
              <div className="border border-white/5 bg-zinc-950/60 rounded-2xl p-5 space-y-4">
                <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest block border-b border-white/5 pb-2">
                  SEASONAL PRIZE DIVISION
                </span>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-amber-500/10 text-[#e8a000] border border-amber-500/20 text-[10px] font-black italic flex items-center justify-center">1</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-tight text-white">₵250.00 CASH</p>
                      <p className="text-[9px] text-zinc-500 uppercase">Plus 250 Diamonds Bundle</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-black italic flex items-center justify-center">2</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-tight text-zinc-300">₵150.00 CASH</p>
                      <p className="text-[9px] text-zinc-500 uppercase">Plus 150 Diamonds Bundle</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-amber-850/10 text-amber-800 border border-amber-850/20 text-[10px] font-black italic flex items-center justify-center">3</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-tight text-zinc-400">₵100.00 CASH</p>
                      <p className="text-[9px] text-zinc-500 uppercase">Plus 100 Diamonds Bundle</p>
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-white/5 w-full my-1" />
                <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                  Weekly rewards are compiled every Sunday at 23:59 UTC. Top 10 will receive automatic in-app inbox payouts.
                </p>
              </div>

              {/* Recent Activity Log panel */}
              <div className="border border-white/5 bg-zinc-950/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Activity className="w-3.5 h-3.5 text-[#e8a000] animate-pulse" />
                  <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest">
                    LIVE TRIVIA LOG
                  </span>
                </div>

                <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                  {RECENT_ACTIVITIES.map((act) => (
                    <div key={act.id} className="flex gap-2 items-start text-[10px]">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${act.correct ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-300 font-bold uppercase tracking-tight truncate">
                          {act.user}
                        </p>
                        <p className="text-[9px] text-zinc-500 leading-tight">
                          {act.action}
                        </p>
                      </div>
                      <span className="text-[8px] font-mono text-zinc-600 shrink-0 mt-0.5">{act.time}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}
