'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Shield, Tag, Star, ChevronRight, Newspaper, Palette, Trophy, Clock, Flame } from 'lucide-react';
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
      } catch {
        /* graceful — sections show empty states */
      } finally {
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

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PATCH_NOTES: { label: 'Patch Notes', icon: <Shield size={11} />, color: 'bg-blue-500/80' },
  NEW_EVENT:   { label: 'New Event',   icon: <Star size={11} />,   color: 'bg-[#e8a000]' },
  NEW_HERO:    { label: 'New Hero',    icon: <Tag size={11} />,    color: 'bg-emerald-500/80' },
};

function categoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? { label: cat.replace(/_/g, ' '), icon: <Newspaper size={11} />, color: 'bg-white/20' };
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

/* ================================================================
   Animated Background  (grid + orbs + particles + accent lines)
   ================================================================ */

const AnimatedBackground = () => (
  <>
    {/* Grid overlay */}
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    />

    {/* Orbs */}
    <motion.div
      className="pointer-events-none absolute -top-40 -left-40 w-125 h-125 rounded-full bg-[#e8a000]/6 blur-[120px]"
      animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.08, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="pointer-events-none absolute -bottom-32 -right-32 w-105 h-105 rounded-full bg-blue-600/5 blur-[100px]"
      animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.06, 1] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
    />
    <motion.div
      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-90 h-90 rounded-full bg-purple-600/4 blur-[90px]"
      animate={{ opacity: [0.2, 0.4, 0.2] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
    />

    {/* Particles */}
    {Array.from({ length: 10 }).map((_, i) => (
      <motion.div
        key={i}
        className="pointer-events-none absolute w-px h-px bg-white/20 rounded-full"
        style={{ left: (8 + i * 9) + '%', top: (5 + ((i * 17) % 80)) + '%' }}
        animate={{ opacity: [0, 0.6, 0], y: [0, -30, 0] }}
        transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.6, ease: 'easeInOut' }}
      />
    ))}

    {/* Top accent line */}
    <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
      <motion.div
        className="absolute top-0 h-px w-32 bg-linear-to-r from-transparent via-[#e8a000]/40 to-transparent"
        animate={{ left: ['-10%', '110%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
    </div>
    {/* Bottom accent line */}
    <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
      <motion.div
        className="absolute bottom-0 h-px w-24 bg-linear-to-r from-transparent via-blue-400/30 to-transparent"
        animate={{ left: ['110%', '-10%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear', delay: 3 }}
      />
    </div>
  </>
);

/* ================================================================
   Skeleton loaders
   ================================================================ */

const pulse = 'animate-pulse bg-white/5 rounded';

const NewsCardSkeleton = () => (
  <div className="flex flex-col gap-2">
    <div className={'aspect-4/3 ' + pulse} />
    <div className={'h-4 w-3/4 ' + pulse} />
    <div className={'h-3 w-1/2 ' + pulse} />
  </div>
);

const FeaturedSkeleton = () => (
  <div className={'aspect-video ' + pulse} />
);

const SmallCardSkeleton = () => (
  <div className="flex gap-3 pb-3 border-b border-white/5">
    <div className={'w-20 aspect-square shrink-0 ' + pulse} />
    <div className="flex flex-col gap-2 flex-1 py-1">
      <div className={'h-4 w-3/4 ' + pulse} />
      <div className={'h-3 w-1/2 ' + pulse} />
    </div>
  </div>
);

const SidebarSkeleton = () => (
  <div className="flex flex-col gap-5">
    <div className={'h-32 ' + pulse} />
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map(i => <div key={i} className={'h-8 ' + pulse} />)}
    </div>
  </div>
);

/* ================================================================
   Section Header
   ================================================================ */

const SectionHeader = ({ title, href }: { title: string; href?: string }) => (
  <div className="flex items-center justify-between mb-5">
    <h2 className="text-white font-bold text-sm tracking-[0.15em] uppercase border-l-2 border-[#e8a000] pl-3 flex items-center gap-2">
      <Newspaper size={14} className="text-[#e8a000]" />
      {title}
    </h2>
    {href && (
      <Link
        href={href}
        className="text-zinc-500 hover:text-[#e8a000] text-[11px] tracking-widest uppercase transition-colors flex items-center gap-1"
      >
        View All <ChevronRight size={12} />
      </Link>
    )}
  </div>
);

/* ================================================================
   Desktop: News Card
   ================================================================ */

const DesktopNewsCard = ({ article, featured }: { article: NewsArticle; featured?: boolean }) => {
  const meta = categoryMeta(article.category);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={'group cursor-pointer flex flex-col gap-2.5 rounded-xl overflow-hidden bg-white/2 border border-white/6 hover:border-white/10 transition-all duration-300 ' + (featured ? 'col-span-2 row-span-2' : '')}
    >
      <div className={'relative overflow-hidden bg-[#111] ' + (featured ? 'aspect-16/10' : 'aspect-4/3')}>
        {article.image ? (
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/10">
            <Newspaper size={48} />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

        {/* Category pill */}
        <span className={'absolute top-3 left-3 text-white text-[9px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm ' + meta.color}>
          {meta.icon} {meta.label}
        </span>

        {/* Reaction count */}
        {article._count.reactions > 0 && (
          <span className="absolute top-3 right-3 text-white/60 text-[10px] flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
            <Flame size={10} /> {article._count.reactions}
          </span>
        )}

        {/* Bottom overlay text for featured */}
        {featured && (
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-white font-bold text-xl leading-tight tracking-wide uppercase drop-shadow-lg">
              {article.title}
            </p>
            {article.subtitle && (
              <p className="text-white/50 text-xs tracking-wide mt-1">{article.subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Text below image for non-featured */}
      {!featured && (
        <div className="px-3 pb-3 flex flex-col gap-1.5 flex-1">
          <p className="text-white font-bold text-[13px] tracking-wide uppercase leading-tight group-hover:text-[#e8a000] transition-colors line-clamp-2">
            {article.title}
          </p>
          {article.subtitle && (
            <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-2">{article.subtitle}</p>
          )}
          <div className="flex items-center gap-2 mt-auto pt-1">
            <span className="text-zinc-600 text-[10px] flex items-center gap-1">
              <Clock size={10} /> {timeAgo(article.publishedAt ?? article.createdAt)}
            </span>
            {article.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-zinc-600 text-[9px] uppercase tracking-wide border border-white/8 rounded-full px-1.5 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.article>
  );
};

/* ================================================================
   Desktop: Community Corner (sidebar)
   ================================================================ */

const CommunityCorner = ({ topTeam, fanArts }: { topTeam: TopTeamData | null; fanArts: FanArtwork[] }) => (
  <aside className="flex flex-col gap-5">
    {/* Top team card */}
    {topTeam && (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-xl bg-white/2 border border-white/6"
      >
        <div className="relative h-20 overflow-hidden">
          {topTeam.logo ? (
            <Image src={topTeam.logo} alt={topTeam.name} fill className="object-cover opacity-30 blur-sm" />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-[#e8a000]/10 to-transparent" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0f] to-transparent" />
        </div>

        <div className="px-3 pb-3 -mt-6 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#e8a000]/10 border border-[#e8a000]/20 flex items-center justify-center shrink-0 overflow-hidden">
              {topTeam.logo ? (
                <Image src={topTeam.logo} alt={topTeam.name} width={32} height={32} className="object-contain" />
              ) : (
                <Trophy size={18} className="text-[#e8a000]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-xs tracking-wide uppercase truncate">{topTeam.name}</p>
              <p className="text-zinc-500 text-[10px] tracking-wide">[{topTeam.tag}]</p>
            </div>
          </div>

          {topTeam.standings?.[0] && (
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {[
                { label: 'Rank', value: '#' + topTeam.standings[0].rank },
                { label: 'W/L', value: topTeam.standings[0].wins + '/' + topTeam.standings[0].losses },
                { label: 'Pts', value: String(topTeam.standings[0].points) },
              ].map(s => (
                <div key={s.label} className="text-center py-1.5 rounded-lg bg-white/3 border border-white/5">
                  <p className="text-[#e8a000] font-bold text-xs">{s.value}</p>
                  <p className="text-zinc-600 text-[8px] uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    )}

    {/* Fan art list */}
    {fanArts.length > 0 && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-xs tracking-[0.15em] uppercase flex items-center gap-1.5">
            <Palette size={12} className="text-[#e8a000]" /> Fan Art
          </h3>
          <Link href="/fan-art" className="text-[#e8a000] text-[10px] tracking-widest uppercase hover:text-white transition-colors">
            See all
          </Link>
        </div>
        <div className="flex flex-col">
          {fanArts.map((art, i) => (
            <motion.div
              key={art.id}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 py-2.5 border-b border-white/5 group cursor-pointer hover:bg-white/2 transition-colors px-1 rounded-md"
            >
              <div className="w-8 h-8 rounded-md overflow-hidden bg-white/5 shrink-0 relative">
                <Image src={art.imageUrl} alt={art.title} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-400 text-[11px] tracking-wide group-hover:text-white transition-colors truncate">{art.title}</p>
                <p className="text-zinc-600 text-[9px]">by {art.artist?.ign ?? 'Anonymous'}</p>
              </div>
              <ChevronRight size={10} className="text-zinc-700 group-hover:text-[#e8a000] transition-colors shrink-0" />
            </motion.div>
          ))}
        </div>
      </div>
    )}
  </aside>
);

/* ================================================================
   Mobile: Featured hero card
   ================================================================ */

const MobileFeaturedCard = ({ article }: { article: NewsArticle }) => {
  const meta = categoryMeta(article.category);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="group cursor-pointer relative overflow-hidden aspect-video rounded-xl bg-[#111]"
    >
      {article.image ? (
        <Image src={article.image} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/10">
          <Newspaper size={48} />
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />

      <span className={'absolute top-3 left-3 text-white text-[9px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm ' + meta.color}>
        {meta.icon} {meta.label}
      </span>

      {article._count.reactions > 0 && (
        <span className="absolute top-3 right-3 text-white/60 text-[10px] flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
          <Flame size={10} /> {article._count.reactions}
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-bold text-lg leading-tight tracking-wide uppercase">{article.title}</p>
        {article.subtitle && <p className="text-white/50 text-[10px] tracking-widest uppercase mt-1">{article.subtitle}</p>}
        <div className="flex items-center gap-1.5 mt-2">
          {article.tags.slice(0, 2).map(tag => (
            <span key={tag} className="border border-white/15 text-white/50 text-[9px] uppercase tracking-wide rounded-full px-2 py-0.5">
              {tag}
            </span>
          ))}
          <span className="text-zinc-500 text-[10px] ml-auto flex items-center gap-1">
            <Clock size={9} /> {timeAgo(article.publishedAt ?? article.createdAt)}
          </span>
        </div>
      </div>
    </motion.article>
  );
};

/* ================================================================
   Mobile: Small horizontal card
   ================================================================ */

const MobileSmallCard = ({ article, index }: { article: NewsArticle; index: number }) => {
  const meta = categoryMeta(article.category);

  return (
    <motion.article
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group cursor-pointer flex items-stretch gap-3 border-b border-white/5 pb-3"
    >
      <div className="relative w-20 shrink-0 aspect-square overflow-hidden rounded-lg bg-[#111]">
        {article.image ? (
          <Image src={article.image} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/10">
            <Newspaper size={20} />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        <span className={'absolute bottom-1 left-1 text-white text-[7px] font-bold tracking-widest uppercase px-1.5 py-px rounded-full leading-none ' + meta.color}>
          {meta.label}
        </span>
      </div>

      <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0">
        <p className="text-white font-bold text-sm tracking-wide uppercase leading-tight group-hover:text-[#e8a000] transition-colors line-clamp-2">
          {article.title}
        </p>
        <div className="flex items-center gap-2 text-zinc-600 text-[9px] mt-1">
          <span className="flex items-center gap-1">
            <Clock size={9} /> {timeAgo(article.publishedAt ?? article.createdAt)}
          </span>
          {article.tags[0] && (
            <>
              <span className="text-zinc-800">·</span>
              <span className="uppercase tracking-wide">{article.tags[0]}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight size={12} className="text-zinc-800 group-hover:text-[#e8a000] transition-colors shrink-0 self-center" />
    </motion.article>
  );
};

/* ================================================================
   Mobile: Top team banner
   ================================================================ */

const MobileTopTeamBanner = ({ topTeam }: { topTeam: TopTeamData }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.2 }}
    className="relative overflow-hidden rounded-xl border border-white/6 bg-white/2 flex items-center gap-3 p-3"
  >
    <div className="absolute inset-0">
      {topTeam.logo && <Image src={topTeam.logo} alt="" fill className="object-cover opacity-10 blur-sm" />}
      <div className="absolute inset-0 bg-linear-to-r from-[#0a0a0f]/95 via-[#0a0a0f]/80 to-transparent" />
    </div>

    <div className="relative z-10 w-11 h-11 rounded-lg bg-[#e8a000]/10 border border-[#e8a000]/20 flex items-center justify-center shrink-0 overflow-hidden">
      {topTeam.logo ? (
        <Image src={topTeam.logo} alt={topTeam.name} width={36} height={36} className="object-contain" />
      ) : (
        <Trophy size={20} className="text-[#e8a000]" />
      )}
    </div>

    <div className="relative z-10 flex-1 min-w-0">
      <p className="text-[#e8a000]/70 text-[8px] tracking-[0.2em] uppercase font-bold">#1 Team</p>
      <p className="text-white font-bold text-sm tracking-wide uppercase leading-tight truncate">{topTeam.name}</p>
      {topTeam.standings?.[0] && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-zinc-500 text-[10px]">{topTeam.standings[0].wins}W {topTeam.standings[0].losses}L</span>
          <span className="text-zinc-700">·</span>
          <span className="text-[#e8a000] text-[10px] font-bold">{topTeam.standings[0].points} pts</span>
        </div>
      )}
    </div>
  </motion.div>
);

/* ================================================================
   Mobile: Fan art list
   ================================================================ */

const MobileFanArtList = ({ fanArts }: { fanArts: FanArtwork[] }) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-white font-bold text-xs tracking-[0.15em] uppercase border-l-2 border-[#e8a000] pl-3 flex items-center gap-1.5">
        <Palette size={12} className="text-[#e8a000]" /> Fan Art
      </h3>
      <Link href="/fan-art" className="text-[#e8a000] text-[10px] tracking-widest uppercase hover:text-white transition-colors">
        See all
      </Link>
    </div>
    {fanArts.map((art, i) => (
      <motion.div
        key={art.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 + i * 0.07 }}
        className="flex items-center gap-3 py-3 border-b border-white/5 group cursor-pointer hover:bg-white/2 transition-colors rounded-md"
      >
        <div className="w-9 h-9 rounded-md overflow-hidden bg-white/5 shrink-0 relative">
          <Image src={art.imageUrl} alt={art.title} fill className="object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-zinc-400 text-[11px] tracking-wide group-hover:text-white transition-colors truncate">{art.title}</p>
          <p className="text-zinc-600 text-[9px]">by {art.artist?.ign ?? 'Anonymous'}</p>
        </div>
        <ChevronRight size={10} className="text-zinc-700 group-hover:text-[#e8a000] transition-colors shrink-0" />
      </motion.div>
    ))}
  </div>
);

/* ================================================================
   Empty State
   ================================================================ */

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Newspaper size={32} className="text-zinc-700 mb-3" />
    <p className="text-zinc-600 text-sm">No {label} yet</p>
    <p className="text-zinc-700 text-xs mt-1">Check back soon!</p>
  </div>
);

/* ================================================================
   Mobile News Section
   ================================================================ */

const MobileNewsSection = ({ news, fanArts, topTeam, loading }: ReturnType<typeof useNewsSectionData>) => {
  const featured = useMemo(() => news.find(n => n.featured) ?? news[0] ?? null, [news]);
  const rest = useMemo(() => news.filter(n => n !== featured), [news, featured]);

  return (
    <div className="lg:hidden py-6">
      <div className="px-4 sm:px-6">
        <SectionHeader title="Esports News" href="/news" />

        {loading ? (
          <div className="flex flex-col gap-4">
            <FeaturedSkeleton />
            {[1, 2].map(i => <SmallCardSkeleton key={i} />)}
          </div>
        ) : news.length === 0 ? (
          <EmptyState label="news" />
        ) : (
          <>
            {featured && (
              <div className="mb-4">
                <MobileFeaturedCard article={featured} />
              </div>
            )}
            <div className="flex flex-col gap-3 mb-6">
              {rest.map((a, i) => <MobileSmallCard key={a.id} article={a} index={i} />)}
            </div>
          </>
        )}

        {/* Community Corner */}
        <SectionHeader title="Community Corner" />
        <div className="flex flex-col gap-4">
          {loading ? (
            <SidebarSkeleton />
          ) : (
            <>
              {topTeam && <MobileTopTeamBanner topTeam={topTeam} />}
              {fanArts.length > 0 && <MobileFanArtList fanArts={fanArts} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   Desktop News Section
   ================================================================ */

const DesktopNewsSection = ({ news, fanArts, topTeam, loading }: ReturnType<typeof useNewsSectionData>) => {
  const featured = useMemo(() => news.find(n => n.featured) ?? null, [news]);
  const nonFeatured = useMemo(() => news.filter(n => n !== featured), [news, featured]);

  return (
    <div className="hidden lg:block py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_280px] gap-8">
          {/* News grid */}
          <div>
            <SectionHeader title="Esports News" href="/news" />
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <NewsCardSkeleton key={i} />)}
              </div>
            ) : news.length === 0 ? (
              <EmptyState label="news" />
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {featured && <DesktopNewsCard article={featured} featured />}
                {nonFeatured.slice(0, featured ? 4 : 6).map(a => (
                  <DesktopNewsCard key={a.id} article={a} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <SectionHeader title="Community Corner" />
            {loading ? <SidebarSkeleton /> : <CommunityCorner topTeam={topTeam} fanArts={fanArts} />}
          </div>
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
    <section id="news" className="relative bg-[#0a0a0f] overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10">
        <MobileNewsSection {...data} />
        <DesktopNewsSection {...data} />
      </div>
    </section>
  );
};
