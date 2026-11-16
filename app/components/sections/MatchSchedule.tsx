'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { ArrowUpRight, ChevronLeft, ChevronRight, Shield, Swords } from 'lucide-react';
import StartingFiveModal from './StartingFiveModal';

type MatchTeam = { id?: string; name: string; tag: string; logo: string | null };
type PlayerData = { id: string; ign: string; role: string; photo: string | null; isSubstitute: boolean; user?: { photo: string | null }; };
type ScheduleMatch = { id: string; time: string; scheduledAt: string; elapsed: string | null; teamA: MatchTeam & { isEliminated?: boolean }; teamB: MatchTeam & { isEliminated?: boolean }; status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED'; scoreA: number; scoreB: number; stage: string; lobby?: 'LOBBY_A' | 'LOBBY_B'; playDay?: number; isChallenge?: boolean; flyerUrl?: string | null; flyerType?: string | null; streamUrl?: string | null; };
type TournamentListItem = { id: string; name: string; status: string; createdAt?: string; _count?: { matches?: number } };
type ApiMatch = { id: string; scheduledTime: string; elapsed: string | null; status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'FORFEITED' | 'DISPUTED'; scoreA: number; scoreB: number; stage: string | null; lobby: 'LOBBY_A' | 'LOBBY_B' | null; playDay: number | null; teamA: { id: string; name: string; tag: string | null; logo: string | null; registrations?: { isEliminated: boolean }[] }; teamB: { id: string; name: string; tag: string | null; logo: string | null; registrations?: { isEliminated: boolean }[] }; challengeRequest?: { id: string } | null; flyerUrl?: string | null; flyerType?: string | null; };

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                   */
/* ────────────────────────────────────────────────────────── */
const formatMatchTime = (value: string) => {
  const d = new Date(value);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};
const formatMatchDate = (value: string) => {
  const d = new Date(value);
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const buildTeamTag = (name: string, tag?: string | null) => {
  if (tag?.trim()) return tag.trim().toUpperCase();
  return name.split(' ').filter(Boolean).slice(0, 3).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'TM';
};

/* ────────────────────────────────────────────────────────── */
/*  Custom Hooks (Logic Kept Intact)                          */
/* ────────────────────────────────────────────────────────── */
const useRealtimeMatches = () => {
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initialSelectionDone = useRef(false);
  const requestId = useRef(0);
  const activeIdRef = useRef(activeTournamentId);
  activeIdRef.current = activeTournamentId;
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch('/api/tournaments?limit=20', { cache: 'no-store' });
        if (!res.ok) throw new Error('Could not load tournaments');
        const data = await res.json();
        const statusOrder: Record<string, number> = {
          LIVE: 0,
          ONGOING: 0,
          OPEN: 1,
          CLOSED: 2,
          UPCOMING: 3,
          COMPLETED: 4,
          CANCELLED: 5,
        };
        const list = (Array.isArray(data?.tournaments) ? data.tournaments : [])
          .filter((t: TournamentListItem) => (t._count?.matches ?? 0) > 0)
          .sort((a: TournamentListItem, b: TournamentListItem) => {
            const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
            if (statusDiff !== 0) return statusDiff;
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          });

        setTournaments(list);
        if (list.length > 0 && !initialSelectionDone.current) {
          // list[0] is always highest-priority (LIVE / ONGOING > OPEN > UPCOMING > COMPLETED)
          const prioritize = list[0];
          setActiveTournamentId(prioritize.id);
          initialSelectionDone.current = true;
        }
      } catch { setError('Could not load tournaments. Please refresh to try again.'); } finally { setLoading(false); }
    };
    fetchTournaments();
  }, []);

  const loadMatches = useCallback(async () => {
    if (!activeTournamentId) return;
    const request = ++requestId.current;
    try {
      const mRes = await fetch(`/api/tournaments/${activeTournamentId}/matches`, { cache: 'no-store' });
      if (!mRes.ok) throw new Error('Could not load matches');
      const mData: ApiMatch[] = await mRes.json();
      const mapped: ScheduleMatch[] = (Array.isArray(mData) ? mData : []).map((m) => ({
        id: m.id,
        time: formatMatchTime(m.scheduledTime),
        scheduledAt: m.scheduledTime,
        elapsed: m.elapsed,
        teamA: {
          id: m.teamA?.id, name: m.teamA?.name || 'Team A',
          tag: buildTeamTag(m.teamA?.name || 'Team A', m.teamA?.tag),
          logo: m.teamA?.logo || null,
          isEliminated: m.teamA?.registrations?.[0]?.isEliminated ?? false
        },
        teamB: {
          id: m.teamB?.id, name: m.teamB?.name || 'Team B',
          tag: buildTeamTag(m.teamB?.name || 'Team B', m.teamB?.tag),
          logo: m.teamB?.logo || null,
          isEliminated: m.teamB?.registrations?.[0]?.isEliminated ?? false
        },
        status: m.status, scoreA: m.scoreA || 0, scoreB: m.scoreB || 0,
        stage: m.stage || 'Match', lobby: m.lobby || undefined, playDay: m.playDay || undefined,
        isChallenge: Boolean(m.challengeRequest),
        flyerUrl: m.flyerUrl,
        flyerType: m.flyerType,
        streamUrl: (m as { streamUrl?: string | null }).streamUrl,
      }));

      // Sort matches within tournament: LIVE first, UPCOMING second, COMPLETED last
      const matchPriority: Record<string, number> = {
        LIVE: 0,
        UPCOMING: 1,
        COMPLETED: 2,
        FORFEITED: 3,
        DISPUTED: 4,
      };
      mapped.sort((a, b) => {
        const pA = matchPriority[a.status] ?? 1;
        const pB = matchPriority[b.status] ?? 1;
        if (pA !== pB) return pA - pB;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });

      if (request === requestId.current && activeIdRef.current === activeTournamentId) { setMatches(mapped); setError(''); }
    } catch { if (request === requestId.current && activeIdRef.current === activeTournamentId) setError('Could not refresh matches. Please try again.'); }
    finally { if (request === requestId.current && activeIdRef.current === activeTournamentId) setLoading(false); }
  }, [activeTournamentId]);

  const [prevTournamentId, setPrevTournamentId] = useState(activeTournamentId);
  if (prevTournamentId !== activeTournamentId) {
    setPrevTournamentId(activeTournamentId);
    if (activeTournamentId) {
      setMatches([]);
      setLoading(true);
      setError('');
    }
  }

  useEffect(() => {
    void loadMatches();
    const iv = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadMatches();
      }
    }, 60000);
    return () => clearInterval(iv);
  }, [loadMatches]);

  return { matches, tournaments, activeTournamentId, setActiveTournamentId, loading, error, retry: loadMatches };
};


