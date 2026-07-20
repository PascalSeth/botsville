'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Eye, EyeOff, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
type Mode = 'login' | 'register' | 'reset-request';

// ── Roles ──────────────────────────────────────────────────
const ROLES = ['EXP', 'ROAM', 'GOLD', 'JUNGLE', 'MID'] as const;
type PlayerRole = typeof ROLES[number];

const ROLE_CONFIG: Record<PlayerRole, {
  color: string;
  glow: string;
  label: string;
  desc: string;
  img: string;
}> = {
  EXP:    { color: '#a855f7', glow: 'rgba(168,85,247,0.6)',  label: 'EXP',    desc: 'Experience Lane',  img: '/roles/exp.jpg'    },
  ROAM:   { color: '#06b6d4', glow: 'rgba(6,182,212,0.6)',   label: 'ROAM',   desc: 'Roam / Support',   img: '/roles/roam.jpg'   },
  GOLD:   { color: '#e8a000', glow: 'rgba(232,160,0,0.6)',   label: 'GOLD',   desc: 'Gold Lane',        img: '/roles/gold.jpg'   },
  JUNGLE: { color: '#22c55e', glow: 'rgba(34,197,94,0.6)',   label: 'JUNGLE', desc: 'Jungle',           img: '/roles/jungle.jpg' },
  MID:    { color: '#3b82f6', glow: 'rgba(59,130,246,0.6)',  label: 'MID',    desc: 'Mid Lane',         img: '/roles/mid.jpg'    },
};

// ── Animated background particles ─────────────────────────
const Particles = React.memo(function Particles({ activeColor }: { activeColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    let raf: number;
    let resizeTimeout: NodeJS.Timeout;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 300);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    const COUNT = 25; // Reduced from 50 for better performance
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -Math.random() * 0.3 - 0.1,
      alpha: Math.random() * 0.4 + 0.1,
      isAccent: Math.random() > 0.75,
    }));

    let frameCount = 0;
    const draw = () => {
      frameCount++;
      // Only redraw every 2 frames for better performance
      if (frameCount % 2 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.isAccent ? activeColor + Math.round(p.alpha * 255).toString(16).padStart(2, '0') : `rgba(255,255,255,${p.alpha})`;
          ctx.fill();
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
          if (p.x < -4) p.x = canvas.width + 4;
          if (p.x > canvas.width + 4) p.x = -4;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); clearTimeout(resizeTimeout); window.removeEventListener('resize', handleResize); };
  }, [activeColor]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
});

// ── Scanline overlay ───────────────────────────────────────
const Scanlines = React.memo(function Scanlines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.02] z-0"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)',
        backgroundSize: '100% 6px',
        willChange: 'auto',
      }}
    />
  );
});

