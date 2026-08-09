'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Users,
  Zap,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  Trophy,
  Flame,
  ChevronRight,
  X,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/JJnIPabbxCmB3R7abTRjWs';

type LiveStats = {
  totalUsers: number;
  totalTeams: number;
  todayJoinedCount: number;
  activeTournament?: {
    name: string;
    prizePool?: string | null;
    status: string;
  } | null;
  recentUser?: {
    ign: string;
    mainRole: string;
    createdAt: string;
  } | null;
  upcomingMatch?: {
    teamA: string;
    teamB: string;
    scheduledTime: string;
  } | null;
};

export function WhatsAppCommunitySection() {
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const res = await fetch('/api/community/stats');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setLiveStats(data);
        }
      } catch {
        // Fallback silently if API fails
      }
    }
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(WHATSAPP_COMMUNITY_URL);
      setCopied(true);
      toast.success('WhatsApp Invite Link Copied!', {
        description: 'Share it with your squad or paste into WhatsApp.',
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy invite link');
    }
  };

  const handleJoinClick = () => {
    window.open(WHATSAPP_COMMUNITY_URL, '_blank', 'noopener,noreferrer');
  };

  const userCountDisplay = liveStats?.totalUsers
    ? `${liveStats.totalUsers.toLocaleString()}+`
    : '1,000+';

  const teamCountDisplay = liveStats?.totalTeams
    ? `${liveStats.totalTeams}`
    : '40+';

  return (
    <section id="whatsapp" className="scroll-mt-20 relative bg-[#030508] py-16 lg:py-24 overflow-hidden border-y border-white/5">
      {/* ── Ambient Background Glows ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glowing green blob */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#25D366]/10 rounded-full blur-[160px] mix-blend-screen" />
        {/* Glowing cyan blob */}
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] mix-blend-screen" />
        {/* Subtle cyber grid */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,211,102,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(37,211,102,0.3) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Diagonal Scanlines */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.4)_2px,rgba(0,0,0,0.4)_4px)] opacity-20" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Main Banner Container ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[2.5rem] bg-gradient-to-b from-[#0a1610] via-[#060c09] to-[#040806] border border-[#25D366]/30 shadow-[0_0_80px_rgba(37,211,102,0.12)] overflow-hidden"
        >
          {/* Top Metallic Border Highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#25D366] to-transparent opacity-70" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 p-6 sm:p-10 lg:p-14 items-center">
            
            {/* ── Left Content Column ── */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8">
              
              {/* Pulse Badge */}
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 backdrop-blur-md">
                <div className="relative flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#25D366]" />
                  <div className="absolute w-4 h-4 rounded-full bg-[#25D366] animate-ping opacity-75" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#25D366]">
                  Official WhatsApp Community
                </span>
                <span className="text-white/20">|</span>
                <span className="text-[11px] font-bold text-emerald-300/80 flex items-center gap-1">
                  <Radio size={12} className="text-[#25D366] animate-pulse" /> Live LFG & Scrims
                </span>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-[1.08]">
                  Join The <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#25D366] via-emerald-300 to-teal-200 drop-shadow-[0_0_30px_rgba(37,211,102,0.4)]">
                    Botsville Squad
                  </span>
                </h2>
                <p className="mt-4 text-base sm:text-lg text-emerald-100/70 font-medium leading-relaxed max-w-xl">
                  Connect instantly with over <strong className="text-white">{userCountDisplay} Ghanaian MLBB gamers</strong> across <strong className="text-white">{teamCountDisplay} active teams</strong>. Find Mythic teammates, get instant tournament updates, enter exclusive diamond giveaways, and book daily scrims!
                </p>
              </div>

              {/* Feature Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#25D366]/40 hover:bg-[#25D366]/5 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] mb-3 group-hover:scale-110 transition-transform">
                    <Trophy size={20} />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Tournament Alerts</h4>
                  <p className="text-xs text-white/50 mt-1 leading-snug">
                    {liveStats?.activeTournament ? `Live: ${liveStats.activeTournament.name}` : 'Get first access to registration slots & cash prize pools.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#25D366]/40 hover:bg-[#25D366]/5 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] mb-3 group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">24/7 Squad LFG</h4>
                  <p className="text-xs text-white/50 mt-1 leading-snug">Find non-random Mythic & Glory teammates instantly.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#25D366]/40 hover:bg-[#25D366]/5 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] mb-3 group-hover:scale-110 transition-transform">
                    <Flame size={20} />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Scrims & Drops</h4>
                  <p className="text-xs text-white/50 mt-1 leading-snug">Daily custom lobbies, trivia rewards & giveaways.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
                {/* Main CTA */}
                <button
                  onClick={handleJoinClick}
                  className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba59] hover:to-[#0f7a6e] text-black font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-[0_0_35px_rgba(37,211,102,0.4)] hover:shadow-[0_0_50px_rgba(37,211,102,0.6)] hover:scale-[1.02] active:scale-95"
                >
                  <MessageCircle size={22} fill="black" />
                  <span>Join WhatsApp Group</span>
                  <ExternalLink size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Copy Link Button */}
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  {copied ? <Check size={18} className="text-[#25D366]" /> : <Copy size={18} className="text-white/60" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
                </button>

                {/* QR Code Button */}
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#25D366]/40 text-emerald-400 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                  title="Scan QR Code on Phone"
                >
                  <QrCode size={18} />
                  <span className="hidden sm:inline">QR Code</span>
                </button>
              </div>
            </div>

            {/* ── Right Column: Interactive WhatsApp Phone Card Preview ── */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm">
                
                {/* Back Glow */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-[#25D366]/20 via-emerald-500/10 to-transparent rounded-[3rem] blur-2xl pointer-events-none" />

                {/* Phone Card Mockup */}
                <div className="relative rounded-[2.5rem] bg-[#0c1317] border-2 border-white/10 p-5 shadow-2xl overflow-hidden space-y-4">
                  
                  {/* Phone Notch & Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-[0_0_20px_rgba(37,211,102,0.4)]">
                        <MessageCircle size={26} fill="black" className="text-black" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black text-white uppercase tracking-wider">Botsville MLBB GH</h3>
                          <ShieldCheck size={14} className="text-[#25D366]" />
                        </div>
                        <p className="text-[11px] text-[#25D366] font-bold">
                          {liveStats?.totalUsers ? `${liveStats.totalUsers.toLocaleString()} members` : '1,200+ members'} • Active
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live WhatsApp Chat Stream */}
                  <div className="space-y-3 p-3 rounded-2xl bg-[#080d0f] border border-white/5 text-xs">
                    
                    {/* Real Admin Announcement Message */}
                    <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tl-xs shadow-md space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-emerald-300 font-mono">
                        <span className="font-bold">👑 Admin • Tournament Coordinator</span>
                        <span>LIVE</span>
                      </div>
                      <p className="font-medium leading-relaxed">
                        🔥 <strong className="text-amber-300">{liveStats?.activeTournament ? liveStats.activeTournament.name.toUpperCase() : 'BOTSVILLE MLBB TOURNAMENTS ARE LIVE!'}</strong> 🏆<br />
                        {liveStats?.activeTournament?.prizePool ? `Prize pool: ${liveStats.activeTournament.prizePool}! ` : 'Join the official group for registrations & custom lobbies! '}
                        Tap below to join 👇
                      </p>
                    </div>

                    {/* Real Newest Gamer Message */}
                    {liveStats?.recentUser && (
                      <div className="bg-white/5 border border-white/10 text-emerald-100/90 p-3 rounded-2xl rounded-tr-xs ml-auto max-w-[90%] space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
                          <span>{liveStats.recentUser.ign} ({liveStats.recentUser.mainRole} Lane)</span>
                          <span>New</span>
                        </div>
                        <p className="text-xs">Just joined the Botsville platform! Ready for scrims & tournament matches ⚔️</p>
                      </div>
                    )}

                    {/* Real Member joined today alert */}
                    <div className="text-center py-1">
                      <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-mono text-emerald-400/80 border border-white/5">
                        ✨ +{liveStats?.todayJoinedCount ?? 0} new players joined today
                      </span>
                    </div>
                  </div>

                  {/* Quick Click-to-Join Trigger Card */}
                  <div 
                    onClick={handleJoinClick}
                    className="cursor-pointer p-4 rounded-2xl bg-gradient-to-r from-[#25D366]/20 to-emerald-500/10 border border-[#25D366]/40 hover:border-[#25D366] transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#25D366] text-black flex items-center justify-center font-black">
                        <Sparkles size={16} fill="black" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-wider">Click to Join Group</p>
                        <p className="text-[10px] text-emerald-300">chat.whatsapp.com/JJnIPabbxCmB3R7abTRjWs</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[#25D366] group-hover:translate-x-1 transition-transform" />
                  </div>

                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>

      {/* ── Modal for Desktop QR Code Scanning ── */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-[#0c1317] border border-[#25D366]/40 rounded-3xl p-6 text-center shadow-2xl text-white space-y-5"
            >
              <button
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/50 mx-auto flex items-center justify-center text-[#25D366]">
                <QrCode size={26} />
              </div>

              <div>
                <h3 className="text-lg font-black uppercase tracking-wider">Scan to Join WhatsApp</h3>
                <p className="text-xs text-white/60 mt-1">Open your phone camera or WhatsApp scanner to join instantly.</p>
              </div>

              {/* High-res generated QR Code */}
              <div className="p-4 rounded-2xl bg-white inline-block shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(WHATSAPP_COMMUNITY_URL)}`}
                  alt="Botsville WhatsApp Group QR Code"
                  className="w-48 h-48 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleJoinClick}
                  className="w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-black font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-[#25D366]/20"
                >
                  Open Directly in Browser
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
