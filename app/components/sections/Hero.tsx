'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowUpRight, ArrowRight, Check, Heart, Pause, Play, X } from 'lucide-react';
import { useHero } from '../../contexts/HeroContext';
import { getThumbnailUrl, getHeroImageUrl } from '@/lib/image-utils';

type HeroCatalogItem = { id: string; key: string; name: string; imageUrl: string };
type HeroPanelStats = { season: string; teams: string; players: string; prize: string };

function SafeHeroImage({ src, alt, sizes, priority = false, className }: {
  src: string; alt: string; sizes: string; priority?: boolean; className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isFailed = !src || failedSrc === src;

  return (
    <Image
      key={src}
      src={isFailed ? '/stunchou.png' : src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}

function LoginRequiredModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} onCancel={onClose} onClose={onClose}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    className="arena-login">
    <div className="arena-login-inner">
      <button type="button" autoFocus aria-label="Close login dialog" onClick={onClose} className="arena-close"><X size={20} /></button>
      <span className="arena-eyebrow">YOUR NEXT CHAPTER</span>
      <h2>Bring your team.</h2>
      <p>Log in to register your team and enter the arena.</p>
      <Link href="/login?callbackUrl=/register-team" onClick={onClose} className="arena-primary">Log in to continue <ArrowUpRight size={18} /></Link>
    </div>
  </dialog>;
}

type ArenaProps = {
  heroImage: string; heroName: string; heroes: HeroCatalogItem[];
  activeKey: string | null; selectedKey: string | null;
  onSelect: (hero: HeroCatalogItem) => void; onSave: (hero: HeroCatalogItem) => void;
  saving: boolean; stats: HeroPanelStats; hasTeam: boolean;
  onRegister: (e: MouseEvent<HTMLAnchorElement>) => void;
  auto: boolean; onToggleAuto: () => void; reducedMotion: boolean;
  loading: boolean; saveError: string;
};

function ArenaHero(p: ArenaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (p.reducedMotion) {
      video.pause();
    } else {
      void video.play().catch(() => { });
    }
  }, [p.reducedMotion]);

  const selected = p.heroes.find(h => h.key === p.activeKey);
  const favorite = !!p.activeKey && p.activeKey === p.selectedKey;
  const index = Math.max(0, p.heroes.findIndex(h => h.key === p.activeKey));

  return (
    <section className="bv-arena" aria-label="Botsville Mobile Legends arena">
      <style>{arenaStyles}</style>

      {/* Cinematic Background Video */}
      <div className="arena-video-background" aria-hidden="true">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
        >
          <source src="/vid/hero.mp4" type="video/mp4" />
        </video>
        <div className="arena-video-shade" />
      </div>

      <div className="arena-shell">
        {/* Hero Stage Content (Scaled, Balanced Proportions) */}
        <div className="arena-stage">
          {/* Left Column: Headline, Narrative & CTA */}
          <div className="arena-copy">
            <div className="arena-kicker">
              <span className="arena-square" />
              <span>BOTSVILLE GHANA</span>
              <span className="arena-kicker-dot">•</span>
              <span>{p.stats.season}</span>
              <span className="arena-short-line" />
            </div>

            <h1>MAKE<br />YOUR <em>MARK.</em></h1>

            <p className="arena-description">
              Your squad. Your moment.<br />Take your place in Ghana&apos;s next great rivalry.
            </p>

            <div className="arena-actions">
              <Link
                href={p.hasTeam ? '/my-team' : '/register-team'}
                onClick={p.hasTeam ? undefined : p.onRegister}
                className="arena-primary"
              >
                <span>{p.hasTeam ? 'My team' : 'Enter the arena'}</span>
                <ArrowUpRight size={15} />
              </Link>
              <Link href="/tournaments" className="arena-secondary">
                <span>Explore tournaments</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="arena-proof">
              <div>
                <strong>{p.stats.teams}</strong>
                <span>Teams ranked</span>
              </div>
              <div>
                <strong>{p.stats.players}</strong>
                <span>Players listed</span>
              </div>
              <div className="arena-proof-note">
                <span className="arena-square" />
                <span>Built for the game.<br />Rooted in Ghana.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Spotlight Graphic */}
          <div className="arena-art">
            <div className="arena-gold-panel" aria-hidden="true">
              <span>GH</span>
            </div>
            <div className="arena-orbit" aria-hidden="true" />
            <span className="arena-art-note" aria-hidden="true">CHOOSE YOUR HERO. OWN YOUR STORY.</span>
            <span className="arena-character-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                className="arena-character"
                key={p.heroImage}
                initial={{ opacity: 0, x: p.reducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: p.reducedMotion ? 0 : -14 }}
                transition={{ duration: p.reducedMotion ? 0 : 0.25 }}
              >
                <SafeHeroImage
                  src={p.heroImage}
                  alt={p.heroName}
                  sizes="(max-width: 760px) 90vw, 45vw"
                  priority
                  className="arena-character-image"
                />
              </motion.div>
            </AnimatePresence>

            <div className="arena-character-caption">
              <div>
                <span className="arena-eyebrow">IN THE SPOTLIGHT</span>
                <h2>{p.heroName}</h2>
              </div>
              <button
                type="button"
                className={`arena-favorite ${favorite ? 'is-favorite' : ''}`}
                disabled={!selected || p.saving || favorite}
                aria-label={favorite ? `${p.heroName} is your favorite` : `Save ${p.heroName} as your favorite`}
                onClick={() => selected && p.onSave(selected)}
              >
                {favorite ? <Check size={14} /> : <Heart size={14} />}
                <span>{p.saving ? 'Saving…' : favorite ? 'Your hero' : 'Make it yours'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Compact Hero Roster Selector Strip */}
        <div className="arena-roster">
          <div className="arena-roster-heading">
            <span className="arena-eyebrow">PICK YOUR MAIN</span>
            <p>A hero for every playstyle.</p>
            {!p.reducedMotion && p.heroes.length > 1 && (
              <button
                type="button"
                className="arena-autoplay"
                onClick={p.onToggleAuto}
                aria-pressed={p.auto}
              >
                {p.auto ? <Pause size={11} /> : <Play size={11} />}
                <span>{p.auto ? 'Pause showcase' : 'Auto showcase'}</span>
              </button>
            )}
          </div>

          <div className="arena-hero-list" role="group" aria-label="Choose a hero">
            {p.heroes.map((hero, i) => (
              <button
                type="button"
                key={hero.id}
                aria-pressed={hero.key === p.activeKey}
                className={`arena-hero-option ${hero.key === p.activeKey ? 'is-active' : ''}`}
                onClick={() => p.onSelect(hero)}
              >
                <span className="arena-option-image">
                  <SafeHeroImage src={getThumbnailUrl(hero.imageUrl)} alt="" sizes="48px" />
                </span>
                <span className="arena-option-copy">
                  <span className="arena-option-number">
                    {String(i + 1).padStart(2, '0')}
                    {hero.key === p.selectedKey && <Heart size={9} fill="currentColor" />}
                  </span>
                  <strong>{hero.name}</strong>
                </span>
              </button>
            ))}
            {!p.heroes.length && (
              <p className="arena-empty">
                {p.loading ? 'Loading hero roster…' : 'Explore tournaments while heroes load.'}
              </p>
            )}
          </div>
        </div>

        {p.saveError && <p className="arena-error" role="alert">{p.saveError}</p>}

        {/* Footer Sub-Bar */}
        <div className="arena-footer">
          <span>FIND YOUR TEAM. BUILD YOUR LEGACY.</span>
          <Link href="/tournaments">
            <span>The competition starts here</span>
            <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>
    </section>
  );
}

