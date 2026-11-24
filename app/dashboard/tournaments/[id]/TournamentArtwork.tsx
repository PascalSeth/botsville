'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { ArrowUpRight, Expand, ImagePlus, Settings2, X } from 'lucide-react';
import styles from './tournament-detail.module.css';

export default function TournamentArtwork({ tournament }: { tournament: { id: string; name: string; banner: string | null; heroImage: string | null } }) {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const images = [{ label: 'Event banner', src: tournament.banner }, { label: 'Hero artwork', src: tournament.heroImage }].filter((item): item is { label: string; src: string } => Boolean(item.src && !failed.includes(item.src)));
  const current = images[Math.min(selected, images.length - 1)];
  if (!current) return <div className={styles.artworkEmpty}><ImagePlus size={30} /><span>Tournament artwork</span><Link href={`/dashboard/tournaments/${tournament.id}/edit`}>Add a banner or hero image <ArrowUpRight size={14} /></Link></div>;
  return <div className={styles.artworkPanel}>
    <Dialog.Root><Dialog.Trigger asChild><button className={styles.artwork} aria-label={`View full ${current.label.toLowerCase()}`}><Image src={current.src} alt="" fill sizes="(max-width: 700px) 100vw, 68vw" className={styles.artworkBackdrop} aria-hidden unoptimized={/\.gif(?:[?#]|$)/i.test(current.src)} /><Image key={current.src} src={current.src} alt={tournament.name + ' — ' + current.label} fill priority quality={90} sizes="(max-width: 700px) 100vw, 68vw" className={styles.artworkImage} unoptimized={/\.gif(?:[?#]|$)/i.test(current.src)} onError={() => setFailed(previous => [...previous, current.src])} /><span className={styles.expand}><Expand size={15} /> View full artwork</span></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.artworkModal}><div><Dialog.Title>{tournament.name}</Dialog.Title><Dialog.Close asChild><button className={styles.button} aria-label="Close artwork"><X size={20} /></button></Dialog.Close></div><Dialog.Description className={styles.srOnly}>Full tournament artwork, displayed without cropping.</Dialog.Description><Image src={current.src} alt={current.label} width={1800} height={1200} unoptimized /></Dialog.Content></Dialog.Portal></Dialog.Root>
    <div className={styles.artworkSwitch}>{images.map((item, index) => <button key={item.label} onClick={() => setSelected(index)} aria-pressed={current.src === item.src}>{item.label}</button>)}<Link href={`/dashboard/tournaments/${tournament.id}/edit`}><Settings2 size={13} /> Update artwork</Link></div>
  </div>;
}
