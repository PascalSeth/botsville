'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, Radio, User, LogOut, Settings, ChevronDown, Users, Shield, Bell, Trophy, Swords, Globe, Newspaper, BarChart3, Star, Medal, Volume2, Menu } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { subscribeToUserNotifications, unsubscribeFromChannel } from '@/lib/socket-client';

const DASHBOARD_HREF = '/dashboard';

const NAV_ITEMS = [
  {
    label: 'Compete',
    icon: Swords,
    color: '#ff4d4d',
    items: [
      { label: 'Challenge Arena', href: '/challenge-arena', desc: 'Issue & accept squad scrim battles', icon: Swords },
      { label: 'Tournaments', href: '/tournaments', desc: 'Active & upcoming events', icon: Trophy },
      { label: 'My Team', href: '/my-team', desc: 'Manage your squad & roster', icon: Shield },
      { label: 'Teams', href: '/teams', desc: 'Browse & join squads', icon: Users },
    ],
  },
  {
    label: 'Rankings',
    icon: BarChart3,
    color: '#e8a000',
    items: [
      { label: 'Leaderboard', href: '/leaderboard', desc: 'Top ranked players & squads', icon: BarChart3 },
      { label: 'Awards', href: '/awards', desc: 'Vote for best role players', icon: Medal },
      { label: 'Polls', href: '/polls', desc: 'Community votes & predictions', icon: Star },
      { label: 'Scrim Vault', href: '/scrim-vault', desc: 'Watch live streamed scrims', icon: Radio },
    ],
  },
  {
    label: 'Community',
    icon: Globe,
    color: '#7c3aed',
    items: [
      { label: 'News', href: '/news', desc: 'Latest esports updates', icon: Newspaper },
      { label: 'Meet the Pros', href: '/pros', desc: 'Vote for the next interview', icon: Volume2 },
      { label: 'Community Hub', href: '/community', desc: 'Forums & discussions', icon: Globe },
    ],
  },
];

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  read: boolean;
  createdAt: string;
};