const arenaStyles = `
.bv-arena {
  --arena-gold: #eab64b;
  --arena-ink: #0a0b0f;
  position: relative;
  isolation: isolate;
  background: var(--arena-ink);
  color: #f3f1e9;
  overflow: hidden;
  font-family: Arial, Helvetica, sans-serif;
  padding: 68px 0 0;
}
.bv-arena *, .arena-login * { box-sizing: border-box; }
.bv-arena a, .arena-login a { text-decoration: none; }
.bv-arena button, .arena-login button { font: inherit; cursor: pointer; }
.bv-arena button:disabled { cursor: default; opacity: .6; }
.bv-arena a:focus-visible, .bv-arena button:focus-visible, .arena-login a:focus-visible, .arena-login button:focus-visible {
  outline: 2px solid #f7d984;
  outline-offset: 4px;
}

/* ── Cinematic Video Background ────────────────────────────── */
.arena-video-background {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: #090a0e;
  overflow: hidden;
}
.arena-video-background video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.76;
  filter: brightness(0.88) contrast(1.08) saturate(1.1);
}
.arena-video-shade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 65% 42%, rgba(10,12,16,0.18) 0%, rgba(10,12,16,0.65) 60%, #090a0e 100%),
    linear-gradient(90deg, rgba(9,10,14,0.92) 0%, rgba(9,10,14,0.68) 45%, rgba(9,10,14,0.35) 100%),
    linear-gradient(0deg, #090a0e 0%, transparent 40%, rgba(9,10,14,0.45) 100%);
}

.arena-shell {
  width: min(1180px, 100%);
  margin: auto;
  padding: 0 4%;
}

.arena-eyebrow {
  font-size: 9px;
  letter-spacing: 1.6px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cfcecb;
}
.arena-square {
  display: inline-block;
  width: 5px;
  height: 5px;
  background: var(--arena-gold, #eab64b);
  flex-shrink: 0;
}

/* ── Main Stage Grid (Tightened, Balanced) ─────────────────── */
.arena-stage {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  position: relative;
  min-height: 380px;
  align-items: center;
}
.arena-copy {
  position: relative;
  z-index: 3;
  padding: 24px 0 20px;
  pointer-events: none;
}
.arena-copy a, .arena-copy button { pointer-events: auto; }
.arena-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 1.6px;
  color: #cfcecb;
  text-transform: uppercase;
}
.arena-kicker-dot {
  color: #eab64b;
  opacity: 0.8;
}
.arena-short-line {
  height: 1px;
  width: 28px;
  background: #eab64b;
}
.arena-copy h1 {
  font-size: clamp(30px, 3.7vw, 48px);
  line-height: 0.98;
  letter-spacing: -0.04em;
  font-weight: 900;
  margin: 14px 0 12px;
}
.arena-copy h1 em {
  color: #eab64b;
  font-style: normal;
}
.arena-description {
  font-size: 11.5px;
  line-height: 1.65;
  color: #9d9e97;
  margin: 0;
  max-width: 320px;
}
.arena-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}
.arena-primary {
  background: #eab64b;
  color: #12100a;
  display: inline-flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 15px;
  font-weight: 800;
  font-size: 10.5px;
  letter-spacing: 0.5px;
  min-height: 36px;
  border-radius: 8px;
  border: 1px solid #eab64b;
  box-shadow: 0 4px 14px rgba(234,182,75,0.22);
  transition: all .2s;
}
.arena-primary:hover {
  background: #f5cd79;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(234,182,75,0.32);
}
.arena-secondary {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  color: #e3e2dc;
  font-size: 10.5px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  transition: all .2s;
}
.arena-secondary:hover {
  color: #eab64b;
  background: rgba(255,255,255,0.07);
  border-color: rgba(234,182,75,0.28);
}
.arena-proof {
  display: flex;
  gap: 18px;
  margin-top: 22px;
  align-items: center;
}
.arena-proof > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.arena-proof strong {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: -0.5px;
  color: #f7f6f0;
}
.arena-proof span {
  font-size: 9px;
  color: #82837e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.arena-proof .arena-proof-note {
  flex-direction: row;
  align-items: center;
  border-left: 1px solid rgba(255,255,255,0.12);
  padding-left: 18px;
  gap: 9px;
  line-height: 1.5;
}

/* ── Hero Spotlight Art (Clean Scale) ───────────────────────── */
.arena-art {
  position: relative;
  min-width: 0;
  height: 100%;
  min-height: 350px;
}
.arena-gold-panel {
  position: absolute;
  inset: 16px -8% 20px 10%;
  background: linear-gradient(145deg, rgba(234,182,75,0.12), rgba(234,182,75,0.02));
  clip-path: polygon(20% 0, 100% 0, 100% 100%, 0 100%);
  overflow: hidden;
}
.arena-gold-panel:after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(120deg, transparent 0 45px, rgba(27,27,27,0.06) 45px 46px);
}
.arena-gold-panel > span {
  position: absolute;
  right: -6%;
  top: 10%;
  font-size: clamp(140px, 16vw, 220px);
  font-weight: 900;
  letter-spacing: -0.08em;
  color: rgba(243,222,181,0.05);
  line-height: 1;
}
.arena-orbit {
  position: absolute;
  width: 68%;
  aspect-ratio: 1;
  border: 1px solid rgba(234,182,75,0.16);
  border-radius: 50%;
  top: 15%;
  left: 16%;
}
.arena-character {
  position: absolute;
  inset: -6px -6% 0 -6%;
  z-index: 2;
}
.arena-character-image {
  object-fit: contain;
  object-position: center bottom;
  filter: drop-shadow(0 14px 16px rgba(0,0,0,0.55));
}
.arena-art:after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: -10%;
  height: 110px;
  z-index: 2;
  background: linear-gradient(transparent, #0a0b0f 92%);
  pointer-events: none;
}
.arena-art-note {
  position: absolute;
  right: -4%;
  top: 36px;
  z-index: 1;
  writing-mode: vertical-rl;
  font-size: 7.5px;
  letter-spacing: 1.8px;
  color: #b0a790;
}
.arena-character-index {
  position: absolute;
  top: 36px;
  left: 30%;
  font-size: 10.5px;
  color: #b0a790;
  letter-spacing: 1.5px;
  font-family: monospace;
}
.arena-character-caption {
  position: absolute;
  bottom: 24px;
  left: 18%;
  right: 0;
  z-index: 4;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}
.arena-character-caption .arena-eyebrow {
  font-size: 7.5px;
  color: #d0c5ab;
  letter-spacing: 1.6px;
}
.arena-character-caption h2 {
  font-size: clamp(16px, 1.8vw, 22px);
  font-weight: 900;
  letter-spacing: -0.5px;
  line-height: 1.1;
  text-transform: uppercase;
  margin: 4px 0 0;
  overflow-wrap: anywhere;
}
.arena-favorite {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(21,22,21,0.72);
  backdrop-filter: blur(10px);
  color: #f3f1e9;
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 8px;
  min-height: 32px;
  padding: 6px 11px;
  flex-shrink: 0;
  transition: all .2s;
}
.arena-favorite:hover:not(:disabled) {
  border-color: #eab64b;
  color: #f7d984;
}
.arena-favorite span {
  font-size: 9px;
  font-weight: 700;
}
.arena-favorite.is-favorite {
  color: #eab64b;
  border-color: rgba(234,182,75,0.4);
  background: rgba(234,182,75,0.1);
}

/* ── Hero Roster Selector Strip (Sleek, Compact) ───────────── */
.arena-roster {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  align-items: center;
}
.arena-roster-heading p {
  font-size: 9.5px;
  color: #8c8e88;
  margin: 3px 0 6px;
}
.arena-autoplay {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  padding: 3px 0;
  background: none;
  color: #b8b8b0;
  font-size: 8.5px !important;
  min-height: 24px;
  transition: color .2s;
}
.arena-autoplay:hover { color: #eab64b; }
.arena-hero-list {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 3px 2px 5px;
  scrollbar-width: thin;
  scrollbar-color: rgba(234,182,75,0.3) transparent;
  scroll-snap-type: x proximity;
}
.arena-hero-option {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 104px;
  max-width: 128px;
  flex-shrink: 0;
  background: rgba(22,23,27,0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 7px;
  color: #9c9d96;
  padding: 4px 6px;
  text-align: left;
  transition: all .2s;
  scroll-snap-align: start;
}
.arena-hero-option:hover {
  border-color: rgba(234,182,75,0.45);
  background: rgba(30,31,36,0.9);
  color: #f3f1e9;
}
.arena-hero-option.is-active {
  border-color: #eab64b;
  background: rgba(234,182,75,0.12);
  color: #f7d984;
  box-shadow: 0 0 10px rgba(234,182,75,0.15);
}
.arena-option-image {
  position: relative;
  width: 32px;
  height: 38px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 4px;
  background: #1e1f23;
}
.arena-option-image img {
  object-fit: cover;
  object-position: top;
}
.arena-option-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 4px;
  min-width: 0;
}
.arena-option-number {
  font-size: 7.5px;
  color: #8c8a80;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: monospace;
}
.arena-option-copy strong {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 78px;
}
.arena-empty { font-size: 10.5px; color: #a4a49c; }
.arena-error { font-size: 10.5px; color: #f87171; }

/* ── Footer Sub-Bar ────────────────────────────────────────── */
.arena-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0 14px;
  font-size: 7.5px;
  letter-spacing: 1.2px;
  color: #82837d;
}
.arena-footer a {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #a8a89e;
  letter-spacing: 0.5px;
  transition: color .2s;
}
.arena-footer a:hover { color: #eab64b; }

/* ── Modal ─────────────────────────────────────────────────── */
.arena-login {
  padding: 0;
  border: 1px solid rgba(255,255,255,0.2);
  background: #121317;
  color: #f3f1e9;
  width: min(380px, calc(100% - 32px));
  border-radius: 16px;
  margin: auto;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.8);
}
.arena-login::backdrop {
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(6px);
}
.arena-login-inner {
  padding: 28px 24px;
  position: relative;
}
.arena-login h2 {
  font-size: 22px;
  letter-spacing: -0.5px;
  margin: 14px 0 8px;
}
.arena-login p {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
  margin: 0 0 20px;
}
.arena-close {
  position: absolute;
  right: 14px;
  top: 14px;
  background: none;
  border: 0;
  color: #9ca3af;
  padding: 6px;
  border-radius: 6px;
  transition: color .2s;
}
.arena-close:hover { color: #ffffff; }
.arena-login .arena-eyebrow {
  color: #eab64b;
  font-size: 8px;
}

/* ── Responsive Queries ────────────────────────────────────── */
@media (max-width: 1000px) {
  .arena-copy h1 { font-size: clamp(28px, 4.2vw, 38px); }
  .arena-stage { min-height: 340px; }
  .arena-character-caption { left: 10%; right: -2%; }
  .arena-favorite span { display: none; }
  .arena-roster { grid-template-columns: 140px minmax(0, 1fr); gap: 12px; }
}

@media (max-width: 760px) {
  .bv-arena { padding-top: 64px; }
  .arena-shell { padding: 0 16px; }
  .arena-stage {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "kicker" "headline" "art" "description" "actions" "proof";
    align-items: stretch;
    min-height: 0;
    padding-top: 18px;
  }
  /* Keep the DOM reading order; place the artwork early in the visual layout. */
  .arena-copy { display: contents; }
  .arena-kicker { grid-area: kicker; flex-wrap: wrap; font-size: 8px; gap: 7px; }
  .arena-copy h1 {
    grid-area: headline;
    font-size: clamp(28px, 7.8vw, 38px);
    margin: 12px 0 0;
    line-height: 1;
  }
  .arena-description {
    grid-area: description;
    font-size: 11px;
    line-height: 1.6;
    max-width: none;
    margin-top: 6px;
  }
  .arena-actions { grid-area: actions; margin-top: 12px; gap: 8px; }
  .arena-primary, .arena-secondary { min-height: 44px; justify-content: center; }
  .arena-primary { flex: 1 1 128px; }
  .arena-secondary { flex: 1 1 145px; }
  .arena-art {
    grid-area: art;
    position: relative;
    width: 100%;
    min-width: 0;
    height: clamp(230px, 65vw, 300px);
    min-height: 0;
    margin: 8px 0 0;
    isolation: isolate;
  }
  .arena-character { inset: 0 0 48px; z-index: 2; }
  .arena-character-image { object-fit: contain; object-position: center; }
  .arena-gold-panel { inset: 8px 0 38px 0; }
  .arena-gold-panel > span { font-size: 160px; right: 6%; top: 4%; }
  .arena-orbit { width: min(64%, 210px); top: 5%; left: 18%; }
  .arena-art-note { right: 4px; top: 24px; font-size: 7px; }
  .arena-character-index { top: 16px; left: 8px; }
  .arena-art:after { left: 0; right: 0; height: 48px; z-index: 3; }
  .arena-character-caption { bottom: 0; left: 0; right: 0; min-height: 44px; align-items: center; }
  .arena-character-caption > div { min-width: 0; }
  .arena-character-caption h2 { font-size: 18px; }
  .arena-favorite { min-height: 44px; padding: 8px 11px; }
  .arena-favorite span { display: inline; }
  .arena-proof { grid-area: proof; margin: 16px 0; gap: 20px; }
  .arena-proof > div { flex-direction: row; align-items: baseline; gap: 6px; }
  .arena-proof strong { font-size: 15px; }
  .arena-proof span { font-size: 8px; }
  .arena-proof .arena-proof-note { display: none; }
  .arena-roster { display: block; padding: 8px 0 10px; }
  .arena-roster-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 8px; }
  .arena-roster-heading p { display: none; }
  .arena-autoplay { min-height: 44px; }
  .arena-hero-list { margin: 0 -16px; padding: 4px 16px 8px; }
  .arena-hero-option { min-height: 48px; }
  .arena-footer { flex-wrap: wrap; gap: 8px; font-size: 7px; }
  .arena-footer > span { flex-basis: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .bv-arena * { transition: none !important; scroll-behavior: auto !important; }
  .arena-primary:hover { transform: none; }
}
`;

export const Hero = () => {
  const { loading, heroCatalog, selectedKey, selectHero } = useHero();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const [hasTeam, setHasTeam] = useState(false);
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [activeCatalogIndex, setActiveCatalogIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const [saveError, setSaveError] = useState('');
  const [autoShowcaseActive, setAutoShowcaseActive] = useState(true);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

  const [panelStats, setPanelStats] = useState<HeroPanelStats>({
    season: 'Arena', teams: '—', players: '—', prize: '—',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/leaderboards/teams?limit=50', { cache: 'no-store' }),
      fetch('/api/teams?limit=50', { cache: 'no-store' }),
    ]).then(async ([lr, tr]) => {
      const ld = lr.ok ? await lr.json() : null;
      const td = tr.ok ? await tr.json() : null;
      const standings = Array.isArray(ld?.standings) ? ld.standings : [];
      const teams = Array.isArray(td?.teams) ? td.teams : [];
      const seasonName: string | undefined = ld?.season?.name;
      const teamsCount = Number(ld?.pagination?.total ?? teams.length ?? 0);
      const playersCount = teams.reduce((t: number, team: { _count?: { players?: number } }) =>
        t + (typeof team?._count?.players === 'number' ? team._count.players : 0), 0);
      const topPrize = standings.reduce((m: number, s: { team?: { totalPrizeMoney?: number } }) => {
        const p = Number(s?.team?.totalPrizeMoney ?? 0);
        return Number.isFinite(p) ? Math.max(m, p) : m;
      }, 0);
      setPanelStats({
        season: seasonName && typeof seasonName === 'string' ? seasonName : 'ACTIVE',
        teams: String(teamsCount || 0),
        players: playersCount > 0 ? `${playersCount}+` : '0',
        prize: topPrize > 0 ? `₵${Math.round(topPrize).toLocaleString()}` : '₵0',
      });
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { setHasTeam(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/my-team');
        if (!resp.ok) { if (!cancelled) setHasTeam(false); return; }
        const data = await resp.json();
        if (!cancelled) setHasTeam(Boolean(data && (data.id || data.team || data.teamId || (Array.isArray(data.players) && data.players.length > 0))));
      } catch { if (!cancelled) setHasTeam(false); }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (heroCatalog.length > 0 && selectedKey) {
      const idx = heroCatalog.findIndex(h => h.key === selectedKey);
      if (idx !== -1) setActiveCatalogIndex(idx);
    }
  }, [heroCatalog, selectedKey]);

  useEffect(() => {
    if (heroCatalog.length <= 1 || reducedMotion) return;
    const interval = setInterval(() => {
      const isIdle = Date.now() - lastInteractionTime > 10000;
      if (autoShowcaseActive && isIdle) {
        setActiveCatalogIndex(prev => (prev + 1) % heroCatalog.length);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [heroCatalog, autoShowcaseActive, lastInteractionTime, reducedMotion]);

  const activeHero = useMemo(() =>
    heroCatalog.length === 0 ? null : heroCatalog[activeCatalogIndex] || heroCatalog[0],
    [heroCatalog, activeCatalogIndex]);

  const activeImage = getHeroImageUrl(activeHero?.imageUrl || '/stunchou.png');
  const activeName = activeHero?.name || 'CHOU';
  const activeKey = activeHero?.key || null;

  const handleSelectHero = (hero: HeroCatalogItem) => {
    const idx = heroCatalog.findIndex(h => h.key === hero.key);
    if (idx !== -1) {
      setActiveCatalogIndex(idx);
      setLastInteractionTime(Date.now());
      setAutoShowcaseActive(false);
    }
  };

  const handleLockFavorite = async (hero: HeroCatalogItem) => {
    if (isSavingHero) return;
    setSaveError('');
    try { setIsSavingHero(true); await selectHero(hero); }
    catch { setSaveError('Could not save your hero. Please try again.'); }
    finally { setIsSavingHero(false); }
  };

  const handleRegisterClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (status === 'unauthenticated') { e.preventDefault(); setIsLoginModalOpen(true); }
  };

  const toggleAutoShowcase = () => {
    setAutoShowcaseActive(p => !p);
    setLastInteractionTime(Date.now());
  };

  return (
    <>
      <ArenaHero heroImage={activeImage} heroName={activeName} heroes={heroCatalog}
        activeKey={activeKey} selectedKey={selectedKey} onSelect={handleSelectHero}
        onSave={handleLockFavorite} saving={isSavingHero} stats={panelStats}
        onRegister={handleRegisterClick} hasTeam={hasTeam}
        auto={autoShowcaseActive && !reducedMotion} onToggleAuto={toggleAutoShowcase}
        reducedMotion={!!reducedMotion} loading={loading} saveError={saveError} />
      <LoginRequiredModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
};
