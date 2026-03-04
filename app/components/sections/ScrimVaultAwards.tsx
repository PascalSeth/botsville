'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Image from 'next/image';
import {
  Play, ChevronRight, Trophy, Vote, CheckCircle2, Loader2, Users,
  Shield, Swords, Zap, Crosshair, HeartHandshake,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

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
const DesktopScrimCard = ({ scrim }: { scrim: ScrimItem }) => (
  <div className="group cursor-pointer flex flex-col gap-1.5">
    <div className="relative w-full aspect-video overflow-hidden bg-[#111]">
      <Image src={scrim.image} alt={scrim.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500 brightness-75 group-hover:brightness-90" />
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
      {scrim.featured && <div className="absolute inset-0 border border-[#e8a000]/50 pointer-events-none" />}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-9 h-9 bg-[#e8a000] flex items-center justify-center shadow-lg shadow-[#e8a000]/30">
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

// ─── Desktop Award Card ───────────────────────────────────────
const DesktopAwardCard = ({
  meta, nominee, canVote, isPending, onVote,
}: {
  meta: RoleMeta;
  nominee: AwardNominee | null;
  canVote: boolean;
  isPending: boolean;
  onVote: (playerId: string, role: string) => void;
}) => {
  const { color, Icon } = meta;
  if (!nominee) {
    return (
      <div className="flex flex-col gap-1.5 opacity-40">
        <div className="relative w-full aspect-square bg-[#111] flex flex-col items-center justify-center gap-2 border border-white/5">
          <Icon size={22} style={{ color }} />
          <p className="text-[#444] text-[9px] tracking-widest uppercase">{meta.label}</p>
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.15em] uppercase" style={{ color }}>{meta.award}</p>
          <p className="text-[#333] text-[11px] uppercase tracking-wide">No nominees yet</p>
        </div>
      </div>
    );
  }
  return (
    <div className="group flex flex-col gap-1.5">
      <div className="relative w-full aspect-square overflow-hidden bg-[#111]">
        {nominee.photo ? (
          <Image src={nominee.photo} alt={nominee.ign} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-500 grayscale-40 group-hover:grayscale-0" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><Users size={28} className="text-[#2a2a2a]" /></div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
        <span className="absolute top-1.5 right-1.5 flex items-center gap-1 text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5"
          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
          <Icon size={8} /> {meta.label}
        </span>
        {nominee.votedByMe && (
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 0 0 0 1px ${color}55` }} />
        )}
        {nominee.signatureHero && (
          <p className="absolute bottom-1.5 left-2 text-[#aaa] text-[9px] tracking-widest uppercase font-semibold">{nominee.signatureHero}</p>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black tracking-[0.15em] uppercase" style={{ color }}>{meta.award}</p>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <div className="min-w-0">
            <p className="text-white font-black text-[11px] uppercase tracking-wide leading-tight group-hover:text-[#e8a000] transition-colors truncate">{nominee.ign}</p>
            <p className="text-[#444] text-[9px] truncate">{nominee.team.tag}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[#555] text-[9px] tabular-nums">{nominee.votes}</span>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => onVote(nominee.id, meta.key)}
              disabled={!canVote || isPending}
              className="flex items-center justify-center w-6 h-6 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={nominee.votedByMe
                ? { background: `${color}20`, border: `1px solid ${color}50`, color }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#666' }}
            >
              {isPending ? <Loader2 size={9} className="animate-spin" /> : nominee.votedByMe ? <CheckCircle2 size={9} /> : <Vote size={9} />}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Desktop Exported Sections ────────────────────────────────
export const ScrimVault = () => {
  const scrims = useRealtimeScrims();

  return (
    <section className="hidden lg:block bg-[#0d0d12] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel>Scrim Vault</SectionLabel>
        {scrims.length === 0 ? (
          <div className="border border-white/10 bg-[#0b0b11] flex items-center justify-center text-[#666] text-sm py-10">
            No scrim videos available yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {scrims.slice(0, 3).map(s => <DesktopScrimCard key={s.id} scrim={s} />)}
          </div>
        )}
      </div>
    </section>
  );
};

export const BestRoleAwards = () => {
  const { data: session } = useSession();
  const { season, grouped, userVotes, setGrouped, setUserVotes, loading } = useRoleNominees();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleVote = useCallback((playerId: string, role: string) => {
    if (!session || !season || season.status !== 'ACTIVE') return;
    const currentVote = userVotes[role];
    const isToggle = currentVote === playerId;
    setUserVotes(prev => { const n = { ...prev }; if (isToggle) delete n[role]; else n[role] = playerId; return n; });
    setGrouped(prev => {
      const list = (prev[role] ?? []).map(n => {
        let v = n.votes;
        if (n.id === currentVote && !isToggle) v = Math.max(0, v - 1);
        if (n.id === playerId) v = isToggle ? Math.max(0, v - 1) : v + 1;
        return { ...n, votes: v, votedByMe: !isToggle && n.id === playerId };
      }).sort((a, b) => b.votes - a.votes);
      return { ...prev, [role]: list };
    });
    setPendingId(playerId);
    startTransition(async () => {
      try {
        await fetch('/api/awards/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, role, seasonId: season.id }),
        });
      } catch { /* silent */ }
      finally { setPendingId(null); }
    });
  }, [session, season, userVotes, setGrouped, setUserVotes]);

  const canVote = !!session && season?.status === 'ACTIVE';

  return (
    <section className="hidden lg:block bg-[#0d0d12] pb-10 border-t border-white/4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Best Role Awards</SectionLabel>
          {season && (
            <div className="flex items-center gap-2 -mt-4">
              <Trophy size={10} className="text-[#e8a000]" />
              <span className="text-[#555] text-[10px] font-mono">{season.name}</span>
              {season.status === 'ACTIVE'
                ? <span className="text-[#e8a000] text-[9px] font-black tracking-widest uppercase">· Voting open</span>
                : <span className="text-[#444] text-[9px] font-black tracking-widest uppercase">· Voting closed</span>
              }
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <Loader2 size={18} className="animate-spin text-[#e8a000]" />
            <span className="text-[#444] text-xs font-mono">Loading…</span>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {AWARD_ROLES.map(meta => {
              const leader = (grouped[meta.key] ?? [])[0] ?? null;
              return (
                <DesktopAwardCard key={meta.key} meta={meta} nominee={leader}
                  canVote={canVote} isPending={isPending && pendingId === leader?.id} onVote={handleVote} />
              );
            })}
          </div>
        )}
        {!session && !loading && (
          <p className="mt-3 text-[#444] text-[10px] tracking-wide">Sign in to vote for your favourite players.</p>
        )}
      </div>
    </section>
  );
};

// ══════════════════════════════════════════════════════════════
// MOBILE — combined Scrim Vault + Best Role Awards
// ══════════════════════════════════════════════════════════════

const MobileFeaturedScrim = ({ scrim }: { scrim: ScrimItem }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
    className="group relative cursor-pointer aspect-video overflow-hidden bg-[#111] mb-3"
  >
    <Image src={scrim.image} alt={scrim.title} fill className="object-cover brightness-75 group-hover:scale-105 transition-transform duration-500" />
    <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/30 to-transparent" />
    <div className="absolute inset-0 border border-[#e8a000]/40 pointer-events-none" />
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div whileTap={{ scale: 0.92 }} className="w-12 h-12 bg-[#e8a000] flex items-center justify-center shadow-2xl shadow-[#e8a000]/40">
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

const MobileScrimRow = ({ scrim, index }: { scrim: ScrimItem; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: index * 0.08 }}
    className="group cursor-pointer flex items-center gap-3 border-b border-white/5 pb-3"
  >
    <div className="relative w-24 aspect-video shrink-0 overflow-hidden bg-[#111]">
      <Image src={scrim.image} alt={scrim.title} fill className="object-cover brightness-75 group-hover:brightness-90 transition-all duration-300" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-6 h-6 bg-[#e8a000] flex items-center justify-center">
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

const MobileAwardCard = ({
  meta, nominee, index, canVote, isPending, onVote,
}: {
  meta: RoleMeta;
  nominee: AwardNominee | null;
  index: number;
  canVote: boolean;
  isPending: boolean;
  onVote: (playerId: string, role: string) => void;
}) => {
  const { color, Icon } = meta;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.1 }}
      className="flex items-stretch border border-white/6 overflow-hidden bg-[#0c0c12]"
      style={nominee?.votedByMe ? { borderColor: `${color}44` } : undefined}
    >
      <div className="w-0.5 shrink-0" style={{ background: color }} />
      <div className="relative w-16 shrink-0 aspect-square bg-[#111]">
        {nominee?.photo ? (
          <>
            <Image src={nominee.photo} alt={nominee.ign} fill className="object-cover object-top grayscale-30" />
            <div className="absolute inset-0 bg-linear-to-r from-transparent to-[#0c0c12]/60" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon size={20} style={{ color, opacity: 0.3 }} />
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-center px-3 py-2.5 min-w-0">
        <span className="inline-flex items-center gap-1 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 self-start mb-1"
          style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
          <Icon size={7} /> {meta.label}
        </span>
        <p className="text-[10px] font-black tracking-[0.12em] uppercase leading-none" style={{ color }}>{meta.award}</p>
        {nominee ? (
          <>
            <p className="text-white font-black text-sm uppercase tracking-wide leading-tight mt-0.5 truncate">{nominee.ign}</p>
            <p className="text-[#444] text-[9px] tracking-widest uppercase mt-0.5">{nominee.signatureHero ?? nominee.team.tag}</p>
          </>
        ) : (
          <p className="text-[#333] text-[11px] uppercase tracking-wide mt-0.5">No nominees yet</p>
        )}
      </div>
      <div className="shrink-0 flex flex-col items-center justify-center px-3 gap-1">
        {nominee ? (
          <>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => onVote(nominee.id, meta.key)}
              disabled={!canVote || isPending}
              className="flex items-center justify-center w-7 h-7 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={nominee.votedByMe
                ? { background: `${color}20`, border: `1px solid ${color}55`, color }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#555' }}
            >
              {isPending ? <Loader2 size={10} className="animate-spin" /> : nominee.votedByMe ? <CheckCircle2 size={10} /> : <Vote size={10} />}
            </motion.button>
            <span className="text-[#444] text-[9px] font-black tabular-nums">{nominee.votes}</span>
          </>
        ) : (
          <span className="text-[#222] font-black text-2xl tabular-nums font-mono leading-none">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export const MobileScrimAndAwards = () => {
  const scrims = useRealtimeScrims();
  const { data: session } = useSession();
  const { season, grouped, userVotes, setGrouped, setUserVotes, loading } = useRoleNominees();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const featured = scrims.find(s => s.featured) || scrims[0];
  const rest = scrims.filter(s => s.id !== featured?.id).slice(0, 3);

  const handleVote = useCallback((playerId: string, role: string) => {
    if (!session || !season || season.status !== 'ACTIVE') return;
    const currentVote = userVotes[role];
    const isToggle = currentVote === playerId;
    setUserVotes(prev => { const n = { ...prev }; if (isToggle) delete n[role]; else n[role] = playerId; return n; });
    setGrouped(prev => {
      const list = (prev[role] ?? []).map(n => {
        let v = n.votes;
        if (n.id === currentVote && !isToggle) v = Math.max(0, v - 1);
        if (n.id === playerId) v = isToggle ? Math.max(0, v - 1) : v + 1;
        return { ...n, votes: v, votedByMe: !isToggle && n.id === playerId };
      }).sort((a, b) => b.votes - a.votes);
      return { ...prev, [role]: list };
    });
    setPendingId(playerId);
    startTransition(async () => {
      try {
        await fetch('/api/awards/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, role, seasonId: season.id }),
        });
      } catch { /* silent */ }
      finally { setPendingId(null); }
    });
  }, [session, season, userVotes, setGrouped, setUserVotes]);

  const canVote = !!session && season?.status === 'ACTIVE';

  if (!featured) {
    return (
      <section className="lg:hidden bg-[#0d0d12] py-6">
        <div className="px-4 sm:px-6 mb-6">
          <SectionLabel>Scrim Vault</SectionLabel>
          <div className="border border-white/10 bg-[#0b0b11] px-4 py-8 text-center text-[#666] text-sm">
            No scrim videos available yet.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="lg:hidden bg-[#0d0d12] py-6">
      <div className="px-4 sm:px-6 mb-6">
        <SectionLabel>Scrim Vault</SectionLabel>
        <MobileFeaturedScrim scrim={featured} />
        <div className="flex flex-col gap-3">
          {rest.map((s, i) => <MobileScrimRow key={s.id} scrim={s} index={i} />)}
        </div>
      </div>

      <div className="h-px mx-4 sm:mx-6 bg-white/4 mb-6" />

      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Best Role Awards</SectionLabel>
          {season?.status === 'ACTIVE' && (
            <span className="text-[#e8a000] text-[9px] font-black tracking-widest uppercase -mt-4">Voting open</span>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 size={16} className="animate-spin text-[#e8a000]" />
            <span className="text-[#444] text-xs font-mono">Loading…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {AWARD_ROLES.map((meta, i) => {
              const leader = (grouped[meta.key] ?? [])[0] ?? null;
              return (
                <MobileAwardCard key={meta.key} meta={meta} nominee={leader} index={i}
                  canVote={canVote} isPending={isPending && pendingId === leader?.id} onVote={handleVote} />
              );
            })}
          </div>
        )}
        {!session && !loading && (
          <p className="mt-3 text-[#444] text-[10px] tracking-wide">Sign in to vote.</p>
        )}
      </div>
    </section>
  );
};