// ── Unified Fullscreen Video Background ────────────────────
const ImmersiveBackground = React.memo(function ImmersiveBackground() {
  const [ok, setOk] = useState(true);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#050508]" aria-hidden="true">
      {ok ? (
        <video
          src="/vid/login.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onError={() => setOk(false)}
          className="w-full h-full object-cover scale-105"
          style={{
            filter: 'brightness(0.85) saturate(1.2) contrast(1.1)',
            animation: 'cine-kenburns 40s ease-in-out infinite alternate',
            transformOrigin: 'center',
            willChange: 'transform',
          }}
        />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage: "url('/gif/heros2.jpg')",
            filter: 'brightness(0.7) saturate(1.2)',
            animation: 'cine-kenburns 40s ease-in-out infinite alternate',
            willChange: 'transform',
          }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/70 via-transparent to-[#050508]/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_120%)]" />
    </div>
  );
});

// ── Glowing orbs in bg ─────────────────────────────────────
const GlowOrbs = React.memo(function GlowOrbs({ activeColor }: { activeColor: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center">
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-15 transition-colors duration-1000 ease-in-out mix-blend-screen"
        style={{ backgroundColor: activeColor, animation: 'pulse-slow 10s infinite alternate', willChange: 'transform' }}
      />
    </div>
  );
});

// ── Field ──────────────────────────────────────────────────
const Field = React.memo(function Field({
  label, type = 'text', placeholder, value, onChange, right,
}: {
  label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/90 drop-shadow-md">{label}</label>
      <div className="relative group">
        <div
          className="absolute bottom-0 left-0 h-[1px] w-0 group-focus-within:w-full transition-all duration-500 z-10"
          style={{ background: 'linear-gradient(90deg, #e8a000, #a855f7)' }}
        />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="auth-input w-full text-white text-sm px-3 py-3 outline-none tracking-wide placeholder:text-white/40 transition-all duration-300 pr-10 rounded-lg bg-black/40 border border-white/10 focus:bg-black/60 focus:border-white/30 backdrop-blur-md shadow-inner"
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    </div>
  );
});

// ── Role Card ──────────────────────────────────────────────
const RoleCard = React.memo(function RoleCard({
  role, selected, onSelect, locked,
}: { role: PlayerRole; selected: boolean; onSelect: () => void; locked?: boolean }) {
  const cfg = ROLE_CONFIG[role];
  const [hovered, setHovered] = useState(false);
  const isLocked = locked && !selected;
  const active = selected || (!locked && hovered);

  return (
    <button
      type="button"
      onClick={isLocked ? undefined : onSelect}
      onMouseEnter={() => !isLocked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={isLocked}
      className="relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300 overflow-hidden group backdrop-blur-sm"
      style={{
        border: `1px solid ${active ? cfg.color + '80' : 'rgba(255,255,255,0.1)'}`,
        background: selected
          ? `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}10)`
          : hovered && !locked
          ? `${cfg.color}15`
          : 'rgba(0,0,0,0.4)',
        boxShadow: selected ? `0 0 20px ${cfg.color}30, inset 0 0 15px ${cfg.color}20` : 'none',
        opacity: isLocked ? 0.3 : 1,
        cursor: isLocked ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        className="relative w-10 h-10 rounded-full overflow-hidden transition-all duration-300 ring-2 ring-transparent shadow-lg"
        style={{
          filter: active ? `drop-shadow(0 0 8px ${cfg.color})` : 'brightness(0.6) grayscale(0.4)',
          transform: selected ? 'scale(1.1)' : 'scale(1)',
          ...(selected && { ringColor: cfg.color })
        }}
      >
        <div className="absolute inset-0 rounded-full border opacity-30" style={{ borderColor: cfg.color }} />
        <Image src={cfg.img} alt={cfg.label} fill className="object-cover object-top" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span className="absolute inset-0 flex items-center justify-center font-black text-[11px]" style={{ color: cfg.color }}>{cfg.label[0]}</span>
      </div>
      <span
        className="text-[9px] font-black tracking-[0.2em] uppercase transition-colors duration-200 mt-1 drop-shadow-md"
        style={{ color: active ? cfg.color : 'rgba(255,255,255,0.7)' }}
      >
        {cfg.label}
      </span>
      {selected && (
        <div className="absolute inset-0 pointer-events-none animate-ping opacity-0" style={{ background: `radial-gradient(circle, ${cfg.color}40, transparent)` }} />
      )}
    </button>
  );
});

// ── Role Selector ──────────────────────────────────────────
const RoleSelector = React.memo(function RoleSelector({
  selected, onSelect, locked,
}: { selected: PlayerRole | null; onSelect: (r: PlayerRole) => void; locked?: boolean }) {
  return (
  <div className="flex flex-col gap-3 mt-1">
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/90 drop-shadow-md">Main Role</label>
      {selected && (
        <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full" style={{
          color: ROLE_CONFIG[selected].color,
          border: `1px solid ${ROLE_CONFIG[selected].color}50`,
          background: `${ROLE_CONFIG[selected].color}20`,
        }}>
          {ROLE_CONFIG[selected].desc}
        </span>
      )}
      {locked && !selected && (
        <span className="text-[9px] tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 text-white/50 border border-white/10 bg-black/40 backdrop-blur-sm">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>
          locked by roster
        </span>
      )}
    </div>
    <div className="grid grid-cols-5 gap-2">
      {ROLES.map((r) => (
        <RoleCard key={r} role={r} selected={selected === r} onSelect={() => onSelect(r)} locked={locked} />
      ))}
    </div>
  </div>
  );
});

// ── Submit Button ──────────────────────────────────────────
const SubmitBtn = React.memo(function SubmitBtn({ label, loading }: { label: string; loading: boolean }) {
  return (
  <button
    type="submit"
    disabled={loading}
    className="relative w-full py-3.5 mt-2 rounded-lg font-black text-[11px] tracking-[0.3em] uppercase overflow-hidden group transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(232,160,0,0.3)] hover:shadow-[0_4px_25px_rgba(232,160,0,0.5)] border border-[#ffb800]/20 hover:border-[#ffb800]/50"
    style={{ background: 'linear-gradient(90deg, #e8a000, #e86000)', color: '#000' }}
  >
    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(90deg, #ffb800, #ff8c00)' }} />
    <span className="absolute -left-full group-hover:left-full transition-all duration-700 inset-y-0 w-1/3 bg-white/30 skew-x-12 pointer-events-none" />
    <span className="relative flex items-center justify-center gap-2">
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          Processing...
        </span>
      ) : (
        <>{label} <ChevronRight size={14} /></>
      )}
    </span>
  </button>
  );
});

// ── Error / Success ────────────────────────────────────────
const ErrorMessage = React.memo(function ErrorMessage({ message }: { message: string }) {
  return (
  <div className="flex items-start gap-2 p-3 rounded-lg text-[11px] tracking-wide backdrop-blur-md" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
    <AlertCircle size={14} className="mt-0.5 shrink-0" />
    <span>{message}</span>
  </div>
  );
});

const SuccessMessage = React.memo(function SuccessMessage({ message }: { message: string }) {
  return (
  <div className="p-3 rounded-lg text-[11px] tracking-wide backdrop-blur-md" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#86efac' }}>
    {message}
  </div>
  );
});

// ── Login Form ─────────────────────────────────────────────
function decodeAuthError(code: string | null): string | null {
  if (!code) return null;
  if (code === 'missing_fields') return 'Please enter your email / IGN and password.';
  if (code === 'invalid_credentials') return 'Invalid email / IGN or password.';
  if (code === 'account_banned') return 'Your account has been banned. Contact support for help.';
  if (code.startsWith('account_suspended:')) {
    try {
      const payload = JSON.parse(atob(code.split(':')[1]));
      const until = new Date(payload.until).toLocaleDateString();
      const reason = payload.reason ? ` Reason: ${payload.reason}.` : '';
      return `Account suspended until ${until}.${reason} ${payload.days} day(s) remaining.`;
    } catch { return 'Your account is currently suspended.'; }
  }
  if (code === 'Configuration') return 'Server configuration error. Please try again later.';
  if (code === 'AccessDenied') return 'Access denied. Please check your credentials.';
  if (code === 'Verification') return 'Verification failed. Please try again.';
  if (code === 'CredentialsSignin') return 'Invalid email / IGN or password.';
  return `Authentication error. Please try again.`;
}

const LoginForm = ({ setMode }: { setMode: (mode: Mode) => void }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailOrIgn, setEmailOrIgn] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const urlError = searchParams.get('error');
  const [error, setError] = useState<string | null>(decodeAuthError(urlError));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (urlError) window.history.replaceState({}, '', '/login');
    setError(null); setLoading(true);
    try {
      await signOut({ redirect: false });
      const result = await signIn('credentials', { emailOrIgn, password, redirect: false });
      if (result?.error) { setError(decodeAuthError(result.error)); setLoading(false); return; }
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
          <button type="button" onClick={() => setShowPw(!showPw)} className="transition-colors hover:text-white text-white/60">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
      />
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input type="checkbox" className="accent-[#e8a000] w-3.5 h-3.5 bg-black/40 border-white/20 rounded" />
          <span className="text-[10px] tracking-widest uppercase text-white/70 group-hover:text-white transition-colors">Remember me</span>
        </label>
        <a 
          href="#" onClick={(e) => { e.preventDefault(); setMode('reset-request'); }}
          className="text-[10px] tracking-widest uppercase text-white/70 hover:text-[#e8a000] transition-colors drop-shadow-md"
        >Forgot?</a>
      </div>
      <SubmitBtn label="Enter the Arena" loading={loading} />
    </form>
  );
};

