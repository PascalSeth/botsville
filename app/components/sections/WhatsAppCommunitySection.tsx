'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Users,
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

export function WhatsAppCommunitySection() {
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // WhatsApp group stats — separate from platform user count
  const WHATSAPP_MEMBER_COUNT = '280+';
  const WHATSAPP_TEAM_COUNT = '12';
  const TODAY_JOINED = 8;

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

  const userCountDisplay = WHATSAPP_MEMBER_COUNT;
  const teamCountDisplay = WHATSAPP_TEAM_COUNT;

  return (
    <section id="whatsapp" className="scroll-mt-20 relative bg-[#030508] py-10 lg:py-14 overflow-hidden border-y border-white/5">
      {/* ── Ambient Background Glows ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-[#25D366]/[0.08] rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-emerald-500/[0.08] rounded-full blur-[100px] mix-blend-screen" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,211,102,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(37,211,102,0.3) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Main Banner Container ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl bg-gradient-to-b from-[#0a1610] via-[#060c09] to-[#040806] border border-[#25D366]/20 shadow-[0_0_50px_rgba(37,211,102,0.08)] overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#25D366] to-transparent opacity-50" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 p-5 sm:p-8 lg:p-10 items-center">
            
            {/* ── Left Content Column ── */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5">
              
              {/* Pulse Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/25 backdrop-blur-md">
                <div className="relative flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#25D366]" />
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-[#25D366] animate-ping opacity-60" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#25D366]">
                  Official WhatsApp Community
                </span>
                <span className="text-white/20">|</span>
                <span className="text-[10px] font-bold text-emerald-300/70 flex items-center gap-1">
                  <Radio size={10} className="text-[#25D366] animate-pulse" /> Live LFG & Scrims
                </span>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-[1.1]">
                  Join The{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#25D366] via-emerald-300 to-teal-200 drop-shadow-[0_0_20px_rgba(37,211,102,0.3)]">
                    Botsville Squad
                  </span>
                </h2>
                <p className="mt-2.5 text-sm text-emerald-100/60 font-medium leading-relaxed max-w-md">
                  Connect with over <strong className="text-white">{userCountDisplay} Ghanaian MLBB gamers</strong> across <strong className="text-white">{teamCountDisplay} active teams</strong>. Find Mythic teammates, get tournament updates, and book daily scrims!
                </p>
              </div>

              {/* Feature Cards Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-[#25D366]/35 hover:bg-[#25D366]/5 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-[#25D366]/[0.12] border border-[#25D366]/25 flex items-center justify-center text-[#25D366] mb-2 group-hover:scale-110 transition-transform">
                    <Trophy size={15} />
                  </div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Tournaments</h4>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-snug">
                    Live: ARMAGEDDON: Battlegrounds
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-[#25D366]/35 hover:bg-[#25D366]/5 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-[#25D366]/[0.12] border border-[#25D366]/25 flex items-center justify-center text-[#25D366] mb-2 group-hover:scale-110 transition-transform">
                    <Users size={15} />
                  </div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Squad LFG</h4>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-snug">Find Mythic & Glory teammates.</p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-[#25D366]/35 hover:bg-[#25D366]/5 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-[#25D366]/[0.12] border border-[#25D366]/25 flex items-center justify-center text-[#25D366] mb-2 group-hover:scale-110 transition-transform">
                    <Flame size={15} />
                  </div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Scrims</h4>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-snug">Daily lobbies & giveaways.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <button
                  onClick={handleJoinClick}
                  className="group relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba59] hover:to-[#0f7a6e] text-black font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_0_25px_rgba(37,211,102,0.3)] hover:shadow-[0_0_35px_rgba(37,211,102,0.5)] hover:scale-[1.02] active:scale-95"
                >
                  <MessageCircle size={16} fill="black" />
                  <span>Join WhatsApp Group</span>
                  <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  {copied ? <Check size={14} className="text-[#25D366]" /> : <Copy size={14} className="text-white/60" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#25D366]/35 text-emerald-400 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                  title="Scan QR Code on Phone"
                >
                  <QrCode size={14} />
                  <span className="hidden sm:inline">QR Code</span>
                </button>
              </div>
            </div>

            {/* ── Right Column: WhatsApp Phone Card Preview ── */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-xs">
                <div className="absolute -inset-3 bg-gradient-to-tr from-[#25D366]/15 via-emerald-500/[0.08] to-transparent rounded-[2rem] blur-2xl pointer-events-none" />

                <div className="relative rounded-2xl bg-[#0c1317] border border-white/[0.08] p-4 shadow-2xl overflow-hidden space-y-3">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center shadow-[0_0_15px_rgba(37,211,102,0.3)]">
                        <MessageCircle size={20} fill="black" className="text-black" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <h3 className="text-xs font-black text-white uppercase tracking-wide">Botsville MLBB GH</h3>
                          <ShieldCheck size={11} className="text-[#25D366]" />
                        </div>
                        <p className="text-[10px] text-[#25D366] font-bold">
                          280+ members · Active
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live Chat Stream */}
                  <div className="space-y-2 p-2.5 rounded-xl bg-[#080d0f] border border-white/5 text-xs">
                    <div className="bg-[#005c4b] text-white p-2.5 rounded-xl rounded-tl-sm shadow-md space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-emerald-300 font-mono">
                        <span className="font-bold">👑 Admin · Coordinator</span>
                        <span>LIVE</span>
                      </div>
                      <p className="font-medium leading-relaxed text-[11px]">
                        🔥 <strong className="text-amber-300">ARMAGEDDON: BATTLEGROUNDS 🏆</strong>
                        <br />
                        Join for registrations &amp; custom lobbies! Tap below 👇
                      </p>
                    </div>

                    <div className="bg-white/5 border border-white/[0.08] text-emerald-100/90 p-2.5 rounded-xl rounded-tr-sm ml-auto max-w-[88%] space-y-0.5">
                      <div className="flex items-center justify-between text-[9px] text-white/40 font-mono">
                        <span>KingSlayer (JUNGLE)</span>
                        <span>New</span>
                      </div>
                      <p className="text-[10px]">Joined Botsville! Ready for scrims ⚔️</p>
                    </div>

                    <div className="text-center py-0.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[9px] font-mono text-emerald-400/70 border border-white/5">
                        ✨ +{TODAY_JOINED} players joined today
                      </span>
                    </div>
                  </div>

                  {/* Join Trigger */}
                  <div
                    onClick={handleJoinClick}
                    className="cursor-pointer p-3 rounded-xl bg-gradient-to-r from-[#25D366]/[0.18] to-emerald-500/[0.08] border border-[#25D366]/30 hover:border-[#25D366] transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#25D366] text-black flex items-center justify-center font-black">
                        <Sparkles size={13} fill="black" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white uppercase tracking-wide">Click to Join</p>
                        <p className="text-[9px] text-emerald-300/70 truncate max-w-[140px]">chat.whatsapp.com/JJnIPab...</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-[#25D366] group-hover:translate-x-0.5 transition-transform" />
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
