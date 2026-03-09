'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Play, ChevronRight, Trophy, Vote, Loader2, Users,
  Shield, Swords, Zap, Crosshair, HeartHandshake,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Minimal YouTube iframe API typings used locally to avoid `any`
type YTReadyEvent = { target: { playVideo: () => void } };
type YTPlayerInstance = { destroy?: () => void; playVideo?: () => void };
type YTPlayerConstructor = new (el: Element | string | HTMLDivElement, options: {
  height?: string; width?: string; videoId: string; playerVars?: Record<string, number | string>;
  events?: { onReady?: (e: YTReadyEvent) => void };
}) => YTPlayerInstance;
type YTNamespace = { Player: YTPlayerConstructor };
interface WindowWithYT extends Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }

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
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.slice(1);
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }
    return null;
  } catch {
    return null;
  }
};

// (removed unused helper) getYoutubeEmbedUrl

const getYoutubeIdFromUrl = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v') || null;
    }
    return null;
  } catch {
    return null;
  }
};

const loadYouTubeApi = (() => {
  let promise: Promise<YTNamespace | null> | null = null;
  return () => {
    if (promise) return promise;
    promise = new Promise<YTNamespace | null>((resolve) => {
      const w = window as unknown as WindowWithYT;
      if (w.YT && w.YT.Player) return resolve(w.YT);
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      w.onYouTubeIframeAPIReady = () => resolve(w.YT ?? null);
    });
    return promise;
  };
})();

