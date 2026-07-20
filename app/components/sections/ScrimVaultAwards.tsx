'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Play, ChevronRight, Trophy, Vote, Loader2, Users,
  Shield, Swords, Zap, Crosshair, HeartHandshake,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Minimal iframe embed logic from StartingFiveModal
// ─── Scrim types ────────────────────────────────────────────
type ScrimItem = {
  id: string;
  title: string;
  tournament: string;
  matchup: string;
  image: string;
  duration: string;
  featured?: boolean;
  videoUrl: string;
};

type ScrimVaultApiItem = {
  id: string;
  title: string;
  matchup: string | null;
  thumbnail: string | null;
  videoUrl: string;
  duration: string | null;
  featured: boolean;
  tournament?: { name?: string | null } | null;
};

// ─── Award types ─────────────────────────────────────────────
type AwardTeam = { id: string; name: string; tag: string; color?: string; logo?: string };
type AwardNominee = {
  id: string;
  ign: string;
  realName?: string;
  signatureHero?: string;
  photo?: string;
  votes: number;
  votedByMe: boolean;
  team: AwardTeam;
};
type AwardSeason = { id: string; name: string; status: string };
type AwardGrouped = Record<string, AwardNominee[]>;

// ─── Role meta ───────────────────────────────────────────────
const AWARD_ROLES = [
  { key: 'EXP',      label: 'EXP Lane',  award: 'KING OF EXP LANE',   color: '#e8a000', Icon: Shield          },
  { key: 'JUNGLE',   label: 'Jungle',    award: 'KING OF THE JUNGLE',  color: '#cc3333', Icon: Swords          },
  { key: 'MID',      label: 'Mid Lane',  award: 'MAGE OF THE SEASON',  color: '#9b59b6', Icon: Zap             },
  { key: 'GOLD',     label: 'Gold Lane', award: 'MARKSMAN OF SEASON',  color: '#27ae60', Icon: Crosshair       },
  { key: 'ROAM',     label: 'Roam',      award: 'BEST ROAMER',         color: '#16a085', Icon: HeartHandshake  },
] as const;

type RoleMeta = typeof AWARD_ROLES[number];

const getYoutubeThumbnail = (url: string): string | null => {
  try {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match && match[1] ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
};

// (removed unused helper) getYoutubeEmbedUrl

function getEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // YouTube matches:
  let match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1`;
  }
  // Twitch match:
  match = url.match(/twitch\.tv\/([a-z0-9_]+)/i);
  if (match && match[1]) {
    return `https://player.twitch.tv/?channel=${match[1]}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}&muted=true&autoplay=true`;
  }
  return null;
}

