'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Eye, EyeOff, ChevronRight, AlertCircle } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
type Mode = 'login' | 'register';

// ── Roles ──────────────────────────────────────────────────
const ROLES = ['EXP', 'ROAM', 'GOLD', 'JUNGLE', 'MID'] as const;
type PlayerRole = typeof ROLES[number];

const ROLE_CONFIG: Record<PlayerRole, {
  color: string;
  glow: string;
  label: string;
  desc: string;
  img: string;       // ← swap with your real imports: e.g. '/roles/exp.png'
}> = {
  EXP:    { color: '#a855f7', glow: 'rgba(168,85,247,0.6)',  label: 'EXP',    desc: 'Experience Lane',  img: '/roles/exp.jpg'    },
  ROAM:   { color: '#06b6d4', glow: 'rgba(6,182,212,0.6)',   label: 'ROAM',   desc: 'Roam / Support',   img: '/roles/roam.jpg'   },
  GOLD:   { color: '#e8a000', glow: 'rgba(232,160,0,0.6)',   label: 'GOLD',   desc: 'Gold Lane',        img: '/roles/gold.jpg'   },
  JUNGLE: { color: '#22c55e', glow: 'rgba(34,197,94,0.6)',   label: 'JUNGLE', desc: 'Jungle',           img: '/roles/jungle.jpg' },
  MID:    { color: '#3b82f6', glow: 'rgba(59,130,246,0.6)',  label: 'MID',    desc: 'Mid Lane',         img: '/roles/mid.jpg'    },
};

// ── Animated background particles ─────────────────────────
const Particles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 60;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      alpha: Math.random() * 0.5 + 0.1,
      color: ['#e8a000', '#a855f7', '#06b6d4', '#22c55e', '#3b82f6'][Math.floor(Math.random() * 5)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
        if (p.x < -4) p.x = canvas.width + 4;
        if (p.x > canvas.width + 4) p.x = -4;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ── Scanline overlay ───────────────────────────────────────
const Scanlines = () => (
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.03]"
    style={{
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)',
      backgroundSize: '100% 4px',
    }}
  />
);

// ── Noise texture overlay ──────────────────────────────────
const Noise = () => (
  <div
    className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '128px',
    }}
  />
);

// Mobile-only background video: low-contrast, blurred, and non-interactive.
const MobileBgVideo = () => (
  <div className="absolute inset-0 lg:hidden pointer-events-none overflow-hidden" aria-hidden="true">
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      className="w-full h-full object-cover opacity-30 filter blur-sm scale-105"
      style={{ transformOrigin: 'center' }}
    >
      <source src="/gif/heros2.mp4" type="video/mp4" />
    </video>
    <div className="absolute inset-0 bg-black/30" />
  </div>
);

// ── Glowing orbs in bg ─────────────────────────────────────
const GlowOrbs = () => (
  <>
    <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse" style={{ background: '#e8a000', animationDuration: '4s' }} />
    <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-8 blur-3xl animate-pulse" style={{ background: '#a855f7', animationDuration: '6s', animationDelay: '1s' }} />
    <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-8 blur-3xl animate-pulse" style={{ background: '#06b6d4', animationDuration: '5s', animationDelay: '2s' }} />
  </>
);