const formatTime = (createdAt: string) => {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

const NotificationBell = ({ isLoggedIn, userId }: { isLoggedIn: boolean; userId?: string | null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (e: PointerEvent) => { if (!bellRef.current?.contains(e.target as Node)) setIsOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [isOpen]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      setLoading(true);
      const res = await fetch('/api/notifications?limit=8', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.pagination?.unreadCount ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) { setNotifications([]); setUnreadCount(0); return; }
    void fetchNotifications();
    const iv = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchNotifications();
      }
    }, 60000);
    return () => clearInterval(iv);
  }, [fetchNotifications, isLoggedIn]);

  useEffect(() => { if (isOpen) void fetchNotifications(); }, [fetchNotifications, isOpen]);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const fireDesktopNotif = (item: NotificationItem) => {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        const notif = new Notification(item.title, {
          body: item.message,
          icon: '/mlbb_logo.png',
          badge: '/mlbb_logo.png',
          tag: 'notif-' + item.id,
        });
        notif.onclick = () => {
          window.focus();
          if (item.linkUrl) window.location.href = item.linkUrl;
          notif.close();
        };
      }
    };

    const handleNew = (payload: unknown) => {
      const item = payload as NotificationItem;
      if (!item?.id) return;
      setNotifications(prev => prev.some(n => n.id === item.id) ? prev : [item, ...prev.slice(0, 7)]);
      setUnreadCount(prev => prev + 1);
      fireDesktopNotif(item);
    };

    subscribeToUserNotifications(userId, handleNew);

    return () => {
      unsubscribeFromChannel(`user:${userId}`);
    };
  }, [isLoggedIn, userId]);

  const markRead = async (id: string) => {
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((p) => Math.max(0, p - 1));
    try {
      await fetch('/api/notifications', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] }),
      });
    } catch { /* optimistic */ }
  };

  const markAll = async () => {
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch { /* optimistic */ }
  };

  if (!isLoggedIn) return null;

  return (
    <div ref={bellRef} className="relative bn-notifications">
      <motion.button
        type="button" aria-label="Notifications" aria-expanded={isOpen}
        onClick={() => setIsOpen((p) => !p)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[#666] hover:text-[#e8a000] transition-colors border border-transparent hover:border-[#e8a000]/20"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-linear-to-r from-[#e8a000] to-[#ff9500] text-[8px] font-black text-black flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(232,160,0,0.5)]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-79 md:hidden backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.95, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, scale: 0.95, filter: 'blur(8px)' }}
              transition={{ duration: 0.2 }}
              style={{
                transformOrigin: 'top',
                backdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '0 25px 70px rgba(0,0,0,0.9), 0 0 0 1px rgba(232,160,0,0.1)',
              }}
              className="fixed md:absolute left-4 right-4 md:left-auto md:right-0 top-20 md:top-full md:mt-2 md:w-80 bg-[rgba(10,10,18,0.92)] border border-white/6 rounded-xl z-80 overflow-hidden"
            >
              <div className="h-0.5 w-full bg-linear-to-r from-transparent via-[#e8a000] to-transparent" />
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/4">
                <div className="flex items-center gap-2.5">
                  <Bell size={11} className="text-[#e8a000]" />
                  <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white">Alerts</span>
                  {unreadCount > 0 && (
                    <span className="text-[8px] font-bold bg-[#e8a000]/15 text-[#e8a000] px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={markAll}
                  disabled={unreadCount === 0}
                  className="text-[9px] font-bold uppercase tracking-wider text-[#555] hover:text-[#e8a000] disabled:opacity-20 transition-colors"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {loading && !notifications.length ? (
                  <div className="flex justify-center py-10">
                    <motion.div
                      className="w-5 h-5 border-2 border-[#e8a000]/20 border-t-[#e8a000] rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                ) : !notifications.length ? (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Bell size={20} className="text-[#1a1a1a]" />
                    </motion.div>
                    <p className="text-[11px] text-[#222]">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((item, i) => {
                    const inner = (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex gap-3 px-5 py-3.5 border-b border-white/2 hover:bg-white/2 transition-colors ${!item.read ? 'bg-[#e8a000]/2' : ''}`}
                      >
                        <motion.span
                          className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${item.read ? 'bg-[#1a1a1a]' : 'bg-[#e8a000] shadow-[0_0_6px_rgba(232,160,0,0.5)]'}`}
                          animate={!item.read ? { scale: [1, 1.3, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white/80 truncate">{item.title}</p>
                          <p className="text-[10px] text-[#666] line-clamp-2 leading-relaxed mt-0.5">{item.message}</p>
                          <p className="text-[9px] text-[#222] mt-1">{formatTime(item.createdAt)}</p>
                        </div>
                      </motion.div>
                    );

                    return item.linkUrl ? (
                      <Link
                        key={item.id}
                        href={item.linkUrl}
                        onClick={() => { void markRead(item.id); setIsOpen(false); }}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button key={item.id} onClick={() => void markRead(item.id)} className="w-full text-left">
                        {inner}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="h-px w-full bg-linear-to-r from-transparent via-[#e8a000]/20 to-transparent" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};


function NavDialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [open]);
  return <dialog ref={ref} className="bn-dialog" aria-label={title} onCancel={onClose} onClose={onClose}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="bn-dialog-content">
      <div className="bn-dialog-top"><span>{title}</span><button type="button" className="bn-icon" onClick={onClose} aria-label={`Close ${title}`}><X size={17} /></button></div>
      {children}
    </div>
  </dialog>;
}

export const Navbar = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [panel, setPanel] = useState<'menu' | 'search' | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setPanel(null);
  }
  const [query, setQuery] = useState('');
  const root = useRef<HTMLElement>(null);
  const loggedIn = status === 'authenticated' && !!session?.user?.id;
  const user = session?.user;
  const close = useCallback(() => setPanel(null), []);
  const closeDropdowns = useCallback(() => {
    root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(d => { d.open = false; });
  }, []);
  useEffect(() => { closeDropdowns(); }, [pathname, closeDropdowns]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); closeDropdowns(); setPanel('search'); }
      if (e.key === 'Escape') closeDropdowns();
    };
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) closeDropdowns(); };
    window.addEventListener('keydown', key); document.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, [closeDropdowns]);
  const active = (href: string) => pathname === href || pathname?.startsWith(href + '/');
  const results = NAV_ITEMS.flatMap(group => group.items).filter(item =>
    `${item.label} ${item.desc}`.toLowerCase().includes(query.trim().toLowerCase()));
  const accountLinks = [{ href: '/settings', label: 'Profile settings', icon: Settings }, { href: '/my-team', label: 'My team', icon: Users },
  ...(user?.role ? [{ href: DASHBOARD_HREF, label: 'Dashboard', icon: Shield }] : [])];
  const oneDropdown = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (!e.currentTarget.open) return;
    root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(d => { if (d !== e.currentTarget) d.open = false; });
  };
  return <>
    <style>{navbarStyles}</style>
    <header ref={root} className="bn-header">
      <nav className="bn-bar" aria-label="Main navigation">
        <Link href="/" className="bn-logo" aria-label="Botsville home">
          <Image src="/mlbb_logobg.png" alt="" width={28} height={28} />
          <span>Bots<span className="bn-gold">ville</span><small>GHANA / MLBB</small></span>
        </Link>
        <div className="bn-desktop">
          {NAV_ITEMS.map(group => <details className="bn-dropdown" key={group.label} onToggle={oneDropdown}>
            <summary className={group.items.some(item => active(item.href)) ? 'bn-current' : ''}>{group.label}<ChevronDown size={12} /></summary>
            <div className="bn-popover">
              <span className="bn-group-label">{group.label}</span>
              {group.items.map(item => <Link key={item.href} href={item.href} onClick={closeDropdowns} aria-current={active(item.href) ? 'page' : undefined} className="bn-nav-link">
                <item.icon size={16} /><span><strong>{item.label}</strong><small>{item.desc}</small></span><ArrowRight size={12} />
              </Link>)}
            </div>
          </details>)}
        </div>
        <div className="bn-controls">
          <button type="button" className="bn-search" aria-label="Search navigation" onClick={() => { closeDropdowns(); setPanel('search'); }}><Search size={16} /><span>Find a page</span><kbd>⌘ K</kbd></button>
          {loggedIn && <NotificationBell isLoggedIn={loggedIn} userId={user?.id} />}
          {status === 'loading' ? <span className="bn-loading" aria-label="Loading account" /> : loggedIn ?
            <details className="bn-dropdown bn-account" onToggle={oneDropdown}>
              <summary aria-label="Account"><span className="bn-avatar"><User size={15} /></span><span className="bn-username">{user?.ign || 'Account'}</span><ChevronDown size={11} /></summary>
              <div className="bn-popover bn-account-popover"><div className="bn-account-heading"><strong>{user?.ign || 'Your account'}</strong><small>{user?.role || 'Player'}</small></div>
                {accountLinks.map(item => <Link key={item.href} href={item.href} className="bn-account-link" onClick={closeDropdowns}><item.icon size={14} />{item.label}</Link>)}
                <button type="button" className="bn-account-link bn-logout" onClick={() => void signOut({ callbackUrl: '/' })}><LogOut size={14} />Sign out</button>
              </div>
            </details> : <Link className="bn-join" href="/login">Join / Log in<ArrowRight size={12} /></Link>}
          <button type="button" className="bn-icon bn-menu-toggle" aria-label="Open navigation" aria-expanded={panel === 'menu'} onClick={() => { closeDropdowns(); setPanel('menu'); }}><Menu size={19} /></button>
        </div>
      </nav>
    </header>
    <NavDialog open={panel === 'menu'} onClose={close} title="Explore Botsville">
      <div className="bn-mobile-groups">{NAV_ITEMS.map(group => <section key={group.label}><h2>{group.label}</h2><div className="bn-mobile-grid">{group.items.map(item =>
        <Link key={item.href} href={item.href} onClick={close} aria-current={active(item.href) ? 'page' : undefined}><item.icon size={15} /><span>{item.label}</span></Link>
      )}</div></section>)}</div>
      <div className="bn-mobile-bottom"><Link href={loggedIn ? '/my-team' : '/register-team'} onClick={close}>{loggedIn ? 'Manage your team' : 'Register your team'}<ArrowRight size={14} /></Link></div>
    </NavDialog>
    <NavDialog open={panel === 'search'} onClose={close} title="Find a page">
      <label className="bn-search-field"><Search size={17} /><input autoComplete="off" aria-label="Search pages" placeholder="Teams, tournaments, rankings…" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="bn-results">{results.length ? results.map(item => <Link href={item.href} key={item.href} onClick={close}><item.icon size={16} /><span><strong>{item.label}</strong><small>{item.desc}</small></span><ArrowRight size={13} /></Link>) : <p>No pages found. Try “teams” or “awards”.</p>}</div>
    </NavDialog>
  </>;
};

const navbarStyles = `
.bn-header{position:fixed;inset:0 0 auto;z-index:70;height:56px;background:rgba(10,12,16,.9);border-bottom:1px solid #ffffff12;backdrop-filter:blur(18px);color:#deded9;font-family:Arial,Helvetica,sans-serif}
.bn-header *,.bn-dialog *{box-sizing:border-box}.bn-header a,.bn-dialog a{text-decoration:none}.bn-header button,.bn-dialog button{font:inherit;cursor:pointer}.bn-header :is(a,button,summary):focus-visible,.bn-dialog :is(a,button,input):focus-visible{outline:2px solid #eab64b;outline-offset:3px}
.bn-bar{height:56px;max-width:1280px;margin:auto;padding:0 24px;display:flex;align-items:center;gap:24px}.bn-logo{display:flex;align-items:center;gap:9px;color:#f2f0e9;flex-shrink:0}.bn-logo>span{font-size:14px;font-weight:800;letter-spacing:-.4px}.bn-logo img{object-fit:contain}.bn-logo small{display:block;color:#979a9c;font-size:7px;letter-spacing:1.5px;margin-top:3px;font-weight:500}.bn-gold{color:#eab64b}.bn-desktop{display:flex;align-items:center;gap:4px;margin:auto}.bn-dropdown{position:relative}.bn-dropdown summary{list-style:none;display:flex;align-items:center;gap:8px;min-height:40px;padding:0 13px;cursor:pointer;font-size:11px;font-weight:600;color:#b4b5b5;border-radius:6px}.bn-dropdown summary::-webkit-details-marker{display:none}.bn-dropdown[open]>summary,.bn-dropdown summary:hover,.bn-dropdown summary.bn-current{background:#ffffff07;color:#eab64b}.bn-dropdown[open]>summary>svg:last-child{transform:rotate(180deg)}.bn-popover{position:absolute;top:calc(100% + 8px);left:0;width:280px;padding:8px;background:#12151a;border:1px solid #ffffff16;border-radius:10px;box-shadow:0 18px 40px #0006}.bn-group-label{display:block;font-size:9px;color:#929797;letter-spacing:1px;text-transform:uppercase;padding:8px 10px}.bn-nav-link{display:flex;gap:12px;align-items:center;padding:11px 10px;border-radius:6px;color:#a8aeae}.bn-nav-link>span{flex:1}.bn-nav-link strong{display:block;font-size:11px;font-weight:600;color:#eee}.bn-nav-link small{display:block;font-size:10px;color:#969b9d;line-height:1.4;margin-top:4px}.bn-nav-link:hover,.bn-nav-link[aria-current=page]{background:#ffffff06;color:#eab64b}.bn-controls{display:flex;align-items:center;gap:8px;margin-left:auto}.bn-search{display:flex;align-items:center;gap:10px;min-height:40px;padding:0 10px;border:0;background:transparent;color:#a6aaaa}.bn-search span{font-size:10px}.bn-search kbd{font-size:9px;color:#8f9595;border:1px solid #ffffff20;border-radius:4px;padding:3px}.bn-join{height:34px;display:flex;align-items:center;gap:12px;padding:0 12px;background:#eab64b;border-radius:6px;color:#15130d;font-size:10px;font-weight:700;white-space:nowrap}.bn-icon{width:44px;height:44px;display:inline-flex;justify-content:center;align-items:center;color:#c5c8c8;background:transparent;border:0;border-radius:6px;flex-shrink:0}.bn-icon:hover{background:#ffffff08}.bn-menu-toggle{display:none}.bn-avatar{height:28px;width:28px;border:1px solid #eab64b30;background:#eab64b0a;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#eab64b}.bn-account summary{padding:0 3px;gap:7px}.bn-username{max-width:95px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.bn-account-popover{left:auto;right:0;width:210px}.bn-account-heading{padding:10px;border-bottom:1px solid #ffffff10;margin-bottom:5px;overflow-wrap:anywhere}.bn-account-heading strong{font-size:12px;display:block}.bn-account-heading small{display:block;font-size:10px;color:#9da4a4;margin-top:5px}.bn-account-link{display:flex;gap:10px;align-items:center;width:100%;padding:11px 10px;font-size:11px!important;background:none;border:0;border-radius:5px;color:#c3c6c6;text-align:left}.bn-account-link:hover{background:#ffffff07;color:#eab64b}.bn-logout{border-top:1px solid #ffffff10;border-radius:0;margin-top:4px}.bn-loading{width:32px;height:28px;background:#ffffff08;border-radius:6px}
.bn-dialog{position:fixed;inset:68px 0 auto;width:min(480px,calc(100% - 24px));max-height:calc(100dvh - 88px);padding:0;margin:0 auto;background:#111419;border:1px solid #ffffff20;border-radius:12px;color:#e5e6df;font-family:Arial,Helvetica,sans-serif;box-shadow:0 24px 70px #0008;overflow:auto;overscroll-behavior:contain}.bn-dialog::backdrop{background:#0009;backdrop-filter:blur(5px)}.bn-dialog-content{padding:0 16px 16px}.bn-dialog-top{display:flex;align-items:center;justify-content:space-between;min-height:56px;border-bottom:1px solid #ffffff10;font-size:12px;font-weight:600}.bn-mobile-groups section{margin-top:16px}.bn-mobile-groups h2{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#a7a99e;font-weight:600;margin:0 0 8px}.bn-mobile-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}.bn-mobile-grid a{min-width:0;min-height:44px;display:flex;align-items:center;gap:9px;padding:8px 10px;color:#d9dcd7;background:#ffffff03;border:1px solid #ffffff06;border-radius:6px;font-size:11px}.bn-mobile-grid svg{flex-shrink:0;color:#a4a99f}.bn-mobile-grid a[aria-current=page],.bn-mobile-grid a:hover{background:#eab64b0c;border-color:#eab64b40;color:#eab64b}.bn-mobile-bottom{border-top:1px solid #ffffff12;margin-top:16px;padding-top:12px}.bn-mobile-bottom a{display:flex;justify-content:space-between;align-items:center;min-height:44px;font-size:11px;color:#eab64b}.bn-search-field{display:flex;gap:10px;align-items:center;border:1px solid #ffffff22;border-radius:6px;padding:0 12px;min-height:44px;margin:14px 0;color:#eab64b}.bn-search-field input{min-width:0;width:100%;color:#eee;background:none;border:0;font-size:16px;padding:10px 0}.bn-search-field input::placeholder{color:#8d9494;font-size:12px}.bn-results{max-height:340px;overflow:auto}.bn-results a{display:flex;align-items:center;gap:12px;min-height:54px;padding:10px;color:#a6aeac;border-radius:6px}.bn-results a:hover{background:#ffffff07;color:#eab64b}.bn-results a>span{flex:1}.bn-results strong{display:block;color:#e2e4dd;font-size:11px}.bn-results small{display:block;font-size:10px;margin-top:4px}.bn-results p{font-size:12px;color:#aaa;padding:16px 0}
.bn-notifications>button{width:40px;height:40px;color:#b4b9b6}.bn-notifications [class*="text-[#222]"],.bn-notifications [class*="text-[#666]"],.bn-notifications [class*="text-[#555]"]{color:#9fa6a6}.bn-notifications [class*="top-20"]{top:64px}.bn-notifications [class*="max-h-80"]{max-height:min(320px,calc(100dvh - 160px))}
@media(min-width:768px){.bn-notifications [class*="top-20"]{top:100%}}
@media(max-width:1000px){.bn-bar{padding:0 16px;gap:14px}.bn-search span,.bn-search kbd{display:none}.bn-search{width:40px;padding:0;justify-content:center}.bn-desktop{gap:0}.bn-dropdown summary{padding:0 10px}.bn-username{display:none}}
@media(max-width:760px){.bn-bar{padding:0 10px;gap:8px}.bn-desktop{display:none}.bn-menu-toggle{display:inline-flex}.bn-controls{gap:2px}.bn-logo{gap:6px}.bn-logo>span{font-size:12px}.bn-logo small{font-size:6px;letter-spacing:1px}.bn-logo img{width:24px;height:24px}.bn-search{width:36px;height:44px}.bn-join{height:36px;padding:0 9px;font-size:9px;gap:6px}.bn-join svg{display:none}.bn-account summary{min-height:44px;padding:0 4px}.bn-account summary>svg{display:none}.bn-notifications>button{width:36px;height:44px}.bn-account-popover{position:fixed;top:64px;right:12px;left:auto}}
@media(prefers-reduced-motion:reduce){.bn-header *{animation:none!important;transition:none!important}}
`;