function TeamLogo({ team }: { team: MatchTeam }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isFailed = !team.logo || failedSrc === team.logo;
  return (
    <span className="mc-team-logo">
      {team.logo && !isFailed ? (
        <Image
          key={team.logo}
          src={team.logo}
          alt=""
          fill
          sizes="48px"
          className="mc-logo-image"
          onError={() => setFailedSrc(team.logo!)}
        />
      ) : (
        <Shield size={24} />
      )}
    </span>
  );
}
const statusLabel = (s: ScheduleMatch['status']) => ({ LIVE: 'Live now', UPCOMING: 'Upcoming', COMPLETED: 'Final', FORFEITED: 'Forfeited', DISPUTED: 'Disputed' }[s]);
const stageGroup = (stage: string) => !stage ? 'Other' : /grand final/i.test(stage) ? 'Grand Finals' : /group/i.test(stage) ? 'Group Stage' : 'Playoffs';

function MatchTile({ match: m, featured = false, onOpen }: { match: ScheduleMatch; featured?: boolean; onOpen: () => void }) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const hasScore = m.status !== 'UPCOMING';
  return <button type="button" onClick={onOpen} className={`mc-match ${featured ? 'mc-featured' : ''} ${m.status === 'LIVE' ? 'mc-live' : ''}`}
    aria-label={`${m.teamA.name} versus ${m.teamB.name}, ${statusLabel(m.status)}. View match and lineups`}>
    {featured && m.flyerUrl && !mediaFailed && <div className="mc-backdrop" aria-hidden="true">{m.flyerType === 'VIDEO' ? <video src={m.flyerUrl} muted playsInline preload="metadata" onError={() => setMediaFailed(true)} /> : <Image src={m.flyerUrl} alt="" fill sizes="(max-width: 760px) 100vw, 1100px" onError={() => setMediaFailed(true)} />}</div>}
    <div className="mc-match-top"><span className={`mc-status mc-status-${m.status.toLowerCase()}`}>{m.status === 'LIVE' && <i />}{statusLabel(m.status)}</span><span>{featured ? 'FEATURED MATCH' : m.stage}{m.isChallenge ? ' · Challenge' : ''}</span><span>{formatMatchDate(m.scheduledAt)} · {m.time}</span></div>
    <div className="mc-versus">
      <div className="mc-team"><TeamLogo team={m.teamA} /><span><strong>{m.teamA.name}</strong><small>{m.teamA.tag}{m.teamA.isEliminated ? ' · Eliminated' : ''}</small></span></div>
      <div className="mc-score">{hasScore ? <><b className={m.status === 'COMPLETED' && m.scoreA > m.scoreB ? 'mc-winner' : ''}>{m.scoreA}</b><span>:</span><b className={m.status === 'COMPLETED' && m.scoreB > m.scoreA ? 'mc-winner' : ''}>{m.scoreB}</b></> : <span className="mc-vs">VS</span>}</div>
      <div className="mc-team mc-team-b"><TeamLogo team={m.teamB} /><span><strong>{m.teamB.name}</strong><small>{m.teamB.tag}{m.teamB.isEliminated ? ' · Eliminated' : ''}</small></span></div>
    </div>
    <div className="mc-match-bottom"><span>{featured ? m.stage : m.lobby?.replace('_', ' ') || 'Match details'}{featured && m.lobby ? ` / ${m.lobby.replace('_', ' ')}` : ''}{m.elapsed && m.status === 'LIVE' ? ` · ${m.elapsed}` : ''}</span><span>{m.status === 'LIVE' && m.streamUrl ? 'Watch & lineups' : 'View lineups'}<ArrowUpRight size={13} /></span></div>
  </button>;
}

