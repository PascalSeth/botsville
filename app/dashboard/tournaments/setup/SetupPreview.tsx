'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { ImagePlus, ArrowUpRight, Trophy } from 'lucide-react';
import TeamLogo from '../TeamLogo';
import styles from './setup.module.css';

type PreviewTeam = { id: string; name: string; tag: string; logo?: string | null };
export default function SetupPreview({ name, subtitle, banner, hero, format, teams, slots, matchesPerDay, bestOf, prize, estimatedMatches, onArtwork, onTeams }: {
  name: string; subtitle: string; banner: string | null; hero: string | null; format: string;
  teams: PreviewTeam[]; slots: number; matchesPerDay: number; bestOf: number; prize: string;
  estimatedMatches: number | null; onArtwork: () => void; onTeams: () => void;
}) {
  const [selected, setSelected] = useState<'banner' | 'hero'>('banner');
  const [failed, setFailed] = useState<string[]>([]);
  const source = (selected === 'banner' ? banner : hero) || banner || hero;
  const visible = source && !failed.includes(source);
  return <section className={styles.preview} aria-label="Live tournament preview">
    <div className={styles.artwork}>
      {visible ? <><img src={source} alt="" className={styles.artworkBlur} /><img src={source} alt={name + ' artwork preview'} className={styles.artworkImage} onError={() => setFailed(previous => [...previous, source])} /></> : <div className={styles.artworkPlaceholder}><ImagePlus size={34} strokeWidth={1.3} /><strong>Your event starts here.</strong><span>Add tournament artwork to set the scene.</span></div>}
      <div className={styles.artworkActions}>{banner && hero && <div><button type="button" aria-pressed={selected === 'banner'} onClick={() => setSelected('banner')}>Banner</button><button type="button" aria-pressed={selected === 'hero'} onClick={() => setSelected('hero')}>Hero</button></div>}<button type="button" onClick={onArtwork}>{visible ? 'Edit artwork' : 'Add artwork'}<ArrowUpRight size={14} /></button></div>
    </div>
    <div className={styles.previewInfo}><span className={styles.eyebrow}>Live preview / {format}</span><h2>{name.trim() || 'Your next tournament'}</h2>{subtitle && <p>{subtitle}</p>}{prize && <div className={styles.previewPrize}><Trophy size={13} />{prize}</div>}<div className={styles.previewStats}><div><strong>{teams.length || slots || '—'}</strong><span>{teams.length ? 'Selected teams' : 'Team capacity'}</span></div><div><strong>{matchesPerDay || '—'}</strong><span>Matches / day</span></div><div><strong>BO{bestOf}</strong><span>Each match</span></div></div>{estimatedMatches !== null && <p className={styles.estimate}>{estimatedMatches} group matches · {Math.ceil(estimatedMatches / Math.max(1, matchesPerDay))} play days{teams.length ? '' : ' at full capacity'}</p>}<button type="button" className={styles.previewTeams} onClick={onTeams}><span>{teams.length ? teams.slice(0, 6).map(team => <TeamLogo team={team} size={33} key={team.id} />) : <span className={styles.openEntries}>Choose your teams or open registration</span>}{teams.length > 6 && <small>+{teams.length - 6}</small>}</span><ArrowUpRight size={15} /></button></div>
  </section>;
}
