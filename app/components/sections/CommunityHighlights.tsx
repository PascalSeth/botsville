'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRight, ArrowUpRight, Check, X, Brain, Trophy, Play, Users, RotateCcw, LockKeyhole } from 'lucide-react';

export type TriviaFact = {
  id: string
  title: string
  teaser: string
  choices: string[]
  heroSlug?: string | null
  images?: string[]
  category?: string
  totalAttempts?: number
  correctCount?: number
  hasAnswered?: boolean
  userAnswer?: string | null
  isCorrect?: boolean | null
  xpAwarded?: number | null
  correctAnswer?: string | null
  reveal?: string | null
}

export type TriviaState = {
  trivias: TriviaFact[]
  currentIndex: number
  userTotalXp: number
  todayXp: number
  dailyAnswered: number
  dailyLimit: number
  countdown: number | null
  allCompletedToday: boolean
}

export type ClipPost = { id: string; title?: string | null; content: string; author?: { ign: string; photo?: string | null }; mediaUrl?: string | null }
export type Poll = { id: string; question: string }
export type Streamer = { id: string; name: string; platform: string; handle?: string; profileUrl: string; imageUrl?: string | null }


const CATEGORIES: Record<string, string> = { GUESS_THE_HERO: 'Guess the hero', HARDEST_HEROES: 'Hero mastery', FUNNY_FACTS: 'Fun facts', OG_HEROES: 'The originals', POWER_ULTIMATE: 'Ultimate abilities', LORE: 'Land of Dawn lore', SKIN: 'Skins', EMOJI_GUESS: 'Decode the emojis', GENERAL: 'MLBB knowledge' };
const initialState: TriviaState = { trivias: [], currentIndex: 0, userTotalXp: 0, todayXp: 0, dailyAnswered: 0, dailyLimit: 5, countdown: null, allCompletedToday: false };
const nonnegative = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
const safeUrl = (value?: string | null) => { try { const u = new URL(value || ''); return ['http:', 'https:'].includes(u.protocol) ? u.href : null; } catch { return null; } };

