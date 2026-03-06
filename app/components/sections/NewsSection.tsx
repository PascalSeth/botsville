'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Shield, Tag, Star, ChevronRight, Newspaper, Palette, Trophy, Clock, Flame, Zap, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

/* ================================================================
   Types
   ================================================================ */

interface NewsArticle {
  id: string;
  category: 'PATCH_NOTES' | 'NEW_EVENT' | 'NEW_HERO';
  title: string;
  subtitle: string | null;
  body: string;
  image: string | null;
  tags: string[];
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  _count: { reactions: number };
}

interface FanArtwork {
  id: string;
  title: string;
  imageUrl: string;
  approved: boolean;
  createdAt: string;
  artist: { id: string; ign: string | null; photo: string | null };
}

interface TopTeamData {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
  color: string | null;
  standings: { rank: number; wins: number; losses: number; points: number; tier: string | null }[];
}

/* ================================================================
   Data hook
   ================================================================ */

function useNewsSectionData() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [fanArts, setFanArts] = useState<FanArtwork[]>([]);
  const [topTeam, setTopTeam] = useState<TopTeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [newsRes, artRes, teamRes] = await Promise.all([
          fetch('/api/news?status=PUBLISHED&limit=6'),
          fetch('/api/fan-art?approved=true&limit=5'),
          fetch('/api/leaderboards/teams?limit=1'),
        ]);
        const [newsJson, artJson, teamJson] = await Promise.all([
          newsRes.ok ? newsRes.json() : null,
          artRes.ok ? artRes.json() : null,
          teamRes.ok ? teamRes.json() : null,
        ]);
        if (cancelled) return;
        if (newsJson?.articles) setNews(newsJson.articles);
        if (artJson?.artworks) setFanArts(artJson.artworks);
        if (teamJson?.teams?.[0]) setTopTeam(teamJson.teams[0]);
      } catch { /* graceful */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { news, fanArts, topTeam, loading };
}

/* ================================================================
   Helpers
   ================================================================ */

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string; dot: string }> = {
  PATCH_NOTES: { label: 'Patch Notes', icon: <Shield size={10} />, color: 'text-sky-400 bg-sky-400/10 border-sky-400/20', dot: 'bg-sky-400' },
  NEW_EVENT:   { label: 'New Event',   icon: <Star size={10} />,   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', dot: 'bg-amber-400' },
  NEW_HERO:    { label: 'New Hero',    icon: <Tag size={10} />,    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-400' },
};

function categoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? { label: cat.replace(/_/g, ' '), icon: <Newspaper size={10} />, color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20', dot: 'bg-zinc-400' };
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ================================================================
   Background — refined, subtle depth
   ================================================================ */

const Background = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {/* Noise texture */}
    <div className="absolute inset-0 opacity-[0.018]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }} />
    {/* Subtle grid */}
    <div className="absolute inset-0 opacity-[0.03]" style={{
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
      backgroundSize: '64px 64px',
    }} />
    {/* Amber glow — top left */}
    <div className="absolute -top-64 -left-32 w-[600px] h-[600px] rounded-full bg-amber-500/[0.04] blur-[150px]" />
    {/* Blue glow — bottom right */}
    <div className="absolute -bottom-48 -right-24 w-[500px] h-[500px] rounded-full bg-blue-600/[0.04] blur-[120px]" />
    {/* Top rule with gradient */}
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
    {/* Bottom rule */}
    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
  </div>
);

/* ================================================================
   Skeleton
   ================================================================ */

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className}`} />
);

/* ================================================================
   Category Badge
   ================================================================ */

const CategoryBadge = ({ category, size = 'sm' }: { category: string; size?: 'xs' | 'sm' }) => {
  const meta = categoryMeta(category);
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full font-semibold tracking-wider uppercase ${meta.color} ${size === 'xs' ? 'text-[8px] px-2 py-0.5' : 'text-[9px] px-2.5 py-1'}`}>
      <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