const MATCHES_PER_PAGE = 6;

const getPageNumbers = (current: number, total: number): (number | string)[] => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
};

export const MatchSchedule = () => {
  const { matches, tournaments, activeTournamentId, setActiveTournamentId, loading, error, retry } = useRealtimeMatches();
  const [activeStage, setActiveStage] = useState('ALL');
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState<ScheduleMatch | null>(null);
  const [teamAPlayers, setTeamAPlayers] = useState<PlayerData[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<PlayerData[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersError, setPlayersError] = useState('');
  const rosterRequest = useRef(0);
  const scheduleRef = useRef<HTMLElement>(null);
  useEffect(() => () => { rosterRequest.current++; }, []);
  const stages = useMemo(() => ['Group Stage', 'Playoffs', 'Grand Finals', 'Other'].filter(stage => matches.some(m => stageGroup(m.stage) === stage)), [matches]);
  const stageMatches = matches.filter(m => activeStage === 'ALL' || stageGroup(m.stage) === activeStage);
  const days = Array.from(new Set(stageMatches.map(m => m.playDay || 0))).sort((a, b) => a - b);
  const filteredMatches = stageMatches.filter(m => (activeDay === null || (m.playDay || 0) === activeDay) && (activeStatus === 'ALL' || m.status === activeStatus));
  const featured = filteredMatches.find(m => m.status === 'LIVE') || filteredMatches.find(m => /grand final/i.test(m.stage)) || filteredMatches.find(m => m.flyerUrl) || filteredMatches[0];
  const remaining = filteredMatches.filter(m => m.id !== featured?.id);
  const totalPages = Math.max(1, Math.ceil(remaining.length / MATCHES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedMatches = remaining.slice((safePage - 1) * MATCHES_PER_PAGE, safePage * MATCHES_PER_PAGE);
  const startIndex = (safePage - 1) * MATCHES_PER_PAGE + 1;
  const endIndex = Math.min(safePage * MATCHES_PER_PAGE, remaining.length);
  const pageNumbers = getPageNumbers(safePage, totalPages);
  const liveCount = matches.filter(m => m.status === 'LIVE').length;

  const changeTournament = (id: string) => {
    setActiveTournamentId(id);
    setActiveStage('ALL');
    setActiveDay(null);
    setActiveStatus('ALL');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const openMatch = async (match: ScheduleMatch) => {
    const request = ++rosterRequest.current;
    setSelectedMatch(match); setTeamAPlayers([]); setTeamBPlayers([]); setPlayersError(''); setLoadingPlayers(true);
    const fetchPlayers = async (id?: string) => {
      if (!id) return [];
      const res = await fetch(`/api/teams/${id}/players`);
      if (!res.ok) throw new Error('Roster request failed');
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid roster response');
      return data as PlayerData[];
    };
    const results = await Promise.allSettled([fetchPlayers(match.teamA.id), fetchPlayers(match.teamB.id)]);
    if (request !== rosterRequest.current) return;
    if (results[0].status === 'fulfilled') setTeamAPlayers(results[0].value);
    if (results[1].status === 'fulfilled') setTeamBPlayers(results[1].value);
    if (results.some(r => r.status === 'rejected')) setPlayersError('Some player details could not load. Close and reopen this match to retry.');
    setLoadingPlayers(false);
  };
  return <section ref={scheduleRef} className="mc-section" aria-labelledby="mc-title">
    <style>{styles}</style>
    <div className="mc-shell">
      <div className="mc-header"><div><span className="mc-eyebrow">BOTSVILLE / COMPETITION</span><h2 id="mc-title">Every match. <span>Every moment.</span></h2></div>
        <label className="mc-tournament"><span>Tournament</span><select aria-label="Choose tournament" value={activeTournamentId || ''} onChange={e => changeTournament(e.target.value)} disabled={!tournaments.length}>{!tournaments.length && <option value="">{loading ? 'Loading…' : 'No tournaments'}</option>}{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}{['COMPLETED', 'CANCELLED'].includes(t.status) ? ' · Archive' : ''}</option>)}</select></label>
      </div>
      <div className="mc-toolbar"><div className="mc-stages" role="group" aria-label="Tournament stage">{['ALL', ...stages].map(stage => <button type="button" key={stage} aria-pressed={activeStage === stage} onClick={() => { setActiveStage(stage); setActiveDay(null); setCurrentPage(1); }}>{stage === 'ALL' ? 'All stages' : stage}</button>)}</div><span className="mc-live-count">{liveCount ? <><i />{liveCount} live</> : 'Match centre'}</span></div>
      <div className="mc-filters"><div className="mc-days" role="group" aria-label="Match day"><button type="button" aria-pressed={activeDay === null} onClick={() => { setActiveDay(null); setCurrentPage(1); }}>All days</button>{days.map(day => <button type="button" key={day} aria-pressed={activeDay === day} onClick={() => { setActiveDay(day); setCurrentPage(1); }}>{day ? `Day ${String(day).padStart(2, '0')}` : 'Unassigned'}</button>)}</div><select aria-label="Filter match status" value={activeStatus} onChange={e => { setActiveStatus(e.target.value); setCurrentPage(1); }}>{['ALL', 'LIVE', 'UPCOMING', 'COMPLETED', 'FORFEITED', 'DISPUTED'].map(s => <option key={s} value={s}>{s === 'ALL' ? 'All matches' : statusLabel(s as ScheduleMatch['status'])}</option>)}</select></div>
      {error && <div className="mc-error" role="alert">{error}{activeTournamentId && <button type="button" onClick={() => void retry()}>Retry</button>}</div>}
      {loading ? <div className="mc-loading" role="status">Loading matches…</div> : featured ? <div className="mc-matches">
        {safePage === 1 && <MatchTile key={featured.id} match={featured} featured onOpen={() => void openMatch(featured)} />}
        {remaining.length > 0 && <div className="mc-list-heading"><span>ON THE SCHEDULE{totalPages > 1 ? ` · PAGE ${safePage} OF ${totalPages}` : ''}</span><span>{remaining.length} matches total</span></div>}
        <div className="mc-match-grid">{pagedMatches.map(m => <MatchTile key={m.id} match={m} onOpen={() => void openMatch(m)} />)}</div>
        {totalPages > 1 && (
          <nav className="mc-pagination" aria-label="Match schedule pagination">
            <div className="mc-pagination-info">
              Showing <strong>{startIndex}–{endIndex}</strong> of <strong>{remaining.length}</strong> matches
            </div>
            <div className="mc-pagination-controls">
              <button
                type="button"
                className="mc-page-btn mc-page-prev"
                disabled={safePage === 1}
                onClick={() => handlePageChange(safePage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>
              <div className="mc-page-numbers">
                {pageNumbers.map((p, idx) =>
                  typeof p === 'number' ? (
                    <button
                      key={p}
                      type="button"
                      className={`mc-page-num ${safePage === p ? 'is-active' : ''}`}
                      aria-current={safePage === p ? 'page' : undefined}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={`ellipsis-${idx}`} className="mc-page-ellipsis">
                      &hellip;
                    </span>
                  )
                )}
              </div>
              <button
                type="button"
                className="mc-page-btn mc-page-next"
                disabled={safePage === totalPages}
                onClick={() => handlePageChange(safePage + 1)}
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </nav>
        )}
      </div> : <div className="mc-empty"><Swords size={24} /><h3>No matches to show</h3><p>{tournaments.length ? 'Try another day, stage or match status.' : 'Fixtures will appear here once a tournament schedule is published.'}</p></div>}
      <div className="mc-footer"><span>{filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'} shown{totalPages > 1 ? ` · Page ${safePage} of ${totalPages}` : ''}</span><span>Scores refresh every minute<ChevronRight size={12} /></span></div>
    </div>
    {selectedMatch && <StartingFiveModal key={selectedMatch.id} match={matches.find(m => m.id === selectedMatch.id) || selectedMatch} teamAPlayers={teamAPlayers} teamBPlayers={teamBPlayers} loading={loadingPlayers} error={playersError} onClose={() => { rosterRequest.current++; setSelectedMatch(null); }} />}
  </section>;
};

const styles = `
.mc-section{background:#0a0c10;color:#ebeee8;padding:32px 0;font-family:Arial,Helvetica,sans-serif}.mc-section *{box-sizing:border-box}.mc-shell{max-width:1180px;padding:0 24px;margin:auto}.mc-header{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:22px}.mc-eyebrow{font-size:9px;letter-spacing:1.7px;color:#b3a27e}.mc-header h2{font-size:28px;letter-spacing:-1px;line-height:1.2;margin:9px 0 0;font-weight:700}.mc-header h2 span{color:#8e9697}.mc-tournament{display:flex;flex-direction:column;gap:6px;max-width:320px;min-width:220px}.mc-tournament>span{font-size:9px;color:#949d9e}.mc-section select{font-family:inherit;font-size:11px;color:#e3e7df;border:1px solid #ffffff20;border-radius:6px;background:#14181d;min-height:40px;padding:8px 30px 8px 12px;max-width:100%}.mc-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #ffffff16}.mc-stages,.mc-days{display:flex;overflow-x:auto;min-width:0;scrollbar-width:thin;gap:16px}.mc-section button{font:inherit;cursor:pointer}.mc-stages button{white-space:nowrap;padding:14px 0;border:0;border-bottom:2px solid transparent;background:none;color:#9ba4a4;font-size:11px}.mc-stages button[aria-pressed=true]{color:#ebbd64;border-bottom-color:#ebbd64}.mc-live-count{display:flex;align-items:center;gap:6px;font-size:10px;color:#a1aaa7;white-space:nowrap}.mc-live-count i,.mc-status i{display:inline-block;width:5px;height:5px;border-radius:50%;background:#f57572}.mc-filters{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:14px 0}.mc-days{gap:6px}.mc-days button{min-height:36px;padding:0 12px;border:1px solid transparent;border-radius:5px;background:none;color:#9fa9a8;white-space:nowrap;font-size:10px}.mc-days button[aria-pressed=true]{background:#eab64b12;border-color:#eab64b35;color:#edc87e}.mc-filters select{font-size:10px;min-height:36px;flex-shrink:0}.mc-match{position:relative;isolation:isolate;display:block;width:100%;padding:15px 18px;background:#11161c;border:1px solid #ffffff12;border-radius:9px;color:#e7ebe6;text-align:left;overflow:hidden;transition:border-color .2s,background .2s}.mc-match:hover{border-color:#eab64b60;background:#171d23}.mc-match-top,.mc-match-bottom{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:9px;color:#929e9e}.mc-match-top>span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.mc-match-top>span:last-child{white-space:nowrap}.mc-status{display:flex;align-items:center;gap:6px;color:#a7b3b0;font-size:9px;white-space:nowrap}.mc-status-live{color:#ff9690}.mc-status-upcoming{color:#ddc28b}.mc-status-disputed{color:#e7b28e}.mc-versus{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:16px;padding:23px 0}.mc-team{display:flex;align-items:center;gap:12px;min-width:0}.mc-team-b{flex-direction:row-reverse;text-align:right}.mc-team>span:last-child{min-width:0}.mc-team strong{display:block;font-size:12px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}.mc-team small{display:block;font-size:9px;color:#939f9d;margin-top:5px;line-height:1.4}.mc-team-logo{position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#84908f}.mc-logo-image{object-fit:contain}.mc-score{display:flex;align-items:center;justify-content:center;gap:9px;min-width:62px;font-variant-numeric:tabular-nums}.mc-score b{font-size:26px;font-weight:700}.mc-score>span{color:#718080;font-size:16px}.mc-score b.mc-winner{color:#eac476}.mc-score .mc-vs{font-size:11px;font-weight:700;letter-spacing:2px}.mc-match-bottom{border-top:1px solid #ffffff0e;padding-top:10px;font-size:9px}.mc-match-bottom>span:last-child{display:flex;align-items:center;gap:6px;color:#c5cec9}.mc-featured{padding:18px 24px;border-radius:10px;background:#141b22;border-color:#ffffff20}.mc-featured:before{content:'';position:absolute;inset:0 auto 0 0;width:3px;background:#e9b95d}.mc-featured.mc-live:before{background:#ed807b}.mc-backdrop{position:absolute;inset:0;z-index:-1}.mc-backdrop img,.mc-backdrop video{width:100%;height:100%;object-fit:cover}.mc-backdrop:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0b1018ed,#0b1018a8,#0b1018ed)}.mc-featured .mc-versus{padding:30px 5%;gap:28px}.mc-featured .mc-team-logo{width:56px;height:56px}.mc-featured .mc-team strong{font-size:17px}.mc-featured .mc-score b{font-size:38px}.mc-featured .mc-score{gap:16px}.mc-featured .mc-match-bottom>span:last-child{color:#edc87e}.mc-list-heading{display:flex;justify-content:space-between;margin:20px 0 10px;color:#929d9a;font-size:9px;letter-spacing:1px}.mc-list-heading>span:last-child{letter-spacing:0}.mc-match-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mc-pagination{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:18px;padding-top:14px;border-top:1px solid #ffffff12;flex-wrap:wrap}.mc-pagination-info{font-size:10px;color:#929e9a;letter-spacing:.3px}.mc-pagination-info strong{color:#e2e5dd;font-weight:700}.mc-pagination-controls{display:flex;align-items:center;gap:6px}.mc-page-btn{display:inline-flex;align-items:center;gap:5px;background:#14181d;border:1px solid #ffffff18;border-radius:6px;color:#c5cec9;font-size:10.5px;font-weight:600;padding:6px 12px;min-height:32px;transition:all .2s}.mc-page-btn:hover:not(:disabled){background:#1c222a;border-color:#eab64b;color:#f7d984}.mc-page-btn:disabled{opacity:.35;cursor:not-allowed}.mc-page-numbers{display:flex;align-items:center;gap:4px}.mc-page-num{min-width:32px;height:32px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;background:#14181d;border:1px solid #ffffff12;color:#a6b0aa;font-size:11px;font-weight:700;transition:all .2s}.mc-page-num:hover:not(.is-active){background:#1c222a;color:#e2e5dd;border-color:#ffffff26}.mc-page-num.is-active{background:#eab64b;border-color:#eab64b;color:#12100a;box-shadow:0 2px 8px rgba(234,182,75,.25)}.mc-page-ellipsis{padding:0 4px;color:#636b68;font-size:11px}.mc-footer{display:flex;justify-content:space-between;color:#86918f;font-size:9px;padding-top:16px}.mc-footer>span:last-child{display:flex;align-items:center;gap:6px}.mc-loading,.mc-empty{padding:48px 20px;text-align:center;color:#a6b0aa;border:1px dashed #ffffff1a;border-radius:8px;font-size:12px}.mc-empty svg{margin:auto;color:#bbac8b}.mc-empty h3{font-size:16px;color:#e2e5dd;margin:12px 0 8px}.mc-empty p{font-size:11px;line-height:1.6}.mc-error{padding:12px;font-size:12px;background:#bc6c4014;color:#efc9aa;margin-bottom:12px}.mc-error button{background:none;border:0;color:#edc87e;margin-left:12px;text-decoration:underline}.mc-section :is(button,select):focus-visible{outline:2px solid #e8bd67;outline-offset:3px}
@media(max-width:850px){.mc-match-grid{grid-template-columns:1fr}.mc-featured .mc-versus{padding:28px 0;gap:18px}}
@media(max-width:600px){.mc-section{padding:24px 0}.mc-shell{padding:0 16px}.mc-header{display:block;margin-bottom:14px}.mc-header h2{font-size:24px}.mc-header h2 span{display:block}.mc-tournament{max-width:none;width:100%;margin-top:16px}.mc-tournament>span{display:none}.mc-stages{gap:18px}.mc-stages button{min-height:44px;font-size:10px}.mc-live-count{display:none}.mc-filters{flex-wrap:wrap;gap:8px;margin:10px 0}.mc-days{width:100%}.mc-days button{min-height:44px}.mc-filters select{min-height:40px;width:100%}.mc-match{padding:12px}.mc-match-top{font-size:8px;gap:8px}.mc-match-top>span:nth-child(2){display:none}.mc-versus,.mc-featured .mc-versus{gap:10px;padding:22px 0}.mc-team,.mc-team-b{flex-direction:column;text-align:center;gap:8px}.mc-team-logo,.mc-featured .mc-team-logo{width:42px;height:42px}.mc-team strong,.mc-featured .mc-team strong{font-size:11px}.mc-team small{font-size:8px;margin-top:3px}.mc-score b,.mc-featured .mc-score b{font-size:28px}.mc-featured .mc-score{gap:10px}.mc-featured{padding:16px 14px}.mc-featured .mc-team-logo{width:50px;height:50px}.mc-match-bottom{font-size:8px}.mc-pagination{flex-direction:column;align-items:center;gap:10px}.mc-pagination-controls{width:100%;justify-content:space-between}.mc-page-num{min-width:28px;height:28px;font-size:10px}.mc-page-btn{padding:5px 8px;font-size:9.5px;min-height:28px}.mc-footer{font-size:8px;gap:8px}.mc-featured .mc-team strong{font-size:12px}}
@media(prefers-reduced-motion:reduce){.mc-section *{transition:none!important}}
`;
