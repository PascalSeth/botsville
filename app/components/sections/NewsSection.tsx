'use client';

import React from 'react';
import Image from 'next/image';
import { Shield, Tag, Star, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// ── Data ───────────────────────────────────────────────────
const NEWS_ITEMS = [
  {
    id: 1,
    category: 'PATCH NOTES',
    title: 'H4 FINALS BRACKET',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
    icon: <Shield size={11} />,
    tag1: 'ESPORTS',
    tag2: 'FINALS',
  },
  {
    id: 2,
    category: 'NEW EVENT',
    title: 'CELESTIAL REALM',
    subtitle: 'DIGITALLY REDEFINING DARKNESS AND POWER',
    image: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=800&q=80',
    featured: true,
    icon: <Star size={11} />,
    tag1: 'EVENT',
    tag2: 'SEASON 4',
  },
  {
    id: 3,
    category: 'NEW HERO',
    title: 'BAWL ADES!',
    image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=800&q=80',
    icon: <Tag size={11} />,
    tag1: 'HERO',
    tag2: 'UPDATE',
  },
];

const TOP_TEAM = {
  name: 'TOP STEAM GHANA',
  image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&q=80',
  score: 99,
  desc: 'DOMINATE RIVALS AND PROVE YOUR WORTHINESS THROUGHOUT THE WHOLE COMPETITION.',
};

const FAN_ARTS = [
  { id: 1, title: 'Season Illustrated' },
  { id: 2, title: 'Nalsion Realdr'     },
  { id: 3, title: 'Fastest Freelance'  },
];

// ── Shared: Section Header ─────────────────────────────────
const SectionHeader = ({ title, href }: { title: string; href?: string }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-white font-black text-sm tracking-[0.2em] uppercase border-l-2 border-[#e8a000] pl-3">
      {title}
    </h2>
    {href && (
      <a href={href} className="text-[#555] hover:text-[#e8a000] text-[10px] tracking-widest uppercase transition-colors">
        View All →
      </a>
    )}
  </div>
);

// ── Shared: Tags row ───────────────────────────────────────
const TagRow = ({ item }: { item: typeof NEWS_ITEMS[0] }) => (
  <div className="flex items-center justify-between mt-auto">
    <div className="flex items-center gap-1 text-[#666] text-[10px]">
      {item.icon}
      <span className="uppercase tracking-wide">Ghana</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="border border-[#333] text-[#666] text-[9px] uppercase tracking-wide px-1.5 py-0.5">{item.tag1}</span>
      <span className="border border-[#333] text-[#666] text-[9px] uppercase tracking-wide px-1.5 py-0.5">{item.tag2}</span>
    </div>
  </div>
);

// ── Desktop: News Card (3-col grid) ───────────────────────
const DesktopNewsCard = ({ item }: { item: typeof NEWS_ITEMS[0] }) => (
  <article className="group cursor-pointer flex flex-col gap-2">
    <div className="relative overflow-hidden aspect-[4/3] bg-[#111]">
      <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <span className="absolute top-2 left-2 bg-[#e8a000] text-black text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5">
        {item.category}
      </span>
      {item.featured && (
        <div className="absolute bottom-4 left-3 right-3">
          <p className="text-white font-black text-base leading-tight tracking-wide uppercase drop-shadow-lg">{item.title}</p>
          {item.subtitle && <p className="text-[#aaa] text-[9px] tracking-widest uppercase mt-0.5">{item.subtitle}</p>}
        </div>
      )}
    </div>
    {!item.featured && (
      <p className="text-white font-black text-sm tracking-wide uppercase leading-tight group-hover:text-[#e8a000] transition-colors">
        {item.title}
      </p>
    )}
    <TagRow item={item} />
  </article>
);

// ── Desktop: Community Corner ──────────────────────────────
const CommunityCorner = () => (
  <aside className="flex flex-col gap-5">
    <div className="relative overflow-hidden bg-[#111] border border-white/[0.06]">
      <div className="relative h-24 overflow-hidden">
        <Image src={TOP_TEAM.image} alt="Top Team" fill className="object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
      </div>
      <div className="px-3 pb-3 -mt-4 relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-white font-black text-xs tracking-[0.1em] uppercase leading-tight">{TOP_TEAM.name}</p>
            <p className="text-[#666] text-[9px] tracking-wide uppercase mt-1 leading-relaxed max-w-[160px]">{TOP_TEAM.desc}</p>
          </div>
          <div className="shrink-0 bg-[#e8a000] text-black font-black text-sm w-8 h-8 flex items-center justify-center">
            {TOP_TEAM.score}
          </div>
        </div>
      </div>
    </div>

    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-black text-xs tracking-[0.2em] uppercase">Fan Art Mgnnists</h3>
        <a href="#" className="text-[#e8a000] text-[9px] tracking-widest uppercase hover:text-white transition-colors">See all</a>
      </div>
      <div className="flex flex-col gap-0">
        {FAN_ARTS.map((art, i) => (
          <div key={art.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] group cursor-pointer hover:bg-white/[0.02] transition-colors px-1">
            <span className="text-[#e8a000] font-black text-[10px] w-3">{i + 1}</span>
            <ChevronRight size={10} className="text-[#444] group-hover:text-[#e8a000] transition-colors" />
            <span className="text-[#888] text-[11px] tracking-wide group-hover:text-white transition-colors">{art.title}</span>
          </div>
        ))}
      </div>
    </div>
  </aside>
);

// ── Mobile: Featured hero card (big, full-width) ───────────
const MobileFeaturedCard = ({ item }: { item: typeof NEWS_ITEMS[0] }) => (
  <motion.article
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="group cursor-pointer relative overflow-hidden aspect-[16/9] bg-[#111]"
  >
    <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

    {/* Category badge */}
    <span className="absolute top-3 left-3 bg-[#e8a000] text-black text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5">
      {item.category}
    </span>

    {/* Bottom text */}
    <div className="absolute bottom-0 left-0 right-0 p-4">
      <p className="text-white font-black text-xl leading-tight tracking-wide uppercase">{item.title}</p>
      {item.subtitle && <p className="text-[#888] text-[9px] tracking-widest uppercase mt-1">{item.subtitle}</p>}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="border border-[#555] text-[#888] text-[9px] uppercase tracking-wide px-1.5 py-0.5">{item.tag1}</span>
        <span className="border border-[#555] text-[#888] text-[9px] uppercase tracking-wide px-1.5 py-0.5">{item.tag2}</span>
      </div>
    </div>
  </motion.article>
);

// ── Mobile: Small horizontal card (image left, text right) ─
const MobileSmallCard = ({ item, index }: { item: typeof NEWS_ITEMS[0]; index: number }) => (
  <motion.article
    initial={{ opacity: 0, x: -16 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay: index * 0.08 }}
    className="group cursor-pointer flex items-stretch gap-3 border-b border-white/[0.05] pb-3"
  >
    {/* Thumb */}
    <div className="relative w-20 shrink-0 aspect-square overflow-hidden bg-[#111]">
      <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <span className="absolute bottom-1 left-1 bg-[#e8a000] text-black text-[7px] font-black tracking-widest uppercase px-1 py-px leading-none">
        {item.category}
      </span>
    </div>

    {/* Text */}
    <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0">
      <p className="text-white font-black text-sm tracking-wide uppercase leading-tight group-hover:text-[#e8a000] transition-colors line-clamp-2">
        {item.title}
      </p>
      <div className="flex items-center gap-1 text-[#555] text-[9px] mt-1">
        {item.icon}
        <span className="uppercase tracking-wide">Ghana</span>
        <span className="mx-1 text-[#2a2a2a]">·</span>
        <span className="uppercase tracking-wide text-[#444]">{item.tag1}</span>
      </div>
    </div>
    <ChevronRight size={12} className="text-[#2a2a2a] group-hover:text-[#e8a000] transition-colors shrink-0 self-center" />
  </motion.article>
);

// ── Mobile: Top team banner ────────────────────────────────
const MobileTopTeamBanner = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: 0.2 }}
    className="relative overflow-hidden border border-white/[0.06] bg-[#111] flex items-center gap-4 p-3"
  >
    {/* BG image */}
    <div className="absolute inset-0">
      <Image src={TOP_TEAM.image} alt="" fill className="object-cover opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#111]/95 via-[#111]/80 to-transparent" />
    </div>

    {/* Score badge */}
    <div className="relative z-10 bg-[#e8a000] text-black font-black text-lg w-12 h-12 flex items-center justify-center shrink-0">
      {TOP_TEAM.score}
    </div>

    {/* Text */}
    <div className="relative z-10 flex-1 min-w-0">
      <p className="text-[#e8a000]/70 text-[8px] tracking-[0.2em] uppercase font-black">Featured Team</p>
      <p className="text-white font-black text-sm tracking-wide uppercase leading-tight truncate">{TOP_TEAM.name}</p>
      <p className="text-[#555] text-[9px] tracking-wide uppercase mt-0.5 line-clamp-1">{TOP_TEAM.desc}</p>
    </div>
  </motion.div>
);

