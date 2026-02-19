'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const LINKS = {
  Competition: ['Tournaments', 'Rules & Guidelines', 'Registration', 'Leaderboard'],
  Community:   ['Discord Server', 'Forums', 'Fan Art', 'Merchandise'],
  Platform:    ['About Us', 'News', 'Match Schedule', 'Contact'],
};

const SOCIALS = [
  { label: 'Facebook',  icon: <Facebook  size={14} />, href: '#' },
  { label: 'Twitter/X', icon: <Twitter   size={14} />, href: '#' },
  { label: 'Instagram', icon: <Instagram size={14} />, href: '#' },
  { label: 'YouTube',   icon: <Youtube   size={14} />, href: '#' },
];

export const Footer = () => {
  return (
    <footer className="bg-[#08080d] border-t border-white/[0.06]">

      {/* Top gold accent line */}
      <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000]/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 mb-12">

          {/* Brand col */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3 w-fit">
              <Image
                src="/mlbb_logobg.png"
                alt="Ghana Nagends"
                width={48}
                height={48}
                className="object-contain"
              />
              <div className="flex flex-col leading-none">
                <span className="font-['Rajdhani'] text-white font-bold text-lg tracking-[0.12em] uppercase">Ghana</span>
                <span className="font-['Rajdhani'] text-[#e8a000] font-semibold text-sm tracking-[0.2em] uppercase">Nagends</span>
              </div>
            </Link>

            <p className="text-[#444] text-[12px] leading-relaxed max-w-[220px]">
              The premier destination for Mobile Legends: Bang Bang esports in Ghana. Community driven, professionally organized.
            </p>

            {/* Socials */}
            <div className="flex items-center gap-2 mt-1">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-8 h-8 border border-white/[0.08] flex items-center justify-center text-[#555] hover:text-[#e8a000] hover:border-[#e8a000]/40 transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="text-white font-black text-[10px] tracking-[0.25em] uppercase mb-4 border-l-2 border-[#e8a000] pl-2">
                {heading}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-[#444] text-[12px] tracking-wide hover:text-[#e8a000] transition-colors duration-200 flex items-center gap-1.5 group"
                    >
                      <span className="w-1 h-px bg-[#333] group-hover:bg-[#e8a000] group-hover:w-2.5 transition-all duration-200" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[#333] text-[11px] tracking-wide">
            &copy; {new Date().getFullYear()} Ghana Nagends MLBB Community. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {['Privacy Policy', 'Terms of Use'].map((l) => (
              <a key={l} href="#" className="text-[#333] hover:text-[#e8a000] text-[11px] tracking-wide transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
};