const useRealtimeScrims = () => {
  const [scrims, setScrims] = useState<ScrimItem[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch('/api/scrim-vault?limit=9', { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        const videos: ScrimVaultApiItem[] = Array.isArray(data?.videos) ? data.videos : [];
        if (!mounted) return;

        const mapped: ScrimItem[] = videos.map((video) => ({
          id: video.id,
          title: video.title,
          tournament: video.tournament?.name || '—',
          matchup: video.matchup || '—',
          image:
            video.thumbnail ||
            getYoutubeThumbnail(video.videoUrl) ||
            '/mlbb_logo.png',
          duration: video.duration || '—',
          featured: Boolean(video.featured),
          videoUrl: video.videoUrl,
        }));

        setScrims(mapped);
      } catch {
        setScrims([]);
      }
    };

    load().catch(() => undefined);
    const interval = setInterval(() => {
      load().catch(() => undefined);
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

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

// ─── Awards Slider Slide ───────────────────────────────────────
const AwardSlide = ({
  meta, nominee, isActive,
}: {
  meta: RoleMeta;
  nominee: AwardNominee | null;
  isActive: boolean;
}) => {
  const { color, Icon } = meta;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.95 }}
      transition={{ duration: 0.4 }}
      className={`absolute inset-0 flex items-center justify-center ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div className="w-full max-w-xs mx-auto">
        {/* Award Title */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-3"
            style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
            <Icon size={14} style={{ color }} />
            <span className="text-[11px] font-black tracking-[0.25em] uppercase" style={{ color }}>{meta.label}</span>
          </div>
          <h3 className="text-xl font-black tracking-[0.18em] uppercase" style={{ color }}>{meta.award}</h3>
        </div>
        
        {/* Leader Card */}
        {nominee ? (
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-2 opacity-20 blur-2xl" style={{ background: color }} />
            
            <div className="relative bg-[#0a0a0f] border overflow-hidden" style={{ borderColor: `${color}35` }}>
              {/* Player Image */}
              <div className="relative aspect-[3/4] overflow-hidden">
                {nominee.photo ? (
                  <Image src={nominee.photo} alt={nominee.ign} fill className="object-cover object-top" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c12]">
                    <Users size={48} style={{ color, opacity: 0.2 }} />
                  </div>
                )}
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
                
                {/* Team badge - top left */}
                <div className="absolute top-3 left-3 max-w-[45%] px-2 py-1 bg-black/60 backdrop-blur-sm border border-white/10">
                  <span className="text-[#999] text-[9px] font-bold tracking-wider uppercase truncate block">{nominee.team.name}</span>
                </div>
                
                {/* Vote count - top right */}
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm border border-white/10">
                  <Trophy size={10} style={{ color }} />
                  <span className="text-white text-[10px] font-black tabular-nums">{nominee.votes}</span>
                </div>
                
                {/* Player Info - bottom overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-black text-2xl uppercase tracking-wider text-center">{nominee.ign}</p>
                  {nominee.signatureHero && (
                    <p className="text-center mt-1.5">
                      <span className="text-[11px] font-medium tracking-wide" style={{ color }}>{nominee.signatureHero}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 border border-white/5 bg-[#0a0a0f]">
            <Icon size={36} style={{ color, opacity: 0.25 }} />
            <p className="text-[#444] text-sm uppercase tracking-widest mt-4">No nominees yet</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Desktop Exported Sections ────────────────────────────────
export const ScrimVault = () => {
  const scrims = useRealtimeScrims();
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoYoutubeId, setVideoYoutubeId] = useState<string | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);

  const openVideo = (url: string | null) => {
    if (!url) return;
    setVideoUrl(url);
    setVideoYoutubeId(getYoutubeIdFromUrl(url));
    setVideoOpen(true);
  };

  const closeVideo = () => {
    // destroy YT player if present
    try {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') playerRef.current.destroy();
    } catch {
      // ignore
    }
    playerRef.current = null;
    setVideoOpen(false);
    setVideoUrl(null);
    setVideoYoutubeId(null);
  };

  useEffect(() => {
    let mounted = true;
    if (!videoOpen) return;
    // if we have a YouTube id, load API and create player
    if (videoYoutubeId && playerContainerRef.current) {
      loadYouTubeApi().then((YT) => {
        if (!mounted) return;
        if (!YT) return;
        const container = playerContainerRef.current;
        if (!container) return;
        // destroy existing
        try {
          if (playerRef.current && typeof playerRef.current.destroy === 'function') playerRef.current.destroy();
        } catch {}
        playerRef.current = new (YT.Player as YTPlayerConstructor)(container, {
          height: '360',
          width: '640',
          videoId: videoYoutubeId,
          playerVars: { autoplay: 1, controls: 1, rel: 0 },
          events: {
            onReady: (e: YTReadyEvent) => { try { e.target.playVideo(); } catch {} },
          },
        });
      }).catch(() => {});
    }

    return () => { mounted = false; };
  }, [videoOpen, videoYoutubeId]);

  return (
    <section className="hidden lg:block bg-[#0d0d12] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel>Scrim Vault</SectionLabel>
        {scrims.length === 0 ? (
          <div className="border border-white/10 bg-[#0b0b11] flex items-center justify-center text-[#666] text-sm py-10">
            No scrim videos available yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {scrims.slice(0, 3).map(s => <DesktopScrimCard key={s.id} scrim={s} onPlay={openVideo} />)}
            </div>
            {videoOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={closeVideo}>
                <div className="relative w-[90%] max-w-4xl" onClick={(e) => e.stopPropagation()}>
                  {videoYoutubeId ? (
                    <div ref={playerContainerRef} className="w-full h-[60vh] rounded bg-black" />
                  ) : (
                    <video className="w-full h-auto rounded bg-black" controls autoPlay src={videoUrl || undefined} />
                  )}
                  <button onClick={closeVideo} className="absolute -top-3 -right-3 w-8 h-8 bg-black/80 text-white rounded-full">×</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export const BestRoleAwards = () => {
  const { season, grouped, loading } = useRoleNominees();
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-slide every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % AWARD_ROLES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hidden lg:block bg-[#0d0d12] pb-10 border-t border-white/4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Best Role Awards</SectionLabel>
          {season && (
            <div className="flex items-center gap-2 -mt-4">
              <Trophy size={10} className="text-[#e8a000]" />
              <span className="text-[#555] text-[10px] font-mono">{season.name}</span>
              {season.status === 'ACTIVE' && (
                <a href="/awards" className="text-[#e8a000] text-[9px] font-black tracking-widest uppercase hover:underline ml-1">· Vote Now →</a>
              )}
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <Loader2 size={18} className="animate-spin text-[#e8a000]" />
            <span className="text-[#444] text-xs font-mono">Loading…</span>
          </div>
        ) : (
          <div className="relative">
            {/* Slider Container */}
            <div className="relative h-[480px] overflow-hidden">
              {AWARD_ROLES.map((meta, i) => {
                const leader = (grouped[meta.key] ?? [])[0] ?? null;
                return (
                  <AwardSlide key={meta.key} meta={meta} nominee={leader} isActive={i === activeIndex} />
                );
              })}
            </div>
            
            {/* Navigation Dots */}
            <div className="flex items-center justify-center gap-3 mt-5">
              {AWARD_ROLES.map((meta, i) => (
                <button
                  key={meta.key}
                  onClick={() => setActiveIndex(i)}
                  className="group relative flex items-center justify-center w-7 h-7 transition-all"
                >
                  <div
                    className={`w-2.5 h-2.5 transition-all duration-300 ${i === activeIndex ? 'scale-110' : 'scale-100 opacity-30 hover:opacity-60'}`}
                    style={{ background: i === activeIndex ? meta.color : '#555' }}
                  />
                  {/* Tooltip */}
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/95 text-[8px] font-black tracking-widest uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-white/5"
                    style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                </button>
              ))}
            </div>
            
            {/* CTA Button */}
            {season?.status === 'ACTIVE' && (
              <div className="text-center mt-5">
                <a href="/awards" className="inline-flex items-center gap-2.5 px-7 py-3 bg-[#e8a000] text-black text-[10px] font-black tracking-[0.2em] uppercase hover:bg-[#ffb800] transition-colors">
                  <Vote size={13} />
                  Vote for your favorites
                  <ChevronRight size={13} />
                </a>
              </div>
            )}
          </div>
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
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % AWARD_ROLES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setCurrent(c => diff > 0 ? (c + 1) % AWARD_ROLES.length : (c - 1 + AWARD_ROLES.length) % AWARD_ROLES.length);
    }
    setTouchStart(null);
  };

  const meta = AWARD_ROLES[current];
  const { color, Icon } = meta;
  const nominee = (grouped[meta.key] ?? [])[0] ?? null;

  return (
    <div className="relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Award Title */}
      <AnimatePresence mode="wait">
        <motion.div
          key={meta.key + '-title'}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-2"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Icon size={11} style={{ color }} />
            <span className="text-[9px] font-black tracking-[0.2em] uppercase" style={{ color }}>{meta.label}</span>
          </div>
          <h3 className="text-base font-black tracking-[0.15em] uppercase" style={{ color }}>{meta.award}</h3>
        </motion.div>
      </AnimatePresence>

      {/* Leader Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={meta.key}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.35 }}
        >
          {nominee ? (
            <div className="relative max-w-xs mx-auto">
              {/* Glow effect */}
              <div className="absolute -inset-1 opacity-25 blur-xl" style={{ background: color }} />
              
              <div className="relative bg-[#0c0c12] border overflow-hidden" style={{ borderColor: `${color}40` }}>
                {/* Player Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  {nominee.photo ? (
                    <Image src={nominee.photo} alt={nominee.ign} fill className="object-cover object-top" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
                      <Users size={36} style={{ color, opacity: 0.3 }} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-[#0c0c12] via-transparent to-transparent" />
                  
                  {/* Vote count badge */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm">
                    <Trophy size={9} style={{ color }} />
                    <span className="text-white text-[9px] font-black tabular-nums">{nominee.votes}</span>
                    <span className="text-[#666] text-[8px]">votes</span>
                  </div>
                </div>
                
                {/* Player Info */}
                <div className="p-3 text-center">
                  <p className="text-white font-black text-lg uppercase tracking-wide">{nominee.ign}</p>
                  <div className="flex items-center justify-center gap-2 mt-0.5">
                    <span className="text-[#666] text-[9px] tracking-widest uppercase">{nominee.team.name}</span>
                    {nominee.signatureHero && (
                      <>
                        <span className="text-[#333]">·</span>
                        <span className="text-[9px] tracking-wide" style={{ color }}>{nominee.signatureHero}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 border border-white/5 bg-[#0c0c12] max-w-xs mx-auto">
              <Icon size={28} style={{ color, opacity: 0.3 }} />
              <p className="text-[#333] text-xs uppercase tracking-wide mt-2">No nominees yet</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Dots */}
      <div className="flex items-center justify-center gap-3 mt-5">
        {AWARD_ROLES.map((r, i) => (
          <button
            key={r.key}
            onClick={() => setCurrent(i)}
            className="relative w-6 h-6 flex items-center justify-center"
          >
            <div
              className={`w-2 h-2 transition-all duration-300 ${i === current ? 'scale-125' : 'scale-100 opacity-40'}`}
              style={{ background: i === current ? r.color : '#444' }}
            />
          </button>
        ))}
      </div>

      {/* CTA Button */}
      {season?.status === 'ACTIVE' && (
        <div className="text-center mt-4">
          <a href="/awards" className="inline-flex items-center gap-2 px-5 py-2 bg-[#e8a000] text-black text-[9px] font-black tracking-[0.2em] uppercase hover:bg-[#ffb800] transition-colors">
            <Vote size={11} />
            Vote Now
            <ChevronRight size={11} />
          </a>
        </div>
      )}
    </div>
  );
};

export const MobileScrimAndAwards = () => {
  const scrims = useRealtimeScrims();
  const { season, grouped, loading } = useRoleNominees();
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoYoutubeId, setVideoYoutubeId] = useState<string | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);

  const openVideo = (url: string | null) => {
    if (!url) return;
    setVideoUrl(url);
    setVideoYoutubeId(getYoutubeIdFromUrl(url));
    setVideoOpen(true);
  };

  const closeVideo = () => {
    try {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') playerRef.current.destroy();
    } catch {}
    playerRef.current = null;
    setVideoOpen(false);
    setVideoUrl(null);
    setVideoYoutubeId(null);
  };

  useEffect(() => {
    let mounted = true;
    if (!videoOpen) return;
    if (videoYoutubeId && playerContainerRef.current) {
      loadYouTubeApi().then((YT) => {
        if (!mounted) return;
        if (!YT) return;
        const container = playerContainerRef.current;
        if (!container) return;
        try { if (playerRef.current && typeof playerRef.current.destroy === 'function') playerRef.current.destroy(); } catch {}
        playerRef.current = new (YT.Player as YTPlayerConstructor)(container, {
          height: '360', width: '640', videoId: videoYoutubeId,
          playerVars: { autoplay: 1, controls: 1, rel: 0 },
          events: { onReady: (e: YTReadyEvent) => { try { e.target.playVideo(); } catch {} } },
        });
      }).catch(() => {});
    }
    return () => { mounted = false; };
  }, [videoOpen, videoYoutubeId]);

  const featured = scrims.find(s => s.featured) || scrims[0];
  const rest = scrims.filter(s => s.id !== featured?.id).slice(0, 3);

  if (!featured) {
    return (
      <section className="lg:hidden bg-[#0d0d12] py-6">
        <div className="px-4 sm:px-6 mb-6">
          <SectionLabel>Scrim Vault</SectionLabel>
          <div className="border border-white/10 bg-[#0b0b11] px-4 py-8 text-center text-[#666] text-sm">
            No scrim videos available yet.
          </div>
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
      </section>
    );
  }

  return (
    <section className="lg:hidden bg-[#0d0d12] py-6">
      <div className="px-4 sm:px-6 mb-6">
        <SectionLabel>Scrim Vault</SectionLabel>
        <MobileFeaturedScrim scrim={featured} onPlay={openVideo} />
        <div className="flex flex-col gap-3">
          {rest.map((s, i) => <MobileScrimRow key={s.id} scrim={s} index={i} onPlay={openVideo} />)}
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={closeVideo}>
          <div className="relative w-[95%] max-w-lg" onClick={(e) => e.stopPropagation()}>
            {videoYoutubeId ? (
              <div ref={playerContainerRef} className="w-full h-[50vh] rounded bg-black" />
            ) : (
              <video className="w-full h-auto rounded bg-black" controls autoPlay src={videoUrl || undefined} />
            )}
            <button onClick={closeVideo} className="absolute -top-3 -right-3 w-8 h-8 bg-black/80 text-white rounded-full">×</button>
          </div>
        </div>
      )}
    </section>
  );
};