// ── Field ──────────────────────────────────────────────────
const Field = ({
  label, type = 'text', placeholder, value, onChange, right,
}: {
  label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; right?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.78)' }}>{label}</label>
    <div className="relative group">
      {/* Animated border bottom */}
      <div
        className="absolute bottom-0 left-0 h-[1px] w-0 group-focus-within:w-full transition-all duration-500"
        style={{ background: 'linear-gradient(90deg, #e8a000, #a855f7)' }}
      />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="auth-input w-full text-white text-sm px-0 py-2.5 outline-none tracking-wide placeholder:text-white/40 transition-all duration-300 pr-8"
        style={{
          background: 'transparent',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      />
      {right && <div className="absolute right-0 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  </div>
);

// ── Role Card ──────────────────────────────────────────────
const RoleCard = ({
  role, selected, onSelect,
}: { role: PlayerRole; selected: boolean; onSelect: () => void }) => {
  const cfg = ROLE_CONFIG[role];
  const [hovered, setHovered] = useState(false);
  const active = selected || hovered;

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col items-center gap-1.5 p-2 transition-all duration-300 overflow-hidden group"
      style={{
        border: `1px solid ${active ? cfg.color + '80' : 'rgba(255,255,255,0.05)'}`,
        background: selected
          ? `linear-gradient(135deg, ${cfg.color}18, ${cfg.color}08)`
          : hovered
          ? `${cfg.color}0a`
          : 'transparent',
        boxShadow: selected ? `0 0 20px ${cfg.color}30, inset 0 0 20px ${cfg.color}08` : 'none',
      }}
    >
      {/* Corner accents */}
      {selected && (
        <>
          <span className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: cfg.color }} />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: cfg.color }} />
        </>
      )}

      {/* Role image */}
      <div
        className="relative w-10 h-10 rounded-full overflow-hidden transition-all duration-300"
        style={{
          filter: active ? `drop-shadow(0 0 8px ${cfg.color})` : 'brightness(0.4)',
          transform: selected ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {/* Placeholder ring — shows until image loads */}
        <div
          className="absolute inset-0 rounded-full border opacity-30"
          style={{ borderColor: cfg.color }}
        />
        <Image
          src={cfg.img}
          alt={cfg.label}
          fill
          className="object-cover object-top"
          onError={(e) => {
            // Fallback: show initial letter if image missing
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Fallback text shown behind image */}
        <span
          className="absolute inset-0 flex items-center justify-center font-black text-[11px]"
          style={{ color: cfg.color }}
        >
          {cfg.label[0]}
        </span>
      </div>

      {/* Label */}
      <span
        className="text-[9px] font-black tracking-[0.2em] uppercase transition-colors duration-200"
        style={{ color: active ? cfg.color : 'rgba(255,255,255,0.85)' }}
      >
        {cfg.label}
      </span>

      {/* Desc */}
      <span
        className="text-[8px] tracking-wide transition-colors duration-200 leading-none text-center"
        style={{ color: active ? cfg.color + 'cc' : 'rgba(255,255,255,0.62)' }}
      >
        {cfg.desc}
      </span>

      {/* Glow flash on select */}
      {selected && (
        <div
          className="absolute inset-0 pointer-events-none animate-ping opacity-0"
          style={{ background: `radial-gradient(circle, ${cfg.color}20, transparent)` }}
        />
      )}
    </button>
  );
};

// ── Role Selector ──────────────────────────────────────────
const RoleSelector = ({
  selected, onSelect,
}: { selected: PlayerRole | null; onSelect: (r: PlayerRole) => void }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <label className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.78)' }}>Main Role</label>
      {selected && (
        <span className="text-[9px] tracking-wider px-1.5 py-0.5" style={{
          color: ROLE_CONFIG[selected].color,
          border: `1px solid ${ROLE_CONFIG[selected].color}40`,
          background: `${ROLE_CONFIG[selected].color}10`,
        }}>
          {ROLE_CONFIG[selected].desc}
        </span>
      )}
    </div>
    <div className="grid grid-cols-5 gap-1.5">
      {ROLES.map((r) => (
        <RoleCard key={r} role={r} selected={selected === r} onSelect={() => onSelect(r)} />
      ))}
    </div>
  </div>
);

// ── Submit Button ──────────────────────────────────────────
const SubmitBtn = ({ label, loading }: { label: string; loading: boolean }) => (
  <button
    type="submit"
    disabled={loading}
    className="relative w-full py-3 font-black text-[11px] tracking-[0.3em] uppercase overflow-hidden group transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
    style={{ background: 'linear-gradient(90deg, #e8a000, #e86000)', color: '#000' }}
  >
    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(90deg, #ffb800, #ff8c00)' }} />
    <span className="absolute -left-full group-hover:left-full transition-all duration-700 inset-y-0 w-1/3 bg-white/20 skew-x-12 pointer-events-none" />
    <span className="relative flex items-center justify-center gap-2">
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 border border-black/40 border-t-black rounded-full animate-spin" />
          Processing...
        </span>
      ) : (
        <>{label} <ChevronRight size={12} /></>
      )}
    </span>
  </button>
);

// ── Error / Success ────────────────────────────────────────
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 p-3 text-[11px] tracking-wide" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
    <AlertCircle size={12} className="mt-0.5 shrink-0" />
    <span>{message}</span>
  </div>
);

const SuccessMessage = ({ message }: { message: string }) => (
  <div className="p-3 text-[11px] tracking-wide" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
    {message}
  </div>
);

