'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function TeamLogo({ team, size = 36 }: { team?: { name: string; tag?: string; logo?: string | null } | null; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  const source = team?.logo?.trim();
  return <span aria-hidden="true" className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-[#202731] text-[10px] font-semibold text-[#b8c2d0]" style={{ width: size, height: size }}>
    {source && failed !== source ? <Image src={source} alt="" fill sizes={`${size}px`} className="object-contain p-1" unoptimized={/\.gif(?:[?#]|$)/i.test(source)} onError={() => setFailed(source)} /> : (team?.tag || team?.name || '?').slice(0, 2).toUpperCase()}
  </span>;
}