// ── Password Reset Request Form ────────────────────────────
const ResetRequestForm = ({ onBack }: { onBack: () => void }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) return setError('Email is required');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to process request'); setLoading(false); return; }
      setSuccess(true); setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <SuccessMessage message="Check your email for the password reset link. The link will expire in 1 hour." />
        <button
          onClick={onBack}
          className="text-[10px] tracking-widest uppercase text-white/70 hover:text-[#e8a000] transition-colors self-start mt-2 drop-shadow-md"
        >← Back to login</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <ErrorMessage message={error} />}
      <Field label="Email" type="email" placeholder="your@email.com" value={email} onChange={setEmail} />
      <p className="text-[11px] leading-relaxed text-white/70">
        Enter your email address and we will send you a link to reset your password.
      </p>
      <SubmitBtn label="Send Reset Link" loading={loading} />
      <button
        type="button" onClick={onBack}
        className="text-[10px] tracking-widest uppercase text-white/70 hover:text-[#e8a000] transition-colors self-start drop-shadow-md"
      >← Back to login</button>
    </form>
  );
};

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
  EXP: 'EXP', ROAM: 'ROAM', GOLD: 'GOLD', JUNGLE: 'JUNGLE', MID: 'MID',
};
const GAME_ROLE_TO_PLAYER_ROLE: Record<string, PlayerRole> = {
  EXP: 'EXP', JUNGLE: 'JUNGLE', MID: 'MID', GOLD: 'GOLD', ROAM: 'ROAM',
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
  const [rosterMatch, setRosterMatch] = useState<{ 
    status: 'taken' | 'placeholder' | 'available';
    codeMatches?: boolean;
    team: { name: string; tag: string; color?: string | null }; 
    role: string 
  } | null>(null);
  const [checkingIgn, setCheckingIgn] = useState(false);

  useEffect(() => {
    if (rosterMatch && rosterMatch.status === 'placeholder') {
      const mapped = GAME_ROLE_TO_PLAYER_ROLE[rosterMatch.role];
      if (mapped) setRole(mapped);
    }
  }, [rosterMatch]);

  useEffect(() => {
    if (ign.trim().length < 2) { setRosterMatch(null); return; }
    const t = setTimeout(async () => {
      setCheckingIgn(true);
      try {
        const controller = new AbortController();
        const res = await fetch(`/api/users/check-ign?ign=${encodeURIComponent(ign.trim())}&teamCode=${encodeURIComponent(teamCode.trim().toUpperCase())}`, { signal: controller.signal });
        const data = await res.json();
        if (data.status === 'taken') setRosterMatch({ status: 'taken', team: { name: '', tag: '' }, role: '' });
        else if (data.status === 'placeholder') setRosterMatch({ status: 'placeholder', codeMatches: data.codeMatches, team: data.team, role: data.role });
        else setRosterMatch(null);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') setRosterMatch(null);
      }
      finally { setCheckingIgn(false); }
    }, 1000);
    return () => clearTimeout(t);
  }, [ign, teamCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!ign || !email || !password || !confirm || !role) return setError('All fields are required');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    if (ign.length < 2 || ign.length > 20) return setError('IGN must be 2–20 characters');
    if (teamCode && !/^[A-Z0-9]{6}$/.test(teamCode.trim().toUpperCase())) return setError('Team code must be 6 alphanumeric characters');
    if (rosterMatch?.status === 'taken') return setError('IGN already taken');
    if (rosterMatch?.status === 'placeholder' && !rosterMatch.codeMatches) {
        return setError(`IGN already assigned to ${rosterMatch.team.name}. Please enter your Team Code.`);
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ign, mainRole: role ? ROLE_MAP[role] : undefined, teamCode: teamCode.trim() ? teamCode.trim().toUpperCase() : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return; }
      setSuccess('Account created! Logging you in...');
      await signOut({ redirect: false });
      const login = await signIn('credentials', { emailOrIgn: email, password, redirect: false });
      if (login?.error) { setError('Account created but login failed. Log in manually.'); setLoading(false); return; }
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
      {(rosterMatch || checkingIgn) && (
        <div
          className="flex items-start gap-2.5 px-4 py-3 rounded-lg border text-[11px] leading-relaxed transition-all duration-300 backdrop-blur-md shadow-lg"
          style={
            checkingIgn 
              ? { borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)' }
              : rosterMatch?.status === 'taken'
                ? { borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }
                : rosterMatch?.status === 'placeholder' && rosterMatch.codeMatches
                  ? { borderColor: `${rosterMatch.team.color ?? '#22c55e'}80`, background: `${rosterMatch.team.color ?? '#22c55e'}30`, color: rosterMatch.team.color ?? '#86efac' }
                  : { borderColor: 'rgba(232,160,0,0.5)', background: 'rgba(232,160,0,0.2)', color: '#fde047' }
          }
        >
          {checkingIgn ? (
            <span className="tracking-wide animate-pulse font-medium">Scanning registry…</span>
          ) : rosterMatch?.status === 'taken' ? (
            <><AlertCircle size={15} className="shrink-0 mt-0.5" /><span><strong>IGN taken.</strong> Choose a unique name.</span></>
          ) : rosterMatch?.status === 'placeholder' ? (
             rosterMatch.codeMatches ? (
                <><CheckCircle2 size={15} className="shrink-0 mt-0.5" /><span>Account linking to <strong>{rosterMatch.team.name}</strong> upon register.</span></>
             ) : (
                <><AlertCircle size={15} className="shrink-0 mt-0.5" /><span>Assigned to <strong>{rosterMatch.team.name}</strong>. Provide Team Code to claim.</span></>
             )
          ) : null}
        </div>
      )}
      <Field label="Team Code (Optional)" placeholder="A1B2C3" value={teamCode} onChange={(v) => setTeamCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Password" type={showPw ? 'text' : 'password'} placeholder="min. 8 chars"
          value={password} onChange={setPassword}
          right={<button type="button" onClick={() => setShowPw(!showPw)} className="text-white/60 hover:text-white transition-colors">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
        />
        <Field label="Confirm" type="password" placeholder="repeat pass" value={confirm} onChange={setConfirm} />
      </div>
      <RoleSelector selected={role} onSelect={setRole} locked={!!rosterMatch} />
      <SubmitBtn label="Join the Squad" loading={loading} />
    </form>
  );
};

// ── Hero Content (Floating Info) ───────────────────────────
const HeroContent = ({ mode, activeRole }: { mode: Mode, activeRole: PlayerRole }) => {
  const cfg = ROLE_CONFIG[activeRole];

  return (
    <div className="hidden lg:flex flex-col justify-center h-full max-w-xl text-left pl-6 relative z-10">
      <div className="flex items-center gap-3 mb-6" style={{ animation: 'cine-fade-up 0.7s ease 0.05s both' }}>
        <div className="h-[2px] w-12 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 12px ${cfg.color}` }} />
        <span className="text-[11px] tracking-[0.4em] uppercase font-bold transition-colors duration-1000 drop-shadow-lg" style={{ color: cfg.color }}>
          {cfg.label} — {cfg.desc}
        </span>
      </div>
      <h2
        className="font-black text-6xl xl:text-[80px] leading-[0.9] uppercase text-white drop-shadow-2xl"
        style={{ fontFamily: '"Orbitron", "Rajdhani", sans-serif', letterSpacing: '-0.03em', textShadow: '0 10px 40px rgba(0,0,0,0.8)' }}
      >
        {(mode === 'login' ? ['Welcome', 'Back,'] : ['Join the', 'Ghana']).map((line, i) => (
          <span key={line} className="block overflow-hidden pb-2">
            <span className="block" style={{ animation: `cine-rise 0.9s cubic-bezier(0.16,1,0.3,1) ${0.12 + i * 0.13}s both` }}>
              {line}
            </span>
          </span>
        ))}
        <span className="block overflow-hidden pb-4">
          <span
            className="block transition-all duration-1000"
            style={{
              color: cfg.color,
              textShadow: `0 0 60px ${cfg.glow}, 0 0 20px ${cfg.color}`,
              animation: 'cine-rise 0.9s cubic-bezier(0.16,1,0.3,1) 0.38s both',
            }}
          >
            {mode === 'login' ? 'Legend.' : 'Arena.'}
          </span>
        </span>
      </h2>
      
      <p className="text-base mt-4 leading-relaxed text-white max-w-[420px] backdrop-blur-xl bg-black/30 p-5 rounded-2xl border border-white/10 shadow-xl" style={{ animation: 'cine-fade-up 0.8s ease 0.55s both' }}>
        {mode === 'login'
          ? 'Your squad is waiting. Log in to track your stats, manage your team, and dominate the leaderboard.'
          : 'Register now to compete in APL & AFL tournaments and represent Ghana on the IESF Africa stage.'}
      </p>

      {/* Roles HUD */}
      <div className="mt-12" style={{ animation: 'cine-fade-up 0.9s ease 0.75s both' }}>
        <p className="text-[10px] tracking-[0.3em] uppercase mb-4 text-white/70 drop-shadow-md font-medium">Tournament Roster Array</p>
        <div className="flex gap-3">
          {ROLES.map((r) => {
            const c = ROLE_CONFIG[r];
            const isActive = r === activeRole;
            return (
              <div
                key={r}
                className="flex-1 py-3 rounded-xl flex flex-col items-center gap-2 transition-all duration-700 backdrop-blur-md"
                style={{
                  border: `1px solid ${isActive ? c.color + '90' : 'rgba(255,255,255,0.1)'}`,
                  background: isActive ? `${c.color}25` : 'rgba(0,0,0,0.3)',
                  transform: isActive ? 'translateY(-6px)' : 'translateY(0)',
                  boxShadow: isActive ? `0 10px 25px -5px ${c.color}60` : 'none'
                }}
              >
                <div
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all duration-700 shadow-inner"
                  style={{
                    borderColor: isActive ? c.color : 'rgba(255,255,255,0.2)',
                    color: isActive ? c.color : 'rgba(255,255,255,0.6)',
                    boxShadow: isActive ? `0 0 15px ${c.color}80, inset 0 0 15px ${c.color}40` : 'none',
                    background: isActive ? `${c.color}10` : 'rgba(0,0,0,0.5)'
                  }}
                >
                  {r[0]}
                </div>
                <span className="text-[8px] font-bold tracking-widest uppercase drop-shadow-md" style={{ color: isActive ? c.color : 'rgba(255,255,255,0.5)' }}>
                  {r}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Statistics Bar */}
        <div className="mt-8 inline-flex items-center gap-4 px-6 py-3 rounded-full backdrop-blur-xl border border-white/10 bg-black/40 shadow-2xl">
          <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-white">Season 5</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/80">Prize Pool ₵12,800</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/80">120+ Players</span>
        </div>
      </div>
    </div>
  );
};

// ── Mode Tab ───────────────────────────────────────────────
const ModeTab = React.memo(function ModeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
  <button
    onClick={onClick}
    className="flex-1 py-4 text-[11px] font-black tracking-[0.3em] uppercase transition-all duration-300 relative"
    style={{ color: active ? '#e8a000' : 'rgba(255,255,255,0.5)' }}
  >
    {label}
    <span
      className="absolute bottom-0 left-0 right-0 h-px transition-all duration-500"
      style={{
        background: active ? 'linear-gradient(90deg, #e8a000, #a855f7)' : 'transparent',
        opacity: active ? 1 : 0
      }}
    />
  </button>
  );
});

// ── Main Layout ────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [tick, setTick] = useState(0);
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      try {
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        const cb = params.get('callbackUrl') || '/';
        router.push(cb);
      } catch { router.push('/'); }
    }
  }, [status, router]);

  useEffect(() => {
    const t = setInterval(() => setTick(n => (n + 1) % 5), 4000);
    return () => clearInterval(t);
  }, []);

  const activeRole = ROLES[tick];
  const cfg = ROLE_CONFIG[activeRole];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Grotesk:wght@300;400;500;700&display=swap');
        * { font-family: 'Space Grotesk', sans-serif; }
        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus,
        .auth-input:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 9999s ease-in-out 0s;
          box-shadow: 0 0 0px 1000px rgba(0,0,0,0.5) inset;
        }
        @keyframes cine-kenburns {
          0%   { transform: scale(1.02); will-change: transform; }
          100% { transform: scale(1.08) translateX(-1%); }
        }
        @keyframes cine-rise {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes cine-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.05); opacity: 0.3; }
        }
      `}</style>

      {/* Changed min-h-screen to min-h-[100dvh] to fix mobile browser jumping */}
      <main className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-[#07070d]">
        <ImmersiveBackground />
        <GlowOrbs activeColor={cfg.color} />
        <Particles activeColor={cfg.color} />
        <Scanlines />

        {/* Mobile Home Nav */}
        <div className="absolute top-0 left-0 w-full lg:hidden flex items-center justify-end px-6 py-5 z-50">
          <Link href="/" className="text-[10px] tracking-widest uppercase font-bold text-white/80 hover:text-white transition-colors bg-black/40 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
            ← Home
          </Link>
        </div>

        {/* Floating Content Container */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-5 sm:px-8 pt-20 sm:pt-24 pb-16 lg:px-16 flex flex-col lg:flex-row items-center justify-evenly gap-12 min-h-[100dvh]">
          
          {/* Left Side: Lore / Hero */}
          <div className="hidden lg:flex w-full lg:w-1/2 justify-center shrink-0">
             <HeroContent mode={mode} activeRole={activeRole} />
          </div>

          {/* Right Side: Wow Glassmorphism Auth Card */}
          <div className="w-full max-w-[480px] shrink-0 pt-4 lg:pt-0">
            <div className="relative group transition-all duration-1000">
              
              {/* Dynamic Card Glow Drop Shadow */}
              <div
                className="absolute -inset-1.5 rounded-[2.25rem] blur-[30px] opacity-40 transition-colors duration-1000 z-0"
                style={{ backgroundColor: cfg.color }}
              />

              {/* The Ultra-Glass Card (Transparent base, backdrop-blur removed to allow video visibility while maintaining text readability) */}
              <div 
                className="relative z-10 rounded-[2rem] p-7 sm:p-10 overflow-hidden transition-all duration-1000 flex flex-col"
                style={{
                  background: 'linear-gradient(145deg, rgba(15,15,20,0.2) 0%, rgba(5,5,10,0.3) 100%)',
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 30px 60px -10px rgba(0,0,0,0.7), inset 0 1px 20px rgba(255,255,255,0.02)`,
                }}
              >
                {/* Subtle Inner Decorative Flare */}
                <div 
                  className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-colors duration-1000 opacity-40" 
                  style={{ background: cfg.color }} 
                />

                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-8 relative z-10">
                  <ModeTab label="Sign In" active={mode === 'login'} onClick={() => setMode('login')} />
                  <ModeTab label="Register" active={mode === 'register'} onClick={() => setMode('register')} />
                </div>

                {/* Heading */}
                <div className="mb-7 relative z-10">
                  <h1
                    className="text-white font-black text-3xl uppercase tracking-tight drop-shadow-md"
                    style={{ fontFamily: '"Orbitron", sans-serif' }}
                  >
                    {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
                  </h1>
                  <p className="text-[12px] mt-2 leading-relaxed text-white/60 drop-shadow-sm">
                    {mode === 'login'
                      ? 'Enter your credentials to access your dashboard.'
                      : mode === 'register'
                      ? 'Fill in your details to join the community.'
                      : 'Enter your email to receive a password reset link.'}
                  </p>
                </div>

                {/* Form Wrapper */}
                <div key={mode} className="relative z-10" style={{ animation: 'cine-fade-up 0.45s ease both' }}>
                  {mode === 'login' ? (
                    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-black/40 backdrop-blur-md" />}>
                      <AuthRedirect />
                      <LoginForm setMode={setMode} />
                    </Suspense>
                  ) : mode === 'register' ? (
                    <RegisterForm />
                  ) : (
                    <ResetRequestForm onBack={() => setMode('login')} />
                  )}
                </div>

                {/* Switch mode footer */}
                <p className="text-[11px] tracking-wide mt-8 text-center text-white/60 relative z-10 drop-shadow-md">
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="font-bold transition-colors hover:text-white"
                    style={{ color: '#e8a000' }}
                  >
                    {mode === 'login' ? 'Register →' : 'Login →'}
                  </button>
                </p>

              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}