// ── Login Form ─────────────────────────────────────────────
const AUTH_ERRORS: Record<string, string> = {
  Configuration: 'Server configuration error. Please try again later.',
  AccessDenied: 'Access denied. Please check your credentials.',
  Verification: 'Verification failed. Please try again.',
  Default: 'An error occurred. Please try again.',
};

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailOrIgn, setEmailOrIgn] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const urlError = searchParams.get('error');
  const [error, setError] = useState<string | null>(
    urlError ? (AUTH_ERRORS[urlError] || `Authentication error: ${urlError}`) : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (urlError) window.history.replaceState({}, '', '/login');
    setError(null);
    setLoading(true);
    try {
      const result = await signIn('credentials', { emailOrIgn, password, redirect: false });
      if (result?.error) { setError(result.error); setLoading(false); return; }
      if (result?.ok) { router.push('/'); router.refresh(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <ErrorMessage message={error} />}
      <Field label="Email / IGN" placeholder="your@email.com or YourIGN" value={emailOrIgn} onChange={setEmailOrIgn} />
      <Field
        label="Password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
        value={password} onChange={setPassword}
        right={
          <button type="button" onClick={() => setShowPw(!showPw)} className="transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        }
      />
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="accent-[#e8a000] w-3 h-3" />
          <span className="text-[10px] tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.75)' }}>Remember me</span>
        </label>
        <a href="#" className="text-[10px] tracking-widest uppercase transition-colors hover:text-[#e8a000]" style={{ color: 'rgba(255,255,255,0.75)' }}>Forgot?</a>
      </div>
      <SubmitBtn label="Enter the Arena" loading={loading} />
    </form>
  );
};

// Small component that redirects authenticated users away from the login page.
// It uses `useSearchParams` and therefore must be rendered inside a Suspense boundary.
const AuthRedirect = () => {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (status === 'authenticated') {
      const cb = searchParams?.get('callbackUrl') || '/';
      router.push(cb);
    }
  }, [status, router, searchParams]);

  return null;
};

// ── Register Form ──────────────────────────────────────────
const ROLE_MAP: Record<PlayerRole, string> = {
  EXP: 'EXP',
  ROAM: 'ROAM',
  GOLD: 'GOLD',
  JUNGLE: 'JUNGLE',
  MID: 'MID',
};

const RegisterForm = () => {
  const router = useRouter();
  const [ign, setIgn] = useState('');
  const [email, setEmail] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!ign || !email || !password || !confirm || !role) return setError('All fields are required');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    if (ign.length < 3 || ign.length > 20) return setError('IGN must be 3–20 characters');
    if (teamCode && !/^[A-Z0-9]{6}$/.test(teamCode.trim().toUpperCase())) return setError('Team code must be 6 alphanumeric characters');
    setLoading(true);
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ign, mainRole: ROLE_MAP[role], teamCode: teamCode.trim() ? teamCode.trim().toUpperCase() : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return; }
      setSuccess('Account created! Logging you in...');
      const login = await signIn('credentials', { emailOrIgn: email, password, redirect: false });
      if (login?.error) { setError('Account created but login failed. Please log in manually.'); setLoading(false); return; }
      if (login?.ok) { router.push('/'); router.refresh(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}
      <div className="grid grid-cols-2 gap-4">
        <Field label="In-Game Name" placeholder="YourMLBBName" value={ign} onChange={setIgn} />
        <Field label="Email" type="email" placeholder="your@email.com" value={email} onChange={setEmail} />
      </div>
      <Field
        label="Team Code (Optional)" placeholder="A1B2C3"
        value={teamCode}
        onChange={(v) => setTeamCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Password" type={showPw ? 'text' : 'password'} placeholder="min. 8 chars"
          value={password} onChange={setPassword}
          right={
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ color: 'rgba(255,255,255,0.75)' }}>
              {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          }
        />
        <Field label="Confirm" type="password" placeholder="repeat password" value={confirm} onChange={setConfirm} />
      </div>
      <RoleSelector selected={role} onSelect={setRole} />
      <p className="text-[9px] tracking-wide leading-relaxed" style={{ color: 'rgba(255,255,255,0.68)' }}>
        By registering you agree to the Botsville tournament rules and MLBB community guidelines.
      </p>
      <SubmitBtn label="Join the Squad" loading={loading} />
    </form>
  );
};

