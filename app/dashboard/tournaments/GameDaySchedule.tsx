'use client';

import { useState } from 'react';
import { gameWeeks, planGameDates, weeklyGameDates, type MatchdayConfig } from '@/lib/tournament-schedule';
import styles from './game-day-schedule.module.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function GameDaySchedule({ config, totalMatches, onChange, estimated = false }: {
  config: MatchdayConfig; totalMatches: number; onChange: (patch: Partial<MatchdayConfig>) => void; estimated?: boolean;
}) {
  const [page, setPage] = useState(0);
  let schedule: ReturnType<typeof planGameDates> | null = null;
  let error = '';
  try { schedule = planGameDates(config, totalMatches); }
  catch (err) { error = err instanceof Error ? err.message : 'Check the game dates.'; }
  const requiredDays = Number.isInteger(config.matchesPerDay) && config.matchesPerDay > 0 ? Math.ceil(totalMatches / config.matchesPerDay) : 0;
  const custom = config.playDates !== undefined;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(requiredDays / 14) - 1));
  function fillDates() {
    onChange({ playDates: weeklyGameDates({ ...config, playDays: config.playDays.length ? config.playDays : [0, 1, 2, 3, 4, 5, 6] }, requiredDays) });
    setPage(0);
  }

  return <div className={styles.schedule}>
    <label className={styles.field}>Fixtures per game day<input type="number" min={1} max={48} value={config.matchesPerDay} onChange={event => onChange({ matchesPerDay: Number(event.target.value) })} /></label>
    <p className={styles.help}>{totalMatches} fixtures · {requiredDays} game days{estimated ? ' at full capacity' : ''}{totalMatches % config.matchesPerDay > 0 ? ` · Final day: ${totalMatches % config.matchesPerDay} fixtures` : ''}</p>
    <div className={styles.modes} aria-label="Game date selection">
      <button type="button" aria-pressed={!custom} onClick={() => onChange({ playDates: undefined, playDays: config.playDays.length ? config.playDays : [5, 6, 0] })}>Repeat weekdays</button>
      <button type="button" aria-pressed={custom} onClick={() => { if (!custom) fillDates(); }}>Choose each date</button>
    </div>
    {!custom ? <div className={styles.weekdays} aria-label="Weekly game days">{DAYS.map((day, index) => <button type="button" key={day} aria-pressed={config.playDays.includes(index)} onClick={() => onChange({ playDays: config.playDays.includes(index) ? config.playDays.filter(d => d !== index) : [...config.playDays, index].sort() })}>{day}</button>)}</div> : <>
      <p className={styles.help}>Set a date for each game day. Each week can have a different number of game days. Unselected dates are rest days.</p>
      <div className={styles.dates}>{Array.from({ length: Math.min(14, Math.max(0, requiredDays - currentPage * 14)) }, (_, offset) => {
        const index = currentPage * 14 + offset;
        return <label className={styles.field} key={index}>Game day {index + 1}<input type="date" aria-label={`Date for game day ${index + 1}`} min={config.startDate.slice(0, 10)} max="2200-12-31" value={config.playDates?.[index] ?? ''} onChange={event => {
          const dates = Array.from({ length: requiredDays }, (_, i) => config.playDates?.[i] ?? '');
          dates[index] = event.target.value;
          onChange({ playDates: dates });
        }} /></label>;
      })}</div>
      {requiredDays > 14 && <div className={styles.pager}><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Earlier days</button><span>{currentPage + 1} / {Math.ceil(requiredDays / 14)}</span><button type="button" disabled={(currentPage + 1) * 14 >= requiredDays} onClick={() => setPage(currentPage + 1)}>Later days</button></div>}
      <button className={styles.refill} type="button" onClick={fillDates}>Refill dates from weekly pattern</button>
    </>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {schedule?.issues.map(issue => <p className={styles.error} role="alert" key={issue}>{issue}</p>)}
    {schedule && !schedule.issues.length && schedule.endDate && <div className={styles.summary} aria-live="polite">
      <strong>{estimated ? 'Estimated ending date' : 'Ending date'}: <time dateTime={schedule.endDate}>{dateLabel(schedule.endDate)}</time></strong>
      <ul>{gameWeeks(schedule.dates).map(week => <li key={week.start}>Week of {new Date(`${week.start}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}<span>{week.days} game {week.days === 1 ? 'day' : 'days'}</span></li>)}</ul>
    </div>}
  </div>;
}
