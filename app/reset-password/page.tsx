'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

// ── Animated background particles ─────────────────────────────────────────────
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

// ── Scanline overlay ───────────────────────────────────────────────────────
const Scanlines = () => (
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.03]"
    style={{
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)',
      backgroundSize: '100% 4px',
    }}
  />
);

// ── Noise texture overlay ─────────────────────────────────────────────────
const Noise = () => (
  <div
    className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '128px',
    }}
  />
);

// ── Mobile background ─────────────────────────────────────────────────────
const MobileBgVideo = () => {
  const [ok, setOk] = useState(true);

  return (
    <div className="absolute inset-0 lg:hidden pointer-events-none overflow-hidden" aria-hidden="true">
      {ok ? (
        <video
          src="/gif/heros2.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onError={() => setOk(false)}
          className="w-full h-full object-cover opacity-60 blur-none scale-102"
          style={{ transformOrigin: 'center' }}
        />
      ) : (
        <div className="absolute inset-0 bg-cover bg-center opacity-60 blur-none scale-102" style={{ backgroundImage: "url('/gif/heros2.jpg')" }} />
      )}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
};

// ── Glowing orbs in bg ────────────────────────────────────────────────────
const GlowOrbs = () => (
  <>
    <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse" style={{ background: '#e8a000', animationDuration: '4s' }} />
    <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-8 blur-3xl animate-pulse" style={{ background: '#a855f7', animationDuration: '6s', animationDelay: '1s' }} />
    <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-8 blur-3xl animate-pulse" style={{ background: '#06b6d4', animationDuration: '5s', animationDelay: '2s' }} />
  </>
);

// ── Field ────────────────────────────────────────────────────────────────
const Field = ({
  label, type = 'text', placeholder, value, onChange, right,
}: {
  label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; right?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.78)' }}>{label}</label>
    <div className="relative group">
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

// ── Submit Button ─────────────────────────────────────────────────────────
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

// ── Error / Success ──────────────────────────────────────────────────────
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

// ── Main Component ──────────────────────────────────────────────────────
export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState<boolean>(!token);

  // useEffect(() => {
  //   if (!token) {
  //     setInvalidToken(true);
  //   }
  // }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
      setLoading(false);
    }
  };

  if (invalidToken) {
    return (
      <main className="min-h-screen grid lg:grid-cols-[1fr,1fr]" style={{ background: '#07070d' }}>
        <div className="hidden lg:flex relative flex-col justify-center items-center overflow-hidden" style={{ background: '#050508' }}>
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
          <GlowOrbs />
          <Particles />
          <Scanlines />
          <Noise />
        </div>
        <div className="relative flex flex-col min-h-screen lg:min-h-0">
          <MobileBgVideo />
          <Particles />
          <Noise />
          <div className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-10">
            <div className="w-full max-w-sm mx-auto lg:max-w-[420px]">
              <div className="h-px mb-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(232,160,0,0.4), rgba(168,85,247,0.4), transparent)' }} />
              <ErrorMessage message="Invalid or expired reset link. Please request a new password reset." />
              <Link
                href="/login"
                className="mt-6 inline-flex items-center justify-center w-full py-3 font-black text-[11px] tracking-[0.3em] uppercase transition-all duration-300"
                style={{ background: 'linear-gradient(90deg, #e8a000, #e86000)', color: '#000' }}
              >
                ← Back to Login
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen grid lg:grid-cols-[1fr,1fr]" style={{ background: '#07070d' }}>
        <div className="hidden lg:flex relative flex-col justify-center items-center overflow-hidden" style={{ background: '#050508' }}>
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
          <GlowOrbs />
          <Particles />
          <Scanlines />
          <Noise />
        </div>
        <div className="relative flex flex-col min-h-screen lg:min-h-0">
          <MobileBgVideo />
          <Particles />
          <Noise />
          <div className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-10">
            <div className="w-full max-w-sm mx-auto lg:max-w-[420px]">
              <div className="h-px mb-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(232,160,0,0.4), rgba(168,85,247,0.4), transparent)' }} />
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <CheckCircle2 size={32} style={{ color: '#22c55e' }} />
                </div>
                <h1
                  className="text-white font-black text-2xl uppercase"
                  style={{ fontFamily: '"Orbitron", sans-serif', letterSpacing: '-0.01em' }}
                >
                  Password Reset
                </h1>
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center justify-center w-full py-3 font-black text-[11px] tracking-[0.3em] uppercase transition-all duration-300 hover:opacity-90"
                style={{ background: 'linear-gradient(90deg, #e8a000, #e86000)', color: '#000' }}
              >
                ← Go to Login
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

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
        {/* Left Panel */}
        <div className="hidden lg:flex relative flex-col justify-center items-center overflow-hidden" style={{ background: '#050508' }}>
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
          <GlowOrbs />
          <Particles />
          <Scanlines />
          <Noise />

          <div className="absolute right-0 top-0 bottom-0 w-px opacity-20" style={{ background: 'linear-gradient(180deg, transparent, #e8a000 30%, #a855f7 70%, transparent)' }} />

          <div className="relative z-10 flex flex-col items-center text-center px-8">
            <h2
              className="font-black text-4xl xl:text-5xl leading-none uppercase"
              style={{ fontFamily: '"Orbitron", "Rajdhani", sans-serif', letterSpacing: '-0.02em' }}
            >
              <span className="text-white">New</span><br />
              <span className="text-white">Password</span>
            </h2>
            <p className="text-sm mt-6 leading-relaxed max-w-[280px]" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Create a strong password to secure your account and get back to dominating the arena.
            </p>
          </div>
        </div>

        {/* Right Panel */}
        <div className="relative flex flex-col min-h-screen lg:min-h-0">
          <MobileBgVideo />
          <Particles />
          <Noise />

          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-end px-5 py-4 relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <Link href="/" className="text-[10px] tracking-widest uppercase transition-colors hover:text-white" style={{ color: '#333' }}>← Home</Link>
          </div>

          {/* Form area */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-10">
            <div className="w-full max-w-sm mx-auto lg:max-w-[420px]">
              {/* Top line */}
              <div className="h-px mb-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(232,160,0,0.4), rgba(168,85,247,0.4), transparent)' }} />

              {/* Heading */}
              <div className="mb-7">
                <p className="text-[9px] tracking-[0.35em] uppercase mb-2" style={{ color: '#444' }}>
                  Ghana MLBB Community
                </p>
                <h1
                  className="text-white font-black text-3xl uppercase"
                  style={{ fontFamily: '"Orbitron", sans-serif', letterSpacing: '-0.01em' }}
                >
                  Reset Password
                </h1>
                <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: '#3a3a4a' }}>
                  Enter your new password below.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {error && <ErrorMessage message={error} />}
                <Field
                  label="New Password" type={showPw ? 'text' : 'password'} placeholder="min. 8 characters"
                  value={password} onChange={setPassword}
                  right={
                    <button type="button" onClick={() => setShowPw(!showPw)} className="transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  }
                />
                <Field
                  label="Confirm Password" type={showPw ? 'text' : 'password'} placeholder="repeat password"
                  value={confirmPassword} onChange={setConfirmPassword}
                  right={
                    <button type="button" onClick={() => setShowPw(!showPw)} className="transition-colors" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  }
                />
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Password must be at least 8 characters long.
                </p>
                <SubmitBtn label="Reset Password" loading={loading} />
              </form>

              {/* Back to login */}
              <p className="text-[11px] tracking-wide mt-7 text-center" style={{ color: '#2a2a2a' }}>
                Remember your password?{' '}
                <Link
                  href="/login"
                  className="font-bold transition-colors hover:text-white"
                  style={{ color: '#e8a000' }}
                >
                  Login →
                </Link>
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