const useRealtimeScrims = (category?: string) => {
  const [scrims, setScrims] = useState<ScrimItem[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const query = category ? `&category=${category}` : '';
        // Fetch last 12 scrims
        const response = await fetch(`/api/scrim-vault?limit=12${query}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const videos: ScrimVaultApiItem[] = Array.isArray(data?.videos) ? data.videos : [];
        const mapped: ScrimItem[] = videos.map((video) => ({
          id: video.id,
          title: video.title,
          tournament: video.tournament?.name || 'Scrim',
          matchup: video.matchup || 'Casual Match',
          image: video.thumbnail || getYoutubeThumbnail(video.videoUrl) || '/img/placeholder-vod.jpg',
          duration: video.duration || 'VOD',
          featured: video.featured,
          videoUrl: video.videoUrl,
        }));
        if (active) {
          setScrims(mapped);
        }
      } catch {
        if (active) {
          setScrims([]);
        }
      }
    };

    load().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [category]);

  return scrims;
};

// ─── Nominees hook ────────────────────────────────────────────
const useRoleNominees = () => {
  const [season, setSeason] = useState<AwardSeason | null>(null);
  const [grouped, setGrouped] = useState<AwardGrouped>({});
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/awards/nominees', { cache: 'no-store' });
      const d = await res.json();
      if (!res.ok) {
        setError(d?.error ?? 'Failed to load nominees');
        return;
      }
      setSeason(d.season ?? null);
      setGrouped(d.grouped ?? {});
      setUserVotes(d.userVotes ?? {});
    } catch {
      setError('Failed to load nominees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    load().then(() => { if (!mounted) return; }).catch(() => undefined);
    return () => { mounted = false; };
  }, [load]);

  return { season, grouped, userVotes, setGrouped, setUserVotes, loading, error, reload: load };
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-white font-black text-[11px] tracking-[0.3em] uppercase mb-4 border-l-2 border-[#e8a000] pl-3">
    {children}
  </h2>
);

// ─── Desktop Scrim Card ───────────────────────────────────────
const DesktopScrimCard = ({ scrim, onPlay }: { scrim: ScrimItem; onPlay?: (url: string | null) => void }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onPlay?.(scrim.videoUrl)}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPlay?.(scrim.videoUrl); }}
    className="group cursor-pointer flex flex-col gap-1.5"
  >
    <div className="relative w-full aspect-video overflow-hidden bg-[#111]">
      <Image src={scrim.image} alt={scrim.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500 brightness-75 group-hover:brightness-90" />
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
      {scrim.featured && <div className="absolute inset-0 border border-[#e8a000]/50 pointer-events-none" />}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div
          onClick={(e) => { e.stopPropagation(); onPlay?.(scrim.videoUrl); }}
          className="w-9 h-9 bg-[#e8a000] flex items-center justify-center shadow-lg shadow-[#e8a000]/30"
          role="button"
          tabIndex={0}
        >
          <Play size={13} fill="black" className="text-black ml-0.5" />
        </div>
      </div>
      <span className="absolute top-1.5 right-1.5 bg-black/70 text-[#aaa] text-[9px] font-mono px-1.5 py-0.5">{scrim.duration}</span>
      <p className="absolute bottom-2 left-2 right-2 text-white font-black text-[11px] uppercase tracking-wide leading-tight drop-shadow-md">{scrim.title}</p>
    </div>
    <div>
      <p className="text-[#777] text-[10px] tracking-wide leading-tight">{scrim.tournament}</p>
      <p className="text-[#444] text-[9px] leading-tight">{scrim.matchup}</p>
    </div>
  </div>
);

// ─── Awards Showcase Slide (Eye-Catching Redesign) ─────────────
const AwardSlide = ({
  meta,
  nominees,
}: {
  meta: RoleMeta;
  nominees: AwardNominee[];
}) => {
  const { color, Icon } = meta;
  const leader = nominees[0] ?? null;
  const contenders = nominees.slice(1, 4);
  const totalVotes = nominees.reduce((acc, n) => acc + n.votes, 0) || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      {/* Featured Leader Card (#1 Rank Spotlight) */}
      <div className="lg:col-span-7 relative flex flex-col">
        {/* Dynamic Role Background Light Glow */}
        <div 
          className="absolute -inset-4 rounded-3xl opacity-20 blur-3xl transition-all duration-700 pointer-events-none" 
          style={{ background: color }} 
        />

        <div 
          className="relative flex-1 bg-gradient-to-b from-[#12121a] to-[#0a0a0e] border rounded-3xl overflow-hidden p-6 sm:p-8 flex flex-col justify-between shadow-2xl transition-all group"
          style={{ borderColor: `${color}35` }}
        >
          {/* Header Crown & Role Tag */}
          <div className="flex items-center justify-between gap-4 mb-6 z-10">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              <span className="w-2 h-2 rounded-full animate-ping" style={{ background: color }} />
              <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white">#1 Current Leader</span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              <Trophy size={13} style={{ color }} />
              <span className="text-white text-xs font-black tracking-wider tabular-nums">{leader?.votes ?? 0}</span>
              <span className="text-[#888] text-[10px] font-bold uppercase tracking-widest">Votes</span>
            </div>
          </div>

          {/* Leader Body */}
          {leader ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center my-auto z-10">
              {/* Leader Avatar */}
              <div className="sm:col-span-5 relative aspect-[3/4] w-full rounded-2xl overflow-hidden border border-white/15 shadow-2xl group-hover:border-white/30 transition-all">
                {leader.photo ? (
                  <Image src={leader.photo} alt={leader.ign} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#09090f]">
                    <Users size={56} style={{ color, opacity: 0.25 }} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0e] via-transparent to-transparent" />
                
                {/* Crown badge */}
                <div className="absolute top-3 left-3 w-8 h-8 rounded-xl bg-black/80 backdrop-blur-md border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-xs shadow-lg">
                  👑
                </div>
              </div>

              {/* Leader Details */}
              <div className="sm:col-span-7 space-y-4 text-left">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                      {leader.team?.name || 'Free Agent'}
                    </span>
                    {leader.signatureHero && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border" style={{ borderColor: `${color}40`, color }}>
                        ⚔️ {leader.signatureHero}
                      </span>
                    )}
                  </div>
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
                    {leader.ign}
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color }}>
                    {meta.award}
                  </p>
                </div>

                {/* Vote Percentage Share Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                    <span className="text-zinc-400 uppercase tracking-widest">Community Share</span>
                    <span style={{ color }}>{Math.round(((leader.votes || 0) / totalVotes) * 100)}% of Votes</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden p-0.5 border border-white/10">
                    <div 
                      className="h-full rounded-full transition-all duration-700" 
                      style={{ width: `${Math.max(8, Math.round(((leader.votes || 0) / totalVotes) * 100))}%`, background: `linear-gradient(90deg, ${color}, #ffffff)` }} 
                    />
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2">
                  <a 
                    href="/awards" 
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl font-black text-xs uppercase tracking-wider text-black transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: color }}
                  >
                    <Vote size={15} />
                    <span>{leader.votedByMe ? 'You Voted This Leader 👑' : 'Vote For This Nominee'}</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Icon size={48} style={{ color, opacity: 0.3 }} />
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">No Nominees Registered Yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Contenders & Runner-Ups List (#2, #3, #4) */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Trophy size={14} className="text-[#e8a000]" /> Contenders & Top Nominees
          </span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{nominees.length} Registered</span>
        </div>

        {contenders.length > 0 ? (
          <div className="space-y-3 flex-1 flex flex-col justify-between">
            {contenders.map((item, idx) => {
              const rank = idx + 2;
              const votePct = Math.round(((item.votes || 0) / totalVotes) * 100);
              return (
                <div 
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#0f0f17] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono font-black text-zinc-400">
                      #{rank}
                    </span>

                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                      {item.photo ? (
                        <Image src={item.photo} alt={item.ign} fill className="object-cover object-top" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold text-xs">
                          {item.ign.slice(0, 2)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-black uppercase tracking-wide text-white group-hover:text-[#e8a000] transition-colors truncate">
                        {item.ign}
                      </h4>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase truncate">
                        {item.team?.name || 'Free Agent'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="text-xs font-mono font-black text-white">{item.votes} <span className="text-[9px] text-zinc-500 font-bold">pts</span></span>
                    <a 
                      href="/awards"
                      className="text-[9px] font-black uppercase tracking-wider text-[#e8a000] hover:underline"
                    >
                      Vote →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 p-8 rounded-2xl bg-[#0f0f17] border border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-50 space-y-2">
            <Users size={32} className="text-zinc-600" />
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">More contenders coming soon</p>
          </div>
        )}

        {/* View All Nominees Link */}
        <a 
          href="/awards" 
          className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-center text-xs font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
        >
          <span>Explore All Nominees & Vote</span>
          <ChevronRight size={14} className="text-[#e8a000]" />
        </a>
      </div>
    </div>
  );
};

// ─── Desktop Exported Sections ────────────────────────────────
export const ScrimVault = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const scrims = useRealtimeScrims(selectedCategory);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  return (
    <section className="hidden lg:block bg-[#0d0d12] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <SectionLabel>Scrim Vault</SectionLabel>
          <div className="flex items-center gap-2">
            {[
              { key: '', label: 'All' },
              { key: 'SCRIM', label: 'Scrims' },
              { key: 'TOURNAMENT', label: 'Tournaments' },
              { key: 'COMMUNITY', label: 'Community' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all duration-300 rounded ${
                  selectedCategory === tab.key
                    ? 'bg-[#e8a000] text-black shadow-[0_0_10px_rgba(232,160,0,0.2)]'
                    : 'text-white/40 hover:text-white/70 bg-white/3 hover:bg-white/5 border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {scrims.length === 0 ? (
          <div className="border border-white/10 bg-[#0b0b11] flex items-center justify-center text-[#666] text-sm py-10">
            No videos available in this category.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {scrims.slice(0, 6).map(s => (
              <DesktopScrimCard key={s.id} scrim={s} onPlay={(url) => setActiveVideoUrl(url)} />
            ))}
          </div>
        )}
      </div>

      {activeVideoUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => setActiveVideoUrl(null)}>
          <div className="relative w-[90%] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10">
              {getEmbedUrl(activeVideoUrl) ? (
                <iframe
                  src={getEmbedUrl(activeVideoUrl)!}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <video className="w-full h-full" controls autoPlay src={activeVideoUrl} />
              )}
            </div>
            <button onClick={() => setActiveVideoUrl(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-black/80 hover:bg-black text-white hover:text-amber-400 rounded-full border border-white/20 hover:border-amber-400 transition-colors flex items-center justify-center font-black">
              ×
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export const BestRoleAwards = () => {
  const { season, grouped, loading } = useRoleNominees();
  const [activeRoleKey, setActiveRoleKey] = useState<string>('EXP');

  const activeMeta = AWARD_ROLES.find(r => r.key === activeRoleKey) || AWARD_ROLES[0];
  const nominees = grouped[activeRoleKey] ?? [];

  return (
    <section className="hidden lg:block bg-[#08080d] py-16 border-t border-white/10 relative overflow-hidden">
      {/* Background Decor Ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#e8a000]/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-[2px] bg-[#e8a000]" />
              <span className="text-[#e8a000] text-[10px] font-black uppercase tracking-[0.4em]">Hall of Fame</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-white">
              Best Role <span className="text-[#e8a000]">Awards</span>
            </h2>
          </div>

          {season && (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
              <Trophy size={16} className="text-[#e8a000]" />
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">{season.name}</span>
                <span className="text-xs font-bold text-white uppercase">{season.status === 'ACTIVE' ? 'Voting Open' : 'Season Complete'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Role Navigation Tabs Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide mb-10 border-b border-white/10">
          {AWARD_ROLES.map((meta) => {
            const { key, label, Icon, color } = meta;
            const isActive = activeRoleKey === key;
            return (
              <button
                key={key}
                onClick={() => setActiveRoleKey(key)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 relative shrink-0 ${
                  isActive
                    ? 'text-black shadow-xl shadow-' + color + '/20'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
                style={{
                  background: isActive ? color : undefined,
                }}
              >
                <Icon size={16} className={isActive ? 'text-black' : 'text-zinc-400'} />
                <span>{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeRoleTab"
                    className="absolute inset-0 rounded-2xl border-2 border-white/40 pointer-events-none"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Award Content Slide */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Loader2 size={32} className="animate-spin text-[#e8a000]" />
            <span className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Loading Nominees...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRoleKey}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <AwardSlide meta={activeMeta} nominees={nominees} />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};

// ══════════════════════════════════════════════════════════════
// MOBILE — combined Scrim Vault + Best Role Awards
// ══════════════════════════════════════════════════════════════

const MobileFeaturedScrim = ({ scrim, onPlay }: { scrim: ScrimItem; onPlay?: (url: string | null) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
    role="button"
    tabIndex={0}
    onClick={() => onPlay?.(scrim.videoUrl)}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPlay?.(scrim.videoUrl); }}
    className="group relative cursor-pointer aspect-video overflow-hidden bg-[#111] mb-3"
  >
    <Image src={scrim.image} alt={scrim.title} fill className="object-cover brightness-75 group-hover:scale-105 transition-transform duration-500" />
    <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/30 to-transparent" />
    <div className="absolute inset-0 border border-[#e8a000]/40 pointer-events-none" />
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div whileTap={{ scale: 0.92 }} className="w-12 h-12 bg-[#e8a000] flex items-center justify-center shadow-2xl shadow-[#e8a000]/40"
        onClick={(e) => { e.stopPropagation(); onPlay?.(scrim.videoUrl); }}
        role="button" tabIndex={0}
      >
        <Play size={18} fill="black" className="ml-1 text-black" />
      </motion.div>
    </div>
    <span className="absolute top-3 right-3 bg-black/70 text-[#aaa] text-[9px] font-mono px-2 py-0.5">{scrim.duration}</span>
    <div className="absolute bottom-0 left-0 right-0 p-4">
      <p className="text-white font-black text-lg uppercase tracking-wide leading-tight">{scrim.title}</p>
      <p className="text-[#888] text-[10px] tracking-wide mt-0.5">{scrim.tournament} · {scrim.matchup}</p>
    </div>
  </motion.div>
);

const MobileScrimRow = ({ scrim, index, onPlay }: { scrim: ScrimItem; index: number; onPlay?: (url: string | null) => void }) => (
  <motion.div
    initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: index * 0.08 }}
    role="button"
    tabIndex={0}
    onClick={() => onPlay?.(scrim.videoUrl)}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPlay?.(scrim.videoUrl); }}
    className="group cursor-pointer flex items-center gap-3 border-b border-white/5 pb-3"
  >
      <div className="relative w-24 aspect-video shrink-0 overflow-hidden bg-[#111]">
      <Image src={scrim.image} alt={scrim.title} fill className="object-cover brightness-75 group-hover:brightness-90 transition-all duration-300" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-6 h-6 bg-[#e8a000] flex items-center justify-center" onClick={(e) => { e.stopPropagation(); onPlay?.(scrim.videoUrl); }} role="button" tabIndex={0}>
          <Play size={9} fill="black" className="ml-0.5 text-black" />
        </div>
      </div>
      <span className="absolute bottom-1 right-1 bg-black/70 text-[#aaa] text-[8px] font-mono px-1 py-px">{scrim.duration}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white font-black text-xs uppercase tracking-wide leading-tight group-hover:text-[#e8a000] transition-colors line-clamp-1">{scrim.title}</p>
      <p className="text-[#666] text-[9px] tracking-wide mt-0.5 truncate">{scrim.tournament}</p>
      <p className="text-[#3a3a3a] text-[9px] truncate">{scrim.matchup}</p>
    </div>
    <ChevronRight size={12} className="text-[#2a2a2a] group-hover:text-[#e8a000] transition-colors shrink-0" />
  </motion.div>
);

const MobileAwardsSlider = ({ grouped, season }: { grouped: AwardGrouped; season?: { status: string } | null }) => {
  const [current, setCurrent] = useState(0);

  const meta = AWARD_ROLES[current];
  const { color, Icon } = meta;
  const nominees = grouped[meta.key] ?? [];
  const nominee = nominees[0] ?? null;

  return (
    <div className="relative">
      {/* Mobile Role Pills Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 scrollbar-hide mb-4">
        {AWARD_ROLES.map((r, i) => {
          const isActive = i === current;
          return (
            <button
              key={r.key}
              onClick={() => setCurrent(i)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive ? 'text-black font-black' : 'bg-white/5 text-zinc-400 border border-white/5'
              }`}
              style={{ background: isActive ? r.color : undefined }}
            >
              <r.Icon size={12} className={isActive ? 'text-black' : 'text-zinc-400'} />
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Award Title */}
      <div className="text-center mb-4">
        <h3 className="text-sm font-black tracking-[0.2em] uppercase text-white">{meta.award}</h3>
      </div>

      {/* Leader Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={meta.key}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25 }}
        >
          {nominee ? (
            <div className="relative max-w-xs mx-auto">
              <div className="absolute -inset-2 opacity-25 blur-xl rounded-2xl" style={{ background: color }} />
              
              <div className="relative bg-[#0b0b12] border rounded-2xl overflow-hidden p-4 shadow-xl" style={{ borderColor: `${color}40` }}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-black/60 text-amber-400 border border-amber-500/30">
                    👑 #1 Leader
                  </span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 text-white text-[9px] font-black">
                    <Trophy size={10} style={{ color }} />
                    <span>{nominee.votes} votes</span>
                  </div>
                </div>

                {/* Player Portrait */}
                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/10 mb-3">
                  {nominee.photo ? (
                    <Image src={nominee.photo} alt={nominee.ign} fill className="object-cover object-top" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
                      <Users size={32} style={{ color, opacity: 0.3 }} />
                    </div>
                  )}
                </div>
                
                {/* Player Details */}
                <div className="text-center space-y-1">
                  <h4 className="text-xl font-black uppercase tracking-wide text-white">{nominee.ign}</h4>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {nominee.team?.name || 'Free Agent'} {nominee.signatureHero ? `· ${nominee.signatureHero}` : ''}
                  </p>

                  <a 
                    href="/awards" 
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 mt-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-black transition-all"
                    style={{ background: color }}
                  >
                    <Vote size={12} />
                    <span>Vote for Nominee</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 border border-white/5 bg-[#0c0c12] max-w-xs mx-auto rounded-2xl text-center space-y-2">
              <Icon size={28} style={{ color, opacity: 0.3 }} />
              <p className="text-zinc-500 text-xs font-black uppercase tracking-wider">No nominees yet</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const MobileScrimAndAwards = () => {
  const [activeCategory, setActiveCategory] = useState<string>('');
  const scrims = useRealtimeScrims(activeCategory);
  const { season, grouped, loading } = useRoleNominees();
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const openVideo = (url: string | null) => {
    if (!url) return;
    setVideoUrl(url);
    setVideoOpen(true);
  };

  const closeVideo = () => {
    setVideoOpen(false);
    setVideoUrl(null);
  };

  const featured = scrims.find(s => s.featured) || scrims[0];
  const rest = scrims.filter(s => s.id !== featured?.id).slice(0, 3);

  return (
    <section className="lg:hidden bg-[#0d0d12] py-6">
      <div className="px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Scrim Vault</SectionLabel>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[
              { key: '', label: 'All' },
              { key: 'SCRIM', label: 'Scrims' },
              { key: 'TOURNAMENT', label: 'Tournaments' },
              { key: 'COMMUNITY', label: 'Community' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCategory(tab.key)}
                className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition-all duration-300 rounded whitespace-nowrap ${
                  activeCategory === tab.key
                    ? 'bg-[#e8a000] text-black shadow-[0_0_8px_rgba(232,160,0,0.2)]'
                    : 'text-white/40 bg-white/3 hover:bg-white/5 border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {!featured ? (
          <div className="border border-white/10 bg-[#0b0b11] px-4 py-8 text-center text-[#666] text-sm">
            No videos available in this category.
          </div>
        ) : (
          <>
            <MobileFeaturedScrim scrim={featured} onPlay={openVideo} />
            <div className="flex flex-col gap-3">
              {rest.map((s, i) => <MobileScrimRow key={s.id} scrim={s} index={i} onPlay={openVideo} />)}
            </div>
          </>
        )}
      </div>

      <div className="h-px mx-4 sm:mx-6 bg-white/4 mb-6" />

      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Best Role Awards</SectionLabel>
          {season && (
            <div className="flex items-center gap-2 -mt-4">
              <Trophy size={9} className="text-[#e8a000]" />
              <span className="text-[#555] text-[9px] font-mono">{season.name}</span>
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 size={16} className="animate-spin text-[#e8a000]" />
            <span className="text-[#444] text-xs font-mono">Loading…</span>
          </div>
        ) : (
          <MobileAwardsSlider grouped={grouped} season={season} />
        )}
      </div>
      {videoOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={closeVideo}>
          <div className="relative w-[95%] max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10">
              {getEmbedUrl(videoUrl) ? (
                <iframe
                  src={getEmbedUrl(videoUrl)!}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <video className="w-full h-full" controls autoPlay src={videoUrl || undefined} />
              )}
            </div>
            <button onClick={closeVideo} className="absolute -top-3 -right-3 w-8 h-8 bg-black/80 hover:bg-black text-white hover:text-amber-400 rounded-full border border-white/20 hover:border-amber-400 transition-colors flex items-center justify-center font-black">
              ×
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