// ── Mobile: Fan art list ───────────────────────────────────
const MobileFanArtList = () => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-white font-black text-xs tracking-[0.2em] uppercase border-l-2 border-[#e8a000] pl-3">Fan Art</h3>
      <a href="#" className="text-[#e8a000] text-[9px] tracking-widest uppercase hover:text-white transition-colors">See all</a>
    </div>
    {FAN_ARTS.map((art, i) => (
      <motion.div
        key={art.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 + i * 0.07 }}
        className="flex items-center gap-3 py-3 border-b border-white/[0.05] group cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[#e8a000] font-black text-[10px] w-4 tabular-nums">{i + 1}</span>
        <ChevronRight size={10} className="text-[#333] group-hover:text-[#e8a000] transition-colors" />
        <span className="text-[#777] text-[11px] tracking-wide group-hover:text-white transition-colors flex-1">{art.title}</span>
        <span className="text-[#2a2a2a] text-[9px] uppercase tracking-widest">View</span>
      </motion.div>
    ))}
  </div>
);

// ── Mobile News Section ────────────────────────────────────
const MobileNewsSection = () => {
  const featured = NEWS_ITEMS.find(n => n.featured)!;
  const rest = NEWS_ITEMS.filter(n => !n.featured);

  return (
    <section id="news" className="lg:hidden py-6 bg-[#0d0d12]">
      <div className="px-4 sm:px-6">

        {/* ── Esports News ── */}
        <SectionHeader title="Esports News" href="#" />

        {/* Big featured card */}
        <div className="mb-4">
          <MobileFeaturedCard item={featured} />
        </div>

        {/* Remaining items as horizontal list cards */}
        <div className="flex flex-col gap-3 mb-6">
          {rest.map((item, i) => (
            <MobileSmallCard key={item.id} item={item} index={i} />
          ))}
        </div>

        {/* ── Community Corner ── */}
        <SectionHeader title="Community Corner" />
        <div className="flex flex-col gap-4">
          <MobileTopTeamBanner />
          <MobileFanArtList />
        </div>

      </div>
    </section>
  );
};

// ── Desktop News Section (unchanged) ──────────────────────
const DesktopNewsSection = () => (
  <section id="news" className="hidden lg:block py-10 bg-[#0d0d12]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div>
          <SectionHeader title="Esports News" href="#" />
          <div className="grid grid-cols-3 gap-4">
            {NEWS_ITEMS.map(item => <DesktopNewsCard key={item.id} item={item} />)}
          </div>
        </div>
        <div>
          <SectionHeader title="Community Corner" />
          <CommunityCorner />
        </div>
      </div>
    </div>
  </section>
);

// ── Main Export ────────────────────────────────────────────
export const NewsSection = () => (
  <>
    <MobileNewsSection />
    <DesktopNewsSection />
  </>
);