// ── Left Panel ─────────────────────────────────────────────
const LeftPanel = ({ mode }: { mode: Mode }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => (n + 1) % 5), 3000);
    return () => clearInterval(t);
  }, []);

  const activeRole = ROLES[tick];
  const cfg = ROLE_CONFIG[activeRole];

  return (
    <div className="hidden lg:flex relative flex-col justify-between overflow-hidden" style={{ background: '#050508' }}>
      {/* Background video */}
      <div className="absolute inset-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.15) saturate(0.5)' }}
        >
          <source src="/gif/heros2.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Dynamic role glow */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{ background: `radial-gradient(ellipse 70% 70% at 30% 70%, ${cfg.color}18, transparent 70%)` }}
      />

      <GlowOrbs />
      <Particles />
      <Scanlines />
      <Noise />

      {/* Diagonal slash decorative */}
      <div
        className="absolute right-0 top-0 bottom-0 w-px opacity-20"
        style={{ background: 'linear-gradient(180deg, transparent, #e8a000 30%, #a855f7 70%, transparent)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full p-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-4 group">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: '#e8a000' }}
            />
            <Image src="/mlbb_logobg.png" alt="Botsville" width={48} height={48} className="relative object-contain" />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="font-black text-xl tracking-[0.15em] uppercase text-white"
              style={{ fontFamily: '"Orbitron", "Rajdhani", sans-serif' }}
            >Botsville</span>
            <span
              className="font-semibold text-sm tracking-[0.3em] uppercase"
              style={{ color: '#e8a000', fontFamily: '"Orbitron", sans-serif' }}
            >Ghana</span>
          </div>
        </Link>

        {/* Headline */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 opacity-30" style={{ background: cfg.color }} />
            <span
              className="text-[10px] tracking-[0.4em] uppercase font-bold transition-colors duration-1000"
              style={{ color: cfg.color }}
            >
              {cfg.label} — {cfg.desc}
            </span>
          </div>
          <h2
            className="font-black text-5xl xl:text-6xl leading-none uppercase"
            style={{ fontFamily: '"Orbitron", "Rajdhani", sans-serif', letterSpacing: '-0.02em' }}
          >
            {mode === 'login' ? (
              <><span className="text-white">Welcome</span><br /><span className="text-white">Back,</span><br />
              <span className="transition-colors duration-1000" style={{ color: cfg.color }}>Legend.</span></>
            ) : (
              <><span className="text-white">Join the</span><br /><span className="text-white">Ghana</span><br />
              <span className="transition-colors duration-1000" style={{ color: cfg.color }}>Arena.</span></>
            )}
          </h2>
          <p className="text-sm mt-6 leading-relaxed max-w-[280px]" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {mode === 'login'
              ? 'Your squad is waiting. Log in to track your stats, manage your team, and dominate the leaderboard.'
              : 'Register now to compete in APL & AFL tournaments and represent Ghana on the IESF Africa stage.'}
          </p>
        </div>

        {/* Role strip */}
        <div>
          <p className="text-[9px] tracking-[0.3em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.76)' }}>Tournament Roles</p>
          <div className="flex gap-2">
            {ROLES.map((r) => {
              const c = ROLE_CONFIG[r];
              const isActive = r === activeRole;
              return (
                <div
                  key={r}
                  className="flex-1 py-2 flex flex-col items-center gap-1 transition-all duration-700"
                  style={{
                    border: `1px solid ${isActive ? c.color + '60' : 'rgba(255,255,255,0.04)'}`,
                    background: isActive ? `${c.color}12` : 'transparent',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full border flex items-center justify-center text-[8px] font-black transition-all duration-700"
                    style={{
                      borderColor: isActive ? c.color : 'rgba(255,255,255,0.3)',
                      color: isActive ? c.color : 'rgba(255,255,255,0.82)',
                      boxShadow: isActive ? `0 0 12px ${c.color}60` : 'none',
                    }}
                  >
                    {r[0]}
                  </div>
                  <span className="text-[7px] tracking-widest uppercase" style={{ color: isActive ? c.color : 'rgba(255,255,255,0.72)' }}>
                    {r}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Season badge */}
          <div
            className="mt-6 inline-flex items-center gap-3 px-4 py-2"
            style={{ border: '1px solid rgba(232,160,0,0.2)', background: 'rgba(232,160,0,0.05)' }}
          >
            <span className="text-[9px] tracking-[0.4em] uppercase" style={{ color: '#e8a000' }}>Season 5</span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: '#555' }}>Prize Pool ₵12,800</span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: '#555' }}>6 Teams · 120+ Players</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Mode Tab ───────────────────────────────────────────────
const ModeTab = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex-1 py-4 text-[10px] font-black tracking-[0.3em] uppercase transition-all duration-300 relative"
    style={{ color: active ? '#e8a000' : '#2a2a2a' }}
  >
    {label}
    <span
      className="absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-500"
      style={{
        background: active ? 'linear-gradient(90deg, #e8a000, #a855f7)' : 'transparent',
      }}
    />
  </button>
);

// ── Main ───────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const { status } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    // If user is already authenticated, redirect away from the login page.
    if (status === 'authenticated') {
      // Read callbackUrl from the raw browser URL to avoid using useSearchParams
      // at the top-level (which can cause prerendering issues).
      try {
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        const cb = params.get('callbackUrl') || '/';
        router.push(cb);
      } catch (e) {
        router.push('/');
      }
    }
  }, [status, router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Grotesk:wght@300;400;500;700&display=swap');
        * { font-family: 'Space Grotesk', sans-serif; }
        .auth-input { color: #ffffff !important; caret-color: #ffffff; }
        .auth-input::placeholder { color: rgba(255,255,255,0.4); }
        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus,
        .auth-input:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff;
          transition: background-color 9999s ease-in-out 0s;
          box-shadow: 0 0 0px 1000px transparent inset;
        }
      `}</style>

      <main className="min-h-screen grid lg:grid-cols-[1fr,1fr]" style={{ background: '#07070d' }}>
        <LeftPanel mode={mode} />

        {/* Right Panel */}
        <div className="relative flex flex-col min-h-screen lg:min-h-0">
                  <MobileBgVideo />
                  <Particles />
                  <Noise />

          {/* Mobile header */}
          <div
            className="lg:hidden flex items-center justify-between px-5 py-4 relative z-10"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/mlbb_logobg.png" alt="BOtsvilel" width={34} height={34} className="object-contain" />
              <div className="flex flex-col leading-none">
                <span className="text-white font-black text-sm tracking-widest uppercase">Ghana</span>
                <span className="text-[10px] tracking-widest uppercase" style={{ color: '#e8a000' }}>Nagends</span>
              </div>
            </Link>
            <Link href="/" className="text-[10px] tracking-widest uppercase transition-colors hover:text-white" style={{ color: '#333' }}>← Home</Link>
          </div>

          {/* Form area */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-10">
            <div className="w-full max-w-sm mx-auto lg:max-w-[420px]">

              {/* Top line */}
              <div className="h-px mb-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(232,160,0,0.4), rgba(168,85,247,0.4), transparent)' }} />

              {/* Tabs */}
              <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <ModeTab label="Sign In" active={mode === 'login'} onClick={() => setMode('login')} />
                <ModeTab label="Register" active={mode === 'register'} onClick={() => setMode('register')} />
              </div>

              {/* Heading */}
              <div className="mt-8 mb-7">
                <p className="text-[9px] tracking-[0.35em] uppercase mb-2" style={{ color: '#444' }}>
                  Ghana MLBB Community
                </p>
                <h1
                  className="text-white font-black text-3xl uppercase"
                  style={{ fontFamily: '"Orbitron", sans-serif', letterSpacing: '-0.01em' }}
                >
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </h1>
                <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: '#3a3a4a' }}>
                  {mode === 'login'
                    ? 'Enter your credentials to access your dashboard.'
                    : 'Fill in your details to join the Ghana MLBB community.'}
                </p>
              </div>

              {/* Form */}
              <div key={mode}>
                {mode === 'login' ? (
                  <Suspense fallback={<div className="h-64 animate-pulse rounded" style={{ background: 'rgba(255,255,255,0.02)' }} />}>
                    <AuthRedirect />
                    <LoginForm />
                  </Suspense>
                ) : (
                  <RegisterForm />
                )}
              </div>

              {/* Switch mode */}
              <p className="text-[11px] tracking-wide mt-7 text-center" style={{ color: '#2a2a2a' }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="font-bold transition-colors hover:text-white"
                  style={{ color: '#e8a000' }}
                >
                  {mode === 'login' ? 'Register →' : 'Login →'}
                </button>
              </p>

              {/* Bottom line */}
              <div className="h-px mt-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(232,160,0,0.15), transparent)' }} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}