'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Shield, User, ArrowUpRight, Play, Users } from 'lucide-react';

type MatchTeam = { id?: string; name: string; tag: string; logo: string | null };
type PlayerData = {
  id: string; ign: string; role: string; photo: string | null;
  isSubstitute: boolean; user?: { photo: string | null };
  stats?: { kda?: string; winRate?: number; mvpCount?: number };
};
type ScheduleMatch = {
  id: string; time: string; elapsed: string | null;
  teamA: MatchTeam; teamB: MatchTeam;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED';
  scoreA: number; scoreB: number; stage: string;
  flyerUrl?: string | null; flyerType?: string | null;
  streamUrl?: string | null;
};


const ROLE_LABEL: Record<string, string> = { EXP: 'EXP lane', JUNGLE: 'Jungle', MID: 'Mid lane', GOLD: 'Gold lane', ROAM: 'Roam' };
const ROLE_ORDER = ['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM'];
const STATUS_LABEL = { LIVE: 'Live now', UPCOMING: 'Upcoming', COMPLETED: 'Final result', FORFEITED: 'Forfeited', DISPUTED: 'Disputed' };
function Portrait({ src, alt, logo = false }: { src?: string | null; alt: string; logo?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isFailed = !src || failedSrc === src;
  return (
    <span className={logo ? 'sf-logo' : 'sf-photo'}>
      {src && !isFailed ? (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          sizes={logo ? '48px' : '(max-width: 600px) 44px, 64px'}
          onError={() => setFailedSrc(src)}
        />
      ) : logo ? (
        <Shield size={23} />
      ) : (
        <User size={22} />
      )}
    </span>
  );
}
function Roster({ team, players, loading, winner, side }: { team: MatchTeam; players: PlayerData[]; loading: boolean; winner: boolean; side: 'a' | 'b' }) {
  const starters = players.filter(p => !p.isSubstitute).sort((a, b) => {
    const rank = (r: string) => { const i = ROLE_ORDER.indexOf(r?.toUpperCase()); return i < 0 ? 99 : i; };
    return rank(a.role) - rank(b.role);
  });
  const substitutes = players.filter(p => p.isSubstitute);
  const row = (p: PlayerData, index: number) => <li key={p.id} className="sf-player"><span className="sf-player-number">{String(index + 1).padStart(2, '0')}</span><Portrait src={p.photo || p.user?.photo} alt={p.ign} /><span className="sf-player-name"><strong>{p.ign}</strong><small>{ROLE_LABEL[p.role?.toUpperCase()] || p.role || 'Role pending'}</small></span>{p.isSubstitute && <span className="sf-sub">SUB</span>}</li>;
  return <section className={`sf-roster sf-side-${side}`} aria-label={`${team.name} roster`}>
    <div className="sf-roster-heading"><span>{team.tag || team.name}</span><span>{winner ? 'WINNER' : `${starters.length} starters`}</span></div>
    {loading ? <div className="sf-roster-state" role="status">Loading lineup…</div> : starters.length ? <ol className="sf-players">{starters.map(row)}</ol> : <div className="sf-roster-state"><Users size={20} /><p>Starting lineup not available yet.</p></div>}
    {!loading && substitutes.length > 0 && <><div className="sf-sub-heading">Substitutes</div><ol className="sf-players">{substitutes.map(row)}</ol></>}
  </section>;
}
function safeStreamUrl(value?: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url : null; } catch { return null; }
}
function embedStream(value?: string | null) {
  const url = safeStreamUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.split('/')[1];
  if (['youtube.com', 'm.youtube.com'].includes(host)) id = url.searchParams.get('v') || (/^\/(embed|live|shorts)\//.test(url.pathname) ? url.pathname.split('/')[2] : '');
  if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
  if (['twitch.tv', 'm.twitch.tv'].includes(host)) {
    const channel = url.pathname.split('/')[1];
    if (/^[a-zA-Z0-9_]+$/.test(channel) && !['videos', 'directory', 'downloads'].includes(channel)) return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&muted=true&autoplay=true`;
  }
  return null;
}

export function StartingFiveModal({ match, teamAPlayers, teamBPlayers, loading, error, onClose }: {
  match: ScheduleMatch; teamAPlayers: PlayerData[]; teamBPlayers: PlayerData[]; loading: boolean; error?: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<'lineups' | 'stream' | 'poster'>('lineups');
  const [mobileTeam, setMobileTeam] = useState<'a' | 'b'>('a');
  const [mediaFailed, setMediaFailed] = useState(false);
  const streamUrl = safeStreamUrl(match.streamUrl);
  const embed = embedStream(match.streamUrl);
  const aWon = match.status === 'COMPLETED' && match.scoreA > match.scoreB;
  const bWon = match.status === 'COMPLETED' && match.scoreB > match.scoreA;
  useEffect(() => {
    const element = dialog.current;
    if (!element?.open) element?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; if (element?.open) element.close(); };
  }, []);
  return <dialog ref={dialog} className="sf-dialog" aria-label={`${match.teamA.name} versus ${match.teamB.name} match details`} onCancel={onClose}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <style>{styles}</style>
    <div className="sf-inner">
      <div className="sf-top"><span>MATCH CENTRE <span>/ {match.stage}</span></span><button type="button" aria-label="Close match details" onClick={onClose}><X size={18} /></button></div>
      <div className={`sf-scoreboard ${match.status === 'LIVE' ? 'sf-live' : ''}`}>
        <div className="sf-team"><Portrait src={match.teamA.logo} alt="" logo /><div><strong>{match.teamA.name}</strong><small>{aWon ? 'Match winner' : match.teamA.tag}</small></div></div>
        <div className="sf-score-wrap"><span className="sf-status">{STATUS_LABEL[match.status]}</span><div className="sf-score">{match.status === 'UPCOMING' ? <span className="sf-vs">VS</span> : <><b className={aWon ? 'sf-won' : ''}>{match.scoreA}</b><span>:</span><b className={bWon ? 'sf-won' : ''}>{match.scoreB}</b></>}</div><small>{match.status === 'LIVE' && match.elapsed ? match.elapsed : match.time}</small></div>
        <div className="sf-team sf-team-b"><Portrait src={match.teamB.logo} alt="" logo /><div><strong>{match.teamB.name}</strong><small>{bWon ? 'Match winner' : match.teamB.tag}</small></div></div>
      </div>
      <div className="sf-navigation" role="group" aria-label="Match view"><button type="button" aria-pressed={view === 'lineups'} onClick={() => setView('lineups')}><Users size={14} />Lineups</button>{streamUrl && <button type="button" aria-pressed={view === 'stream'} onClick={() => setView('stream')}><Play size={13} />{match.status === 'LIVE' ? 'Watch live' : 'Stream'}</button>}{match.flyerUrl && <button type="button" aria-pressed={view === 'poster'} onClick={() => { setMediaFailed(false); setView('poster'); }}>Match poster</button>}</div>
      <div className="sf-body">
        {view === 'lineups' && <>
          {error && <p className="sf-error" role="alert">{error}</p>}
          <div className="sf-mobile-switch" role="group" aria-label="Choose team roster"><button type="button" aria-pressed={mobileTeam === 'a'} onClick={() => setMobileTeam('a')}>{match.teamA.tag || match.teamA.name}</button><button type="button" aria-pressed={mobileTeam === 'b'} onClick={() => setMobileTeam('b')}>{match.teamB.tag || match.teamB.name}</button></div>
          <div className={`sf-rosters sf-mobile-${mobileTeam}`}><Roster team={match.teamA} players={teamAPlayers} loading={loading} winner={aWon} side="a" /><Roster team={match.teamB} players={teamBPlayers} loading={loading} winner={bWon} side="b" /></div>
        </>}
        {view === 'stream' && streamUrl && <div className="sf-stream">{embed ? <iframe src={embed} title={`${match.teamA.name} vs ${match.teamB.name} broadcast`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <div className="sf-external"><Play size={26} /><h3>Watch with the broadcaster.</h3><p>This match is hosted on an external platform.</p></div>}<a href={streamUrl.href} target="_blank" rel="noopener noreferrer">Open stream in a new tab<ArrowUpRight size={14} /></a></div>}
        {view === 'poster' && match.flyerUrl && <div className="sf-poster">{mediaFailed ? <p role="status">This match poster couldn’t load.</p> : match.flyerType === 'VIDEO' ? <video src={match.flyerUrl} controls playsInline preload="metadata" onError={() => setMediaFailed(true)} /> : <div className="sf-poster-image"><Image src={match.flyerUrl} alt={`${match.teamA.name} versus ${match.teamB.name} match poster`} fill sizes="(max-width: 760px) 100vw, 800px" onError={() => setMediaFailed(true)} /></div>}</div>}
      </div>
      <div className="sf-footer"><span>BOTSVILLE GHANA</span><span>{view === 'lineups' ? 'Starting lineups & substitutes' : 'Match coverage'}</span></div>
    </div>
  </dialog>;
}
export default StartingFiveModal;

const styles = `
.sf-dialog{position:fixed;inset:0;margin:auto;padding:0;width:min(860px,calc(100% - 32px));max-height:calc(100dvh - 32px);overflow:hidden;border:1px solid #ffffff26;border-radius:14px;background:#10151b;color:#e7ece5;font-family:Arial,Helvetica,sans-serif;box-shadow:0 32px 100px #0008}.sf-dialog::backdrop{background:#000b;backdrop-filter:blur(8px)}.sf-dialog *{box-sizing:border-box}.sf-dialog button{font:inherit;cursor:pointer}.sf-inner{max-height:calc(100dvh - 34px);display:flex;flex-direction:column}.sf-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 16px 4px 24px;min-height:52px;border-bottom:1px solid #ffffff0e;flex-shrink:0}.sf-top>span{font-size:9px;letter-spacing:1.2px;color:#c0b18e;min-width:0;line-height:1.6}.sf-top>span>span{color:#9aa5a3;letter-spacing:.3px}.sf-top button{width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:none;border:0;color:#c2ccc8;border-radius:6px}.sf-top button:hover{background:#ffffff09}.sf-scoreboard{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:24px;align-items:center;padding:22px 28px;background:#151d26;flex-shrink:0}.sf-team{display:flex;align-items:center;gap:12px;min-width:0}.sf-team-b{flex-direction:row-reverse;text-align:right}.sf-team strong{display:block;font-size:14px;line-height:1.35;overflow-wrap:anywhere}.sf-team small{display:block;font-size:10px;margin-top:5px;color:#9daaa6}.sf-logo{position:relative;width:48px;height:48px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#82928c}.sf-logo img{object-fit:contain}.sf-score-wrap{text-align:center;min-width:90px}.sf-status{font-size:8px;letter-spacing:.7px;text-transform:uppercase;color:#bbc5bd}.sf-live .sf-status{color:#ff9e95}.sf-score{display:flex;align-items:center;justify-content:center;gap:14px;margin:8px 0 6px;font-variant-numeric:tabular-nums}.sf-score b{font-size:34px;line-height:1}.sf-score>span{color:#6f8385}.sf-score .sf-vs{font-size:23px}.sf-score b.sf-won{color:#ebc67d}.sf-score-wrap>small{font-size:9px;color:#9ca9a4}.sf-navigation{display:flex;gap:20px;align-items:center;padding:0 24px;border-bottom:1px solid #ffffff14;flex-shrink:0}.sf-navigation button{display:flex;gap:7px;align-items:center;min-height:48px;padding:0;border:0;border-bottom:2px solid transparent;background:none;color:#9caaa6;font-size:11px;white-space:nowrap}.sf-navigation button[aria-pressed=true]{border-bottom-color:#eab64b;color:#eac476}.sf-body{min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:20px 24px;scrollbar-width:thin;scrollbar-color:#53615c transparent}.sf-rosters{display:grid;grid-template-columns:1fr 1fr;gap:26px}.sf-roster{min-width:0}.sf-roster-heading{display:flex;justify-content:space-between;gap:10px;font-size:9px;letter-spacing:.8px;padding:0 0 10px;border-bottom:1px solid #ffffff16;color:#d4c091}.sf-side-b .sf-roster-heading{color:#a5bed4}.sf-roster-heading>span:last-child{font-size:8px;letter-spacing:.2px;color:#a7b3a9}.sf-players{list-style:none;margin:0;padding:0}.sf-player{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #ffffff0c;min-height:68px}.sf-player-number{font-size:9px;color:#72807e;width:15px;flex-shrink:0;font-variant-numeric:tabular-nums}.sf-photo{position:relative;display:flex;align-items:center;justify-content:center;width:48px;height:48px;flex-shrink:0;overflow:hidden;border-radius:6px;background:#222c34;color:#8a9994}.sf-photo img{object-fit:cover;object-position:top}.sf-player-name{min-width:0;flex:1}.sf-player-name strong{display:block;font-size:12px;font-weight:600;overflow-wrap:anywhere}.sf-player-name small{display:block;font-size:9px;color:#9daaa4;margin-top:5px}.sf-sub{font-size:8px;color:#a6b5a9;padding:4px;background:#ffffff06;border-radius:3px}.sf-sub-heading{font-size:9px;color:#b1bcaf;margin-top:20px;padding-bottom:6px}.sf-roster-state{padding:28px 8px;color:#99a7a0;font-size:11px;text-align:center;line-height:1.6}.sf-roster-state svg{margin:auto}.sf-mobile-switch{display:none}.sf-error{padding:12px;font-size:11px;color:#e7bd9c;background:#b8653414;line-height:1.6}.sf-footer{display:flex;justify-content:space-between;gap:12px;padding:14px 24px;border-top:1px solid #ffffff10;color:#929f97;font-size:8px;letter-spacing:.7px;flex-shrink:0}.sf-stream iframe{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:8px;background:#000}.sf-stream a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;color:#edc87e;font-size:11px;text-decoration:none;margin-top:12px}.sf-external{text-align:center;padding:30px 16px;background:#151e25;border-radius:8px}.sf-external svg{margin:auto;color:#cfb57d}.sf-external h3{font-size:19px;letter-spacing:-.4px;margin:14px 0 8px}.sf-external p{font-size:12px;color:#a2b0a8;line-height:1.6}.sf-poster-image{position:relative;height:min(55vh,500px)}.sf-poster-image img{object-fit:contain}.sf-poster video{display:block;width:100%;max-height:55vh}.sf-poster p{font-size:12px;color:#bcc7bd;text-align:center;padding:30px}.sf-dialog :is(a,button):focus-visible{outline:2px solid #e8bd67;outline-offset:3px}
@media(max-width:600px){.sf-dialog{width:calc(100% - 20px);max-height:calc(100dvh - 20px);border-radius:11px}.sf-inner{max-height:calc(100dvh - 22px)}.sf-top{padding:2px 8px 2px 16px}.sf-top>span{font-size:8px;letter-spacing:.7px}.sf-scoreboard{padding:18px 12px;gap:10px}.sf-team,.sf-team-b{flex-direction:column;text-align:center;gap:8px}.sf-logo{width:38px;height:38px}.sf-team strong{font-size:11px}.sf-team small{font-size:8px;margin-top:4px}.sf-score-wrap{min-width:66px}.sf-score{gap:9px}.sf-score b{font-size:28px}.sf-status{font-size:7px}.sf-navigation{padding:0 16px;gap:20px}.sf-navigation button{font-size:10px;min-height:44px}.sf-body{padding:12px 16px 16px}.sf-rosters{display:block}.sf-mobile-a .sf-side-b,.sf-mobile-b .sf-side-a{display:none}.sf-mobile-switch{display:flex;gap:6px;margin-bottom:16px;padding:3px;background:#0b1015;border:1px solid #ffffff0e;border-radius:7px}.sf-mobile-switch button{flex:1;min-width:0;min-height:40px;background:none;border:0;border-radius:5px;color:#aab7ad;font-size:10px;overflow-wrap:anywhere}.sf-mobile-switch button[aria-pressed=true]{background:#253039;color:#f1e4c4}.sf-player{min-height:62px;gap:10px;padding:8px 0}.sf-photo{width:44px;height:44px}.sf-player-name strong{font-size:12px}.sf-footer{padding:12px 16px;font-size:7px;letter-spacing:.4px}}
`;