/* ================================================================
   Section Header — refined
   ================================================================ */

const SectionHeader = ({ title, href, icon }: { title: string; href?: string; icon?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-0.5 h-5 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
        <h2 className="text-white font-bold text-xs tracking-[0.18em] uppercase">
          {title}
        </h2>
      </div>
      {icon && <span className="text-amber-400/60">{icon}</span>}
    </div>
    {href && (
      <Link href={href} className="group flex items-center gap-1 text-zinc-500 hover:text-amber-400 text-[10px] tracking-[0.15em] uppercase transition-colors duration-200">
        All posts
        <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform duration-200" />
      </Link>
    )}
  </div>
);

/* ================================================================
   Desktop: Featured Card (large)
   ================================================================ */

const FeaturedCard = ({ article }: { article: NewsArticle }) => (
  <motion.article
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    className="group relative col-span-2 row-span-2 rounded-2xl overflow-hidden cursor-pointer bg-zinc-900"
  >
    <div className="relative aspect-[16/10] overflow-hidden">
      {article.image ? (
        <Image
          src={article.image}
          alt={article.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
          <Newspaper size={56} className="text-zinc-700" />
        </div>
      )}
      {/* Multi-layer scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

      {/* Top meta row */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
        <CategoryBadge category={article.category} />
        {article._count.reactions > 0 && (
          <span className="flex items-center gap-1 text-white/70 text-[10px] bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
            <Flame size={10} className="text-amber-400" />
            {article._count.reactions}
          </span>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        {/* Featured label */}
        <div className="flex items-center gap-2 mb-3">
          <Zap size={11} className="text-amber-400" />
          <span className="text-amber-400 text-[9px] font-bold tracking-[0.2em] uppercase">Featured</span>
        </div>
        <h3 className="text-white font-black text-[22px] leading-[1.15] tracking-tight uppercase mb-2 group-hover:text-amber-50 transition-colors duration-300 max-w-xl">
          {article.title}
        </h3>
        {article.subtitle && (
          <p className="text-zinc-400 text-xs leading-relaxed mb-3 max-w-sm line-clamp-2">{article.subtitle}</p>
        )}
        <div className="flex items-center gap-3">
          <span className="text-zinc-500 text-[10px] flex items-center gap-1.5">
            <Clock size={10} />
            {timeAgo(article.publishedAt ?? article.createdAt)}
          </span>
          {article.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-zinc-600 text-[9px] uppercase tracking-wider">#{tag}</span>
          ))}
        </div>
      </div>
    </div>

    {/* Bottom border glow on hover */}
    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
  </motion.article>
);

/* ================================================================
   Desktop: Standard News Card
   ================================================================ */

const NewsCard = ({ article, index }: { article: NewsArticle; index: number }) => (
  <motion.article
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    className="group relative rounded-2xl overflow-hidden cursor-pointer bg-zinc-900/60 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 flex flex-col"
  >
    {/* Image */}
    <div className="relative aspect-[4/3] overflow-hidden shrink-0">
      {article.image ? (
        <Image
          src={article.image}
          alt={article.title}
          fill
          className="object-cover transition-transform duration-600 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
          <Newspaper size={32} className="text-zinc-700" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute top-3 left-3">
        <CategoryBadge category={article.category} size="xs" />
      </div>
    </div>

    {/* Body */}
    <div className="flex flex-col gap-2 p-4 flex-1">
      <h3 className="text-white font-bold text-[13px] leading-snug tracking-wide uppercase group-hover:text-amber-300 transition-colors duration-200 line-clamp-2">
        {article.title}
      </h3>
      {article.subtitle && (
        <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-2">{article.subtitle}</p>
      )}
      <div className="flex items-center gap-2 mt-auto pt-2">
        <Clock size={9} className="text-zinc-600" />
        <span className="text-zinc-600 text-[10px]">{timeAgo(article.publishedAt ?? article.createdAt)}</span>
        {article._count.reactions > 0 && (
          <>
            <span className="text-zinc-800 ml-auto">
              <Flame size={9} className="text-amber-500/60" />
            </span>
            <span className="text-zinc-600 text-[10px]">{article._count.reactions}</span>
          </>
        )}
      </div>
    </div>

    {/* Hover line */}
    <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
  </motion.article>
);

/* ================================================================
   Sidebar: Top Team
   ================================================================ */

const TopTeamCard = ({ topTeam }: { topTeam: TopTeamData }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-900/60"
  >
    {/* Header band */}
    <div className="relative h-24 overflow-hidden">
      {topTeam.logo ? (
        <Image src={topTeam.logo} alt="" fill className="object-cover opacity-20 blur-md scale-110" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-zinc-900" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
      {/* Rank badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-1">
        <Trophy size={9} className="text-amber-400" />
        <span className="text-amber-400 text-[9px] font-bold tracking-widest uppercase">Rank #1</span>
      </div>
    </div>

    <div className="px-4 pb-4 -mt-8 relative z-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/[0.08] flex items-center justify-center overflow-hidden shadow-xl shrink-0">
          {topTeam.logo ? (
            <Image src={topTeam.logo} alt={topTeam.name} width={40} height={40} className="object-contain" />
          ) : (
            <Trophy size={20} className="text-amber-400" />
          )}
        </div>
        <div>
          <p className="text-white font-black text-sm tracking-wide uppercase">{topTeam.name}</p>
          <p className="text-zinc-500 text-[10px] tracking-widest font-medium">[{topTeam.tag}]</p>
        </div>
      </div>

      {topTeam.standings?.[0] && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Rank', value: `#${topTeam.standings[0].rank}` },
            { label: 'W / L', value: `${topTeam.standings[0].wins}–${topTeam.standings[0].losses}` },
            { label: 'Pts', value: String(topTeam.standings[0].points) },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <span className="text-amber-400 font-black text-sm leading-none">{s.value}</span>
              <span className="text-zinc-600 text-[8px] tracking-widest uppercase mt-1">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </motion.div>
);

/* ================================================================
   Sidebar: Fan Art
   ================================================================ */

const FanArtSidebar = ({ fanArts }: { fanArts: FanArtwork[] }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-0.5 h-4 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full" />
        <h3 className="text-white font-bold text-xs tracking-[0.18em] uppercase flex items-center gap-1.5">
          <Palette size={11} className="text-purple-400" />
          Fan Art
        </h3>
      </div>
      <Link href="/fan-art" className="text-zinc-500 hover:text-purple-400 text-[10px] tracking-widest uppercase transition-colors flex items-center gap-1 group">
        See all <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>

    <div className="space-y-1">
      {fanArts.map((art, i) => (
        <motion.div
          key={art.id}
          initial={{ opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05 }}
          className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative border border-white/[0.06]">
            <Image src={art.imageUrl} alt={art.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-300 text-[11px] font-medium tracking-wide truncate group-hover:text-white transition-colors">{art.title}</p>
            <p className="text-zinc-600 text-[9px] mt-0.5">by {art.artist?.ign ?? 'Anonymous'}</p>
          </div>
          <ChevronRight size={10} className="text-zinc-700 group-hover:text-purple-400 transition-colors shrink-0" />
        </motion.div>
      ))}
    </div>
  </div>
);

/* ================================================================
   Mobile: Featured card
   ================================================================ */

const MobileFeatured = ({ article }: { article: NewsArticle }) => (
  <motion.article
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="group relative overflow-hidden aspect-[16/10] rounded-2xl bg-zinc-900 cursor-pointer"
  >
    {article.image ? (
      <Image src={article.image} alt={article.title} fill className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
    ) : (
      <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
        <Newspaper size={40} className="text-zinc-700" />
      </div>
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between">
      <CategoryBadge category={article.category} size="xs" />
      {article._count.reactions > 0 && (
        <span className="flex items-center gap-1 text-white/60 text-[9px] bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-2 py-0.5">
          <Flame size={9} className="text-amber-400" />
          {article._count.reactions}
        </span>
      )}
    </div>

    <div className="absolute bottom-0 left-0 right-0 p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap size={10} className="text-amber-400" />
        <span className="text-amber-400 text-[8px] font-bold tracking-[0.2em] uppercase">Featured</span>
      </div>
      <h3 className="text-white font-black text-lg leading-tight tracking-tight uppercase mb-2 group-hover:text-amber-50 transition-colors">
        {article.title}
      </h3>
      <div className="flex items-center gap-2.5">
        <Clock size={9} className="text-zinc-500" />
        <span className="text-zinc-500 text-[10px]">{timeAgo(article.publishedAt ?? article.createdAt)}</span>
        {article.tags.slice(0, 1).map(t => (
          <span key={t} className="text-zinc-600 text-[9px] uppercase tracking-wide">#{t}</span>
        ))}
      </div>
    </div>
  </motion.article>
);

/* ================================================================
   Mobile: Small horizontal card
   ================================================================ */

const MobileCard = ({ article, index }: { article: NewsArticle; index: number }) => (
  <motion.article
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay: index * 0.07 }}
    className="group flex gap-3 items-stretch cursor-pointer py-3 border-b border-white/[0.05] last:border-0"
  >
    <div className="relative w-[72px] shrink-0 aspect-square overflow-hidden rounded-xl bg-zinc-900">
      {article.image ? (
        <Image src={article.image} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
          <Newspaper size={18} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
    <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
      <div>
        <CategoryBadge category={article.category} size="xs" />
        <p className="text-white font-bold text-sm tracking-wide uppercase leading-snug group-hover:text-amber-300 transition-colors line-clamp-2 mt-1.5">
          {article.title}
        </p>
      </div>
      <span className="text-zinc-600 text-[10px] flex items-center gap-1 mt-1">
        <Clock size={9} />{timeAgo(article.publishedAt ?? article.createdAt)}
      </span>
    </div>
    <ChevronRight size={12} className="text-zinc-700 group-hover:text-amber-400 transition-colors self-center shrink-0" />
  </motion.article>
);

/* ================================================================
   Mobile: Top team banner
   ================================================================ */

const MobileTeamBanner = ({ topTeam }: { topTeam: TopTeamData }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="relative overflow-hidden rounded-2xl border border-amber-400/10 bg-zinc-900/70 flex items-center gap-3 p-3"
  >
    <div className="absolute inset-0">
      {topTeam.logo && <Image src={topTeam.logo} alt="" fill className="object-cover opacity-[0.08] blur-md" />}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-transparent" />
    </div>
    <div className="relative z-10 w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 overflow-hidden">
      {topTeam.logo
        ? <Image src={topTeam.logo} alt={topTeam.name} width={36} height={36} className="object-contain" />
        : <Trophy size={20} className="text-amber-400" />}
    </div>
    <div className="relative z-10 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <TrendingUp size={9} className="text-amber-400" />
        <span className="text-amber-400 text-[8px] font-bold tracking-[0.2em] uppercase">#1 Team</span>
      </div>
      <p className="text-white font-black text-sm tracking-wide uppercase truncate">{topTeam.name}</p>
      {topTeam.standings?.[0] && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-zinc-400 text-[10px]">{topTeam.standings[0].wins}W – {topTeam.standings[0].losses}L</span>
          <span className="text-amber-400 text-[10px] font-bold">{topTeam.standings[0].points} pts</span>
        </div>
      )}
    </div>
  </motion.div>
);

/* ================================================================
   Empty state
   ================================================================ */

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mb-4">
      <Newspaper size={24} className="text-zinc-600" />
    </div>
    <p className="text-zinc-500 text-sm font-medium">No {label} yet</p>
    <p className="text-zinc-700 text-xs mt-1">Check back soon!</p>
  </div>
);

/* ================================================================
   Mobile layout
   ================================================================ */

const MobileSection = ({ news, fanArts, topTeam, loading }: ReturnType<typeof useNewsSectionData>) => {
  const featured = useMemo(() => news.find(n => n.featured) ?? news[0] ?? null, [news]);
  const rest = useMemo(() => news.filter(n => n !== featured), [news, featured]);

  return (
    <div className="lg:hidden py-8 px-4 sm:px-6">
      {/* News */}
      <SectionHeader title="Esports News" href="/news" />
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="aspect-[16/10]" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : news.length === 0 ? (
        <EmptyState label="news" />
      ) : (
        <>
          {featured && <Link href={`/news/${featured.id}`} className="block mb-4"><MobileFeatured article={featured} /></Link>}
          <div className="mb-8">
            {rest.map((a, i) => (
              <Link key={a.id} href={`/news/${a.id}`}>
                <MobileCard article={a} index={i} />
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Community */}
      <SectionHeader title="Community Corner" />
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <div className="space-y-5">
          {topTeam && <MobileTeamBanner topTeam={topTeam} />}
          {fanArts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full" />
                  <h3 className="text-white font-bold text-xs tracking-[0.18em] uppercase flex items-center gap-1.5">
                    <Palette size={11} className="text-purple-400" />Fan Art
                  </h3>
                </div>
                <Link href="/fan-art" className="text-zinc-500 hover:text-purple-400 text-[10px] tracking-widest uppercase transition-colors">See all</Link>
              </div>
              {fanArts.map((art, i) => (
                <motion.div key={art.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}
                  className="group flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative border border-white/[0.06]">
                    <Image src={art.imageUrl} alt={art.title} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-[11px] font-medium truncate group-hover:text-white transition-colors">{art.title}</p>
                    <p className="text-zinc-600 text-[9px] mt-0.5">by {art.artist?.ign ?? 'Anonymous'}</p>
                  </div>
                  <ChevronRight size={10} className="text-zinc-700 group-hover:text-purple-400 transition-colors shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ================================================================
   Desktop layout
   ================================================================ */

const DesktopSection = ({ news, fanArts, topTeam, loading }: ReturnType<typeof useNewsSectionData>) => {
  const featured = useMemo(() => news.find(n => n.featured) ?? null, [news]);
  const nonFeatured = useMemo(() => news.filter(n => n !== featured), [news, featured]);

  return (
    <div className="hidden lg:block py-14">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_288px] gap-10">

          {/* Left: News */}
          <div>
            <SectionHeader title="Esports News" href="/news" />
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="col-span-2 aspect-[16/10]" />
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[4/3]" />)}
              </div>
            ) : news.length === 0 ? (
              <EmptyState label="news" />
            ) : (
              <div className="grid grid-cols-3 gap-4 auto-rows-auto">
                {featured && (
                  <Link href={`/news/${featured.id}`} className="col-span-2 row-span-2">
                    <FeaturedCard article={featured} />
                  </Link>
                )}
                {nonFeatured.slice(0, featured ? 4 : 6).map((a, i) => (
                  <Link key={a.id} href={`/news/${a.id}`}>
                    <NewsCard article={a} index={i} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <aside className="flex flex-col gap-6">
            <SectionHeader title="Community" />
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-36" />
                <Skeleton className="h-48" />
              </div>
            ) : (
              <>
                {topTeam && <TopTeamCard topTeam={topTeam} />}
                {fanArts.length > 0 && <FanArtSidebar fanArts={fanArts} />}
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   Main Export
   ================================================================ */

export const NewsSection = () => {
  const data = useNewsSectionData();

  return (
    <section id="news" className="relative bg-[#09090e] overflow-hidden">
      <Background />
      <div className="relative z-10">
        <MobileSection {...data} />
        <DesktopSection {...data} />
      </div>
    </section>
  );
};