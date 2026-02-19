'use client';

import React from 'react';
import Image from 'next/image';
import { Shield, Tag, Star, ChevronRight } from 'lucide-react';

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
  { id: 2, title: 'Nalsion Realdr' },
  { id: 3, title: 'Fastest Freelance' },
];

// ── News Card ──────────────────────────────────────────────
const NewsCard = ({ item }: { item: typeof NEWS_ITEMS[0] }) => (
  <article className="group cursor-pointer flex flex-col gap-2">
    {/* Image */}
    <div className="relative overflow-hidden aspect-[4/3] bg-[#111]">
      <Image
        src={item.image}
        alt={item.title}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-500"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

      {/* Category badge */}
      <span className="absolute top-2 left-2 bg-[#e8a000] text-black text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5">
        {item.category}
      </span>

      {/* Featured overlay text */}
      {item.featured && (
        <div className="absolute bottom-4 left-3 right-3">
          <p className="text-white font-black text-base leading-tight tracking-wide uppercase drop-shadow-lg">
            {item.title}
          </p>
          {item.subtitle && (
            <p className="text-[#aaa] text-[9px] tracking-widest uppercase mt-0.5">{item.subtitle}</p>
          )}
        </div>
      )}
    </div>

    {/* Text below */}
    {!item.featured && (
      <p className="text-white font-black text-sm tracking-wide uppercase leading-tight group-hover:text-[#e8a000] transition-colors">
        {item.title}
      </p>
    )}

    {/* Footer row */}
    <div className="flex items-center justify-between mt-auto">
      <div className="flex items-center gap-1 text-[#666] text-[10px]">
        {item.icon}
        <span className="uppercase tracking-wide">Ghana</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="border border-[#333] text-[#666] text-[9px] uppercase tracking-wide px-1.5 py-0.5">
          {item.tag1}
        </span>
        <span className="border border-[#333] text-[#666] text-[9px] uppercase tracking-wide px-1.5 py-0.5">
          {item.tag2}
        </span>
      </div>
    </div>
  </article>
);

// ── Community Corner ───────────────────────────────────────
const CommunityCorner = () => (
  <aside className="flex flex-col gap-5">
    {/* Top Team card */}
    <div className="relative overflow-hidden bg-[#111] border border-white/[0.06]">
      {/* Background image */}
      <div className="relative h-24 overflow-hidden">
        <Image
          src={TOP_TEAM.image}
          alt="Top Team"
          fill
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#111] to-transparent" />
      </div>

      {/* Content */}
      <div className="px-3 pb-3 -mt-4 relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-white font-black text-xs tracking-[0.1em] uppercase leading-tight">
              {TOP_TEAM.name}
            </p>
            <p className="text-[#666] text-[9px] tracking-wide uppercase mt-1 leading-relaxed max-w-[160px]">
              {TOP_TEAM.desc}
            </p>
          </div>
          <div className="shrink-0 bg-[#e8a000] text-black font-black text-sm w-8 h-8 flex items-center justify-center">
            {TOP_TEAM.score}
          </div>
        </div>
      </div>
    </div>

    {/* Fan Art section */}
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-black text-xs tracking-[0.2em] uppercase">Fan Art Mgnnists</h3>
        <a href="#" className="text-[#e8a000] text-[9px] tracking-widest uppercase hover:text-white transition-colors">
          See all
        </a>
      </div>

      <div className="flex flex-col gap-0">
        {FAN_ARTS.map((art, i) => (
          <div
            key={art.id}
            className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] group cursor-pointer hover:bg-white/[0.02] transition-colors px-1"
          >
            <span className="text-[#e8a000] font-black text-[10px] w-3">{i + 1}</span>
            <ChevronRight size={10} className="text-[#444] group-hover:text-[#e8a000] transition-colors" />
            <span className="text-[#888] text-[11px] tracking-wide group-hover:text-white transition-colors">
              {art.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  </aside>
);

// ── Section Header ─────────────────────────────────────────
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

// ── Main Export ────────────────────────────────────────────
export const NewsSection = () => {
  return (
    <section id="news" className="py-10 bg-[#0d0d12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">

          {/* Left — Esports News */}
          <div>
            <SectionHeader title="Esports News" href="#" />
            <div className="grid grid-cols-3 gap-4">
              {NEWS_ITEMS.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Right — Community Corner */}
          <div>
            <SectionHeader title="Community Corner" />
            <CommunityCorner />
          </div>

        </div>
      </div>
    </section>
  );
};