function useCommunityData() {
  const { data: session, status } = useSession();
  const account = session?.user?.id || '';
  const [triviaState, setTriviaState] = useState<TriviaState>(initialState);
  const [clip, setClip] = useState<ClipPost | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [triviaError, setTriviaError] = useState<string | null>(null);
  const [triviaAnswerLoading, setTriviaAnswerLoading] = useState(false);
  const generation = useRef(0);
  const submitting = useRef(false);
  const [reload, setReload] = useState(0);
  const readJSON = async (url: string, signal?: AbortSignal) => {
    const res = await fetch(url, { cache: 'no-store', signal });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  };
  useEffect(() => {
    if (status === 'loading') return;
    const controller = new AbortController();
    const version = ++generation.current;
    submitting.current = false; setTriviaAnswerLoading(false); setLoading(true); setTriviaError(null); setTriviaState(initialState);
    void (async () => {
      const results = await Promise.allSettled([
        readJSON('/api/trivia/current', controller.signal), readJSON('/api/polls', controller.signal),
        readJSON('/api/clips/weekly', controller.signal), readJSON('/api/streamers/spotlight', controller.signal),
      ]);
      if (controller.signal.aborted || version !== generation.current) return;
      const trivia = results[0];
      if (trivia.status === 'fulfilled') {
        const data = trivia.value;
        const trivias: TriviaFact[] = (Array.isArray(data?.trivias) ? data.trivias : []).filter((t: TriviaFact) => t && typeof t.id === 'string' && Array.isArray(t.choices));
        const firstUnanswered = trivias.findIndex(t => !t.hasAnswered);
        setTriviaState({
          ...initialState, trivias, currentIndex: firstUnanswered >= 0 ? firstUnanswered : trivias.length,
          userTotalXp: nonnegative(data.userTotalXp), todayXp: nonnegative(data.todayXp), dailyAnswered: nonnegative(data.dailyAnswered), dailyLimit: nonnegative(data.dailyLimit, 5), allCompletedToday: !!data.allCompletedToday
        });
      } else setTriviaError('Trivia couldn’t load. Try again in a moment.');
      setPolls(results[1].status === 'fulfilled' && Array.isArray(results[1].value?.polls) ? results[1].value.polls.slice(0, 1) : []);
      setClip(results[2].status === 'fulfilled' ? results[2].value?.featured?.post ?? null : null);
      setStreamers(results[3].status === 'fulfilled' && Array.isArray(results[3].value?.streamers) ? results[3].value.streamers : []);
      setLoading(false);
    })();
    const gen = generation;
    return () => { controller.abort(); gen.current++; };
  }, [account, status, reload]);

  const handleTriviaAnswer = async (answer: string) => {
    const current = triviaState.trivias[triviaState.currentIndex];
    if (status !== 'authenticated' || !current || current.hasAnswered || submitting.current || triviaState.allCompletedToday || triviaState.dailyAnswered >= triviaState.dailyLimit || !current.choices.includes(answer)) return;
    const version = generation.current;
    submitting.current = true; setTriviaAnswerLoading(true); setTriviaError(null);
    try {
      const res = await fetch(`/api/trivia/${current.id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer }) });
      const data = await res.json();
      if (version !== generation.current) return;
      let result = data;
      let recovered = false;
      if (!res.ok) {
        try { result = typeof data?.error === 'string' ? JSON.parse(data.error) : data?.error; } catch { result = null; }
        if (!result || typeof result.userAnswer !== 'string') throw new Error(typeof result?.message === 'string' ? result.message : typeof data?.error === 'string' && !data.error.startsWith('{') ? data.error : 'Your answer couldn’t be submitted. Please retry.');
        recovered = true;
      }
      if (typeof result?.isCorrect !== 'boolean') throw new Error('The server did not return an answer result. Please retry.');
      const xp = nonnegative(result.xpAwarded);
      setTriviaState(prev => {
        const existing = prev.trivias.find(t => t.id === current.id);
        if (!existing || existing.hasAnswered) return prev;
        return {
          ...prev,
          trivias: prev.trivias.map(t => t.id === current.id ? { ...t, hasAnswered: true, userAnswer: result.userAnswer ?? answer, isCorrect: result.isCorrect, correctAnswer: result.correctAnswer ?? null, reveal: result.reveal ?? null, xpAwarded: xp, totalAttempts: result.totalAttempts ?? t.totalAttempts, correctCount: result.correctCount ?? t.correctCount } : t),
          userTotalXp: recovered ? prev.userTotalXp : nonnegative(result.userTotalXp, prev.userTotalXp + xp),
          todayXp: recovered ? prev.todayXp : nonnegative(result.todayXp, prev.todayXp + xp),
          dailyAnswered: recovered ? prev.dailyAnswered : nonnegative(result.dailyAnswered, prev.dailyAnswered + 1),
        };
      });
      // A previously-recorded answer must not award XP twice. Reconcile totals with the server.
      if (recovered) {
        try {
          const fresh = await readJSON('/api/trivia/current');
          if (version === generation.current) setTriviaState(prev => ({ ...prev, userTotalXp: nonnegative(fresh.userTotalXp, prev.userTotalXp), todayXp: nonnegative(fresh.todayXp, prev.todayXp), dailyAnswered: nonnegative(fresh.dailyAnswered, prev.dailyAnswered), allCompletedToday: !!fresh.allCompletedToday }));
        } catch { /* Preserve the confirmed answer; leave totals unchanged until the next refresh. */ }
      }
    } catch (err) { if (version === generation.current) setTriviaError(err instanceof Error ? err.message : 'Unable to submit your answer. Please retry.'); }
    finally { if (version === generation.current) { submitting.current = false; setTriviaAnswerLoading(false); } }
  };
  const next = () => {
    if (submitting.current) return; setTriviaError(null); setTriviaState(prev => {
      if (!prev.trivias[prev.currentIndex]?.hasAnswered) return prev;
      const nextIndex = prev.trivias.findIndex((t, i) => i > prev.currentIndex && !t.hasAnswered);
      return { ...prev, currentIndex: prev.dailyAnswered >= prev.dailyLimit || prev.allCompletedToday || nextIndex < 0 ? prev.trivias.length : nextIndex, countdown: null };
    });
  };
  return { triviaState, clip, polls, streamers, loading, triviaError, triviaAnswerLoading, handleTriviaAnswer, next, retry: () => setReload(n => n + 1) };
}

function QuestionImage({ src }: { src: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isFailed = !src || failedSrc === src;
  return isFailed ? <p className="ch-image-error">Question image unavailable. Try refreshing before answering.</p> : <div className="ch-question-image"><Image key={src} src={src} alt="Trivia image clue" fill sizes="(max-width: 760px) 90vw, 600px" onError={() => setFailedSrc(src)} /></div>;
}

export function TriviaCinematicStage({ triviaState, imageUrl, onAnswer, onSkip, error, answerLoading }: {
  triviaState: TriviaState; imageUrl: string | null; onAnswer: (answer: string) => void; onSkip: () => void; error: string | null; answerLoading: boolean;
}) {
  const { status } = useSession();
  const [selected, setSelected] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const question = triviaState.trivias[triviaState.currentIndex];
  const questionRef = useRef<HTMLHeadingElement>(null);
  const previousQuestion = useRef<string | undefined>(question?.id);
  const [prevQId, setPrevQId] = useState(question?.id);
  if (prevQId !== question?.id) {
    setPrevQId(question?.id);
    setSelected(null);
    setReview(false);
  }
  useEffect(() => {
    if (previousQuestion.current && previousQuestion.current !== question?.id) questionRef.current?.focus();
    previousQuestion.current = question?.id;
  }, [question?.id]);
  const answered = !!question?.hasAnswered;
  const atLimit = triviaState.dailyAnswered >= triviaState.dailyLimit || triviaState.allCompletedToday;
  const completed = (!question && triviaState.trivias.length > 0) || (atLimit && !answered);
  const answeredQuestions = triviaState.trivias.filter(t => t.hasAnswered);
  const correct = answeredQuestions.filter(t => t.isCorrect).length;
  const progress = triviaState.dailyLimit > 0 ? Math.min(100, triviaState.dailyAnswered / triviaState.dailyLimit * 100) : 0;
  const finalQuestion = atLimit || !triviaState.trivias.some((t, i) => i > triviaState.currentIndex && !t.hasAnswered);
  const choices = question?.choices || [];
  const clues = question?.images?.filter(Boolean) || [];
  const displayImages = clues.length ? clues : imageUrl ? [imageUrl] : [];
  return <article className="ch-trivia" aria-label="Daily MLBB trivia">
    <style>{styles}</style>
    <div className="ch-trivia-head"><div className="ch-trivia-label"><Brain size={17} /><span>DAILY TRIVIA</span></div><span className="ch-today-xp">{triviaState.todayXp} <small>XP today</small></span></div>
    <div className="ch-progress-meta"><span>{Math.min(triviaState.dailyAnswered, triviaState.dailyLimit)} of {triviaState.dailyLimit} answered today</span><span>{triviaState.userTotalXp.toLocaleString()} total XP</span></div>
    <div className="ch-progress" role="progressbar" aria-label="Daily trivia progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
    <div className="ch-game-body">
      {completed ? <div className="ch-summary"><span className="ch-trophy"><Trophy size={27} /></span><span className="ch-kicker">ROUND COMPLETE</span><h3>That’s today’s challenge.</h3><p>{answeredQuestions.length ? 'Here’s how you did on the questions in this round.' : 'You’ve reached your daily limit. Come back tomorrow for more.'}</p><div className="ch-summary-stats"><div><strong>{correct}/{answeredQuestions.length}</strong><span>Correct this round</span></div><div><strong>+{triviaState.todayXp}</strong><span>XP today</span></div></div>{answeredQuestions.length > 0 && <button type="button" className="ch-secondary" aria-expanded={review} onClick={() => setReview(v => !v)}><RotateCcw size={13} />{review ? 'Hide answers' : 'Review answers'}</button>}{review && <ol className="ch-review">{answeredQuestions.map(t => <li key={t.id}>{t.isCorrect ? <Check size={15} /> : <X size={15} />}<div><strong>{t.title || t.teaser}</strong><p>Your answer: {t.userAnswer}</p>{t.correctAnswer && <p>Correct answer: {t.correctAnswer}</p>}{t.reveal && <p>{t.reveal}</p>}</div></li>)}</ol>}</div> : !question ? <div className="ch-empty"><Brain size={26} /><h3>No questions just yet.</h3><p>Check back for the next trivia round.</p></div> : <>
        <div className="ch-question-meta"><span>{CATEGORIES[question.category || 'GENERAL'] || 'MLBB knowledge'}</span><span>QUESTION {String(triviaState.currentIndex + 1).padStart(2, '0')}</span></div>
        <h3 ref={questionRef} tabIndex={-1} className="ch-question-title">{question.title || 'How well do you know MLBB?'}</h3>
        {question.teaser && <p className={question.category === 'EMOJI_GUESS' ? 'ch-emoji' : 'ch-question-teaser'}>{question.teaser}</p>}
        {displayImages.length > 0 && <div className="ch-clues">{displayImages.map((src, i) => <QuestionImage key={`${src}-${i}`} src={src} />)}</div>}
        <fieldset className="ch-choices" disabled={answerLoading || answered || status !== 'authenticated'}><legend className="ch-sr">Choose your answer</legend>{choices.map((choice, i) => {
          const isPicked = answered ? question.userAnswer === choice : selected === choice;
          const isRight = answered && question.correctAnswer === choice;
          const isWrong = answered && isPicked && question.isCorrect === false;
          return <label key={`${i}-${choice}`} className={`ch-choice ${isPicked ? 'is-selected' : ''} ${isRight || answered && isPicked && question.isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`}>
            <input type="radio" name={`trivia-${question.id}`} value={choice} checked={isPicked} onChange={() => setSelected(choice)} />
            <span className="ch-letter">{String.fromCharCode(65 + i)}</span><span className="ch-choice-text">{choice}{answered && (isRight || isPicked) && <small>{isRight ? 'Correct answer' : question.isCorrect ? 'Your answer · Correct' : 'Your answer'}</small>}</span>
            {(isRight || answered && isPicked && question.isCorrect) ? <Check size={16} /> : isWrong ? <X size={16} /> : <span className="ch-radio" />}
          </label>;
        })}</fieldset>
        {error && <p className="ch-answer-error" role="alert">{error}</p>}
        {answered ? <><div className={`ch-answer-feedback ${question.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status"><div><strong>{question.isCorrect ? 'You got it.' : question.isCorrect === false ? 'Not quite — now you know.' : 'Answer recorded.'}</strong>{question.xpAwarded != null && <span>+{question.xpAwarded} XP</span>}</div>{question.correctAnswer && <p>Correct answer: <b>{question.correctAnswer}</b></p>}{question.reveal && <p>{question.reveal}</p>}</div><div className="ch-question-actions"><span>{nonnegative(question.totalAttempts) > 0 && `${Math.round(Math.min(100, nonnegative(question.correctCount) / nonnegative(question.totalAttempts) * 100))}% answered correctly`}</span><button className="ch-primary" type="button" onClick={onSkip} disabled={answerLoading}>{finalQuestion ? 'See my results' : 'Next question'}<ArrowRight size={15} /></button></div></> : <div className="ch-question-actions"><span>{status === 'authenticated' ? selected ? 'Ready? Lock in your answer.' : 'Choose one answer to continue.' : 'Log in to play and earn XP.'}</span>{status === 'authenticated' ? <button className="ch-primary" type="button" disabled={selected === null || answerLoading || !choices.length} onClick={() => selected !== null && onAnswer(selected)}>{answerLoading ? 'Checking…' : 'Lock answer'}<LockKeyhole size={13} /></button> : <Link className="ch-primary" href="/login?callbackUrl=%2F%23community-highlights">{status === 'loading' ? 'Checking session…' : 'Log in to play'}<ArrowRight size={14} /></Link>}</div>}
      </>}
    </div>
  </article>;
}

export function MissionControlSidebar({ clip, polls, streamers }: { clip: ClipPost | null; polls: Poll[]; streamers: Streamer[] }) {
  const [playing, setPlaying] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [prevClipId, setPrevClipId] = useState(clip?.id);
  if (prevClipId !== clip?.id) {
    setPrevClipId(clip?.id);
    setPlaying(false);
    setMediaFailed(false);
  }
  const media = safeUrl(clip?.mediaUrl);
  const directVideo = media && /\.(mp4|webm|ogg)(?:[?#]|$)/i.test(media);
  return <aside className="ch-sidebar" aria-label="Around the community"><style>{styles}</style>
    <section className="ch-side-card"><div className="ch-side-heading"><span>CLIP OF THE WEEK</span><Play size={14} /></div>{clip ? <><h3>{clip.title || 'From the community'}</h3>{clip.author?.ign && <p className="ch-byline">Shared by {clip.author.ign}</p>}<p className="ch-clip-copy">{clip.content}</p>{playing && directVideo && !mediaFailed ? <video className="ch-clip-video" src={media!} controls autoPlay playsInline onError={() => setMediaFailed(true)} /> : directVideo && !mediaFailed ? <button className="ch-play" type="button" onClick={() => setPlaying(true)}><Play size={16} />Play the clip<ArrowUpRight size={14} /></button> : media ? <a className="ch-side-link" href={media} target="_blank" rel="noopener noreferrer">Watch clip<ArrowUpRight size={14} /></a> : null}{mediaFailed && <p className="ch-byline">Preview unavailable. Open the clip to watch.</p>}</> : <p className="ch-side-empty">The next featured play could be yours.</p>}<Link className="ch-side-link" href="/community">Explore community clips<ArrowRight size={13} /></Link></section>
    <section className="ch-side-card"><div className="ch-side-heading"><span>YOUR TAKE</span><Users size={14} /></div><h3>{polls[0]?.question || 'What’s the community saying?'}</h3><Link className="ch-side-link" href="/polls">{polls[0] ? 'Vote in the poll' : 'Explore community polls'}<ArrowRight size={13} /></Link></section>
    <section className="ch-side-card"><div className="ch-side-heading"><span>CREATOR SPOTLIGHT</span><ArrowUpRight size={14} /></div>{streamers.length ? <div className="ch-creators">{streamers.slice(0, 3).map(s => { const url = safeUrl(s.profileUrl); return url ? <a key={s.id} href={url} target="_blank" rel="noopener noreferrer"><span className="ch-avatar">{s.name.charAt(0)}</span><span><strong>{s.name}</strong><small>{s.platform}</small></span><ArrowUpRight size={14} /></a> : null; })}</div> : <p className="ch-side-empty">More creators coming soon.</p>}</section>
  </aside>;
}

export function CommunityHighlights() {
  const data = useCommunityData();
  return <section id="community-highlights" className="ch-section" aria-labelledby="ch-heading"><style>{styles}</style><div className="ch-shell">
    <header className="ch-header"><div><span className="ch-kicker">BETWEEN MATCHES</span><h2 id="ch-heading">Know the game. <span>Join the conversation.</span></h2></div><Link href="/community">Community hub<ArrowUpRight size={15} /></Link></header>
    <div className="ch-layout">{data.loading ? <div className="ch-loading" role="status"><Brain size={23} /><span>Getting today’s challenge ready…</span></div> : data.triviaError && !data.triviaState.trivias.length ? <div className="ch-loading"><p role="alert">{data.triviaError}</p><button type="button" className="ch-primary" onClick={data.retry}>Try again<RotateCcw size={14} /></button></div> : <TriviaCinematicStage triviaState={data.triviaState} imageUrl={null} onAnswer={data.handleTriviaAnswer} onSkip={data.next} error={data.triviaError} answerLoading={data.triviaAnswerLoading} />}
      <MissionControlSidebar clip={data.clip} polls={data.polls} streamers={data.streamers} />
    </div>
  </div></section>;
}

const styles = `
.ch-section{background:#0a0c10;color:#e9eee7;padding:32px 0;scroll-margin-top:72px;font-family:Arial,Helvetica,sans-serif}.ch-shell{max-width:1180px;margin:auto;padding:0 24px}.ch-header{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:22px}.ch-kicker{display:block;font-size:9px;letter-spacing:1.6px;color:#c4b38b}.ch-header h2{font-size:27px;line-height:1.25;letter-spacing:-.9px;margin:8px 0 0;font-weight:700}.ch-header h2 span{color:#929e9a}.ch-header>a{display:flex;gap:8px;align-items:center;font-size:11px;min-height:44px;color:#c6d0c9;text-decoration:none;white-space:nowrap}.ch-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(260px,1fr);align-items:start;gap:18px}.ch-trivia,.ch-sidebar,.ch-loading{box-sizing:border-box;color:#e9eee7;font-family:Arial,Helvetica,sans-serif;min-width:0}.ch-trivia *,.ch-sidebar *{box-sizing:border-box}.ch-trivia button,.ch-sidebar button,.ch-loading button{font:inherit;cursor:pointer}.ch-trivia{border:1px solid #ffffff20;border-radius:12px;overflow:hidden;background:#121820}.ch-trivia-head{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:20px 24px 14px}.ch-trivia-label{display:flex;align-items:center;gap:10px;color:#dfc58d;font-size:10px;letter-spacing:1.3px;font-weight:700}.ch-today-xp{font-size:20px;font-weight:700;color:#f0ce8a;font-variant-numeric:tabular-nums}.ch-today-xp small{font-size:9px;font-weight:400;color:#a9b3ac;margin-left:4px}.ch-progress-meta{display:flex;justify-content:space-between;gap:12px;padding:0 24px 10px;font-size:9px;color:#9eaba4}.ch-progress{height:3px;background:#263039;margin:0 24px}.ch-progress>span{display:block;background:#e9bd6e;height:100%;transition:width .35s ease}.ch-game-body{padding:24px}.ch-question-meta{display:flex;justify-content:space-between;align-items:center;gap:12px;color:#b4c1ba;font-size:9px}.ch-question-meta>span:first-child{border:1px solid #ffffff16;background:#ffffff04;border-radius:4px;padding:5px 8px}.ch-question-meta>span:last-child{color:#87988f;letter-spacing:1px}.ch-question-title{font-size:23px;font-weight:700;letter-spacing:-.6px;line-height:1.3;margin:17px 0 10px;outline:none}.ch-question-title:focus-visible{outline:2px solid #eac378;outline-offset:4px}.ch-question-teaser{font-size:12px;line-height:1.7;color:#b2c0b7;margin:0 0 20px}.ch-emoji{font-size:34px;line-height:1.6;letter-spacing:5px;margin:12px 0 20px;overflow-wrap:anywhere}.ch-clues{display:flex;overflow-x:auto;gap:10px;scroll-snap-type:x mandatory;margin:12px 0 18px;padding-bottom:5px}.ch-question-image{position:relative;min-width:min(100%,240px);flex:1;min-height:150px;height:180px;border:1px solid #ffffff12;border-radius:8px;background:#0c1218;scroll-snap-align:start}.ch-question-image img{object-fit:contain}.ch-image-error{font-size:12px;line-height:1.5;color:#edc091}.ch-choices{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:20px 0 0;padding:0;border:0;min-width:0}.ch-choice{position:relative;display:flex;align-items:center;gap:10px;min-height:62px;padding:11px;border:1px solid #ffffff18;background:#19212a;border-radius:7px;cursor:pointer;transition:background .15s,border-color .15s}.ch-choice:hover{border-color:#b7a06c;background:#202a32}.ch-choice input{position:absolute;opacity:0;inset:0;width:100%;height:100%;margin:0;cursor:pointer}.ch-choice:has(input:focus-visible){outline:2px solid #f3d392;outline-offset:3px}.ch-letter{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:25px;height:25px;font-size:10px;border:1px solid #ffffff1c;border-radius:5px;color:#a9b8ae}.ch-choice-text{font-size:12px;color:#dce5dc;line-height:1.4;flex:1;min-width:0;overflow-wrap:anywhere}.ch-choice-text small{display:block;font-size:8px;color:inherit;opacity:.85;margin-top:5px}.ch-radio{width:12px;height:12px;border:1px solid #83948970;border-radius:50%;flex-shrink:0}.ch-choice>svg{flex-shrink:0}.ch-choice.is-selected{border-color:#e4b96b;background:#e8ba5b0d}.ch-choice.is-selected .ch-letter{color:#f3d392;border-color:#e4b96b80}.ch-choice.is-selected .ch-radio{border:3px solid #e4b96b;background:#fff}.ch-choice.is-correct{border-color:#6cb78d;background:#61b48614;color:#9cdbb4}.ch-choice.is-wrong{border-color:#ca8580;background:#d37f7810;color:#efb8b1}.ch-choices:disabled .ch-choice{cursor:default}.ch-choices:disabled input{cursor:default}.ch-answer-feedback{margin-top:16px;padding:14px 16px;border:1px solid #ffffff20;border-radius:7px;background:#1c2925}.ch-answer-feedback.is-wrong{background:#27221f}.ch-answer-feedback>div{display:flex;justify-content:space-between;gap:10px;align-items:center}.ch-answer-feedback strong{font-size:13px;color:#cfdfd1}.ch-answer-feedback>div>span{font-size:11px;color:#edc87e;font-weight:700;white-space:nowrap}.ch-answer-feedback p{font-size:11px;color:#b8c6bb;line-height:1.7;margin:8px 0 0}.ch-answer-feedback b{color:#e2e9dc}.ch-answer-error{color:#edb7ac;font-size:12px;line-height:1.6;padding:10px 0;margin:0}.ch-question-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:18px}.ch-question-actions>span{font-size:10px;color:#9cafa1;line-height:1.6;max-width:220px}.ch-primary{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:44px;padding:11px 16px;border:1px solid #eabf71;border-radius:6px;background:#eabf71;color:#231d11;font-size:11px!important;font-weight:700!important;text-decoration:none;flex-shrink:0}.ch-primary:hover:not(:disabled){background:#f2d197}.ch-primary:disabled{opacity:.45;cursor:not-allowed}.ch-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 14px;background:none;border:1px solid #ffffff24;color:#d5dfd1;border-radius:6px;font-size:11px!important}.ch-summary{text-align:center;padding:10px 0}.ch-trophy{display:flex;justify-content:center;align-items:center;width:56px;height:56px;border:1px solid #eabf7135;border-radius:50%;margin:0 auto 20px;color:#eabf71;background:#eabf710a}.ch-summary h3{font-size:24px;line-height:1.25;letter-spacing:-.7px;margin:12px 0}.ch-summary>p,.ch-empty p{font-size:12px;line-height:1.7;color:#a7b8ab;max-width:340px;margin:0 auto}.ch-summary-stats{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ffffff16;border-radius:8px;margin:22px 0 18px;padding:20px 0}.ch-summary-stats>div+div{border-left:1px solid #ffffff16}.ch-summary-stats strong{display:block;font-size:25px;color:#e9cc97}.ch-summary-stats span{display:block;font-size:10px;color:#a7b5ac;margin-top:7px}.ch-review{list-style:none;padding:0;margin:18px 0 0;text-align:left}.ch-review li{display:flex;align-items:start;gap:12px;border-top:1px solid #ffffff12;padding:14px 0}.ch-review svg{flex-shrink:0;margin-top:3px;color:#d8bf92}.ch-review strong{font-size:12px;line-height:1.5}.ch-review p{font-size:11px;line-height:1.7;color:#abbbae;margin:5px 0 0}.ch-empty{padding:38px 12px;text-align:center}.ch-empty svg{margin:auto;color:#c6b28b}.ch-empty h3{font-size:21px;margin:16px 0 10px}.ch-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.ch-sidebar{display:flex;flex-direction:column;gap:12px}.ch-side-card{border:1px solid #ffffff12;border-radius:10px;background:#10161c;padding:18px}.ch-side-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:8px;letter-spacing:1.5px;color:#a9b5ab;margin-bottom:13px}.ch-side-heading svg{color:#baa67c}.ch-side-card h3{font-size:15px;font-weight:600;line-height:1.45;letter-spacing:-.2px;margin:0 0 7px}.ch-byline{font-size:9px;line-height:1.5;color:#9cafa1;margin:0 0 10px}.ch-clip-copy{font-size:11px;line-height:1.7;color:#acb9af;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:0 0 12px}.ch-side-link{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;font-size:10px;color:#d5c196;text-decoration:none;border-top:1px solid #ffffff0c;margin-top:9px;padding-top:5px}.ch-side-link:hover{color:#f1d395}.ch-play{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:48px;border:1px solid #ffffff18;border-radius:6px;background:#1e2930;color:#dce3d8;font-size:11px!important}.ch-play svg:first-child{margin-left:10px}.ch-play svg:last-child{margin-right:10px}.ch-clip-video{width:100%;max-height:240px;display:block;border-radius:6px;background:#000}.ch-side-empty{font-size:11px;line-height:1.6;color:#9dafa2;margin:0}.ch-creators a{display:flex;align-items:center;gap:10px;min-height:52px;color:#c5d0c5;text-decoration:none;border-top:1px solid #ffffff0c}.ch-creators a:first-child{border-top:0}.ch-creators a>span:nth-child(2){flex:1;min-width:0}.ch-creators strong{display:block;font-size:11px;overflow-wrap:anywhere}.ch-creators small{display:block;font-size:9px;margin-top:4px;color:#9bafa0}.ch-avatar{width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#24312d;border:1px solid #ffffff10;font-size:11px;color:#c2d0bf;flex-shrink:0}.ch-loading{min-height:300px;display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;background:#121820;border:1px solid #ffffff18;border-radius:12px;font-size:12px;padding:24px;text-align:center}.ch-loading svg{color:#e6c48d}.ch-section :is(button,a):focus-visible,.ch-trivia :is(button,a):focus-visible,.ch-sidebar :is(button,a):focus-visible{outline:2px solid #eac378;outline-offset:3px}
@media(max-width:900px){.ch-layout{grid-template-columns:minmax(0,1fr) 280px;gap:12px}.ch-trivia-head{padding:18px 18px 12px}.ch-progress-meta{padding:0 18px 10px}.ch-progress{margin:0 18px}.ch-game-body{padding:20px 18px}.ch-choices{grid-template-columns:1fr}.ch-question-title{font-size:21px}.ch-header h2{font-size:24px}.ch-header h2 span{display:block}.ch-question-actions{flex-wrap:wrap}}
@media(max-width:700px){.ch-section{padding:24px 0}.ch-shell{padding:0 16px}.ch-header{align-items:start;gap:14px;margin-bottom:18px}.ch-header h2{font-size:22px}.ch-header>a{font-size:9px;gap:5px;white-space:normal;max-width:95px;line-height:1.5}.ch-layout{grid-template-columns:minmax(0,1fr)}.ch-sidebar{gap:10px}.ch-trivia-head{padding:16px 16px 12px}.ch-trivia-label{font-size:9px;letter-spacing:1px}.ch-today-xp{font-size:18px}.ch-progress-meta{padding:0 16px 10px;font-size:8px}.ch-progress{margin:0 16px}.ch-game-body{padding:18px 16px}.ch-question-title{font-size:20px}.ch-question-teaser{font-size:12px}.ch-choice{min-height:56px;padding:11px}.ch-question-actions{align-items:stretch;gap:10px}.ch-question-actions>span{max-width:none;flex-basis:100%;font-size:10px}.ch-question-actions>.ch-primary{width:100%}.ch-emoji{font-size:30px;letter-spacing:3px}.ch-summary h3{font-size:22px}.ch-side-card{padding:16px}.ch-question-image{height:160px}.ch-question-meta{font-size:8px}.ch-choice-text{font-size:12px}}
@media(prefers-reduced-motion:reduce){.ch-trivia *,.ch-sidebar *{transition:none!important}}
`;
