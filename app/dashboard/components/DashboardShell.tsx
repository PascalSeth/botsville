"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Dialog, Popover } from "radix-ui";
import styles from "./dashboard-shell.module.css";
import {
  LayoutDashboard,
  Users,
  Shield,
  X,
  Trophy,
  UsersRound,
  Swords,
  Newspaper,
  ImagePlus,
  Brain,
  Video,
  Palette,
  FileText,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  ExternalLink,
  Bell,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRole } from "../lib/useRole";

const SIDEBAR_NAV: { label: string; href: string; icon: React.ReactNode; group: string; roles?: string[] }[] = [
  { group: "Workspace", label: "Overview", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { group: "Administration", label: "Admin roles", href: "/dashboard/roles", icon: <Shield size={18} />, roles: ["SUPER_ADMIN"] },
  { group: "Administration", label: "Users", href: "/dashboard/users", icon: <Users size={18} /> },
  { group: "Competition", label: "Teams", href: "/dashboard/teams", icon: <UsersRound size={18} /> },
  { group: "Competition", label: "Tournaments & Seasons", href: "/dashboard/tournaments", icon: <Trophy size={18} /> },
  { group: "Competition", label: "Solo Draft", href: "/dashboard/solo-draft", icon: <UsersRound size={18} />, roles: ["SUPER_ADMIN", "TOURNAMENT_ADMIN"] },
  { group: "Competition", label: "Matches", href: "/dashboard/matches", icon: <Swords size={18} /> },
  { group: "Competition", label: "Weekly Scrims", href: "/dashboard/scrims", icon: <Swords size={18} />, roles: ["SUPER_ADMIN", "TOURNAMENT_ADMIN"] },
  { group: "Publishing", label: "News", href: "/dashboard/news", icon: <Newspaper size={18} /> },
  { group: "Publishing", label: "Trivia", href: "/dashboard/trivia", icon: <Brain size={18} />, roles: ["SUPER_ADMIN", "CONTENT_ADMIN"] },
  { group: "Publishing", label: "Heroes", href: "/dashboard/heroes", icon: <ImagePlus size={18} /> },
  { group: "Publishing", label: "Scrim vault", href: "/dashboard/scrim-vault", icon: <Video size={18} /> },
  { group: "Publishing", label: "Fan art", href: "/dashboard/fan-art", icon: <Palette size={18} /> },
  { group: "Administration", label: "Audit log", href: "/dashboard/audit-log", icon: <FileText size={18} /> },
];

type User = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  ign?: string | null;
  role?: string | null;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  read: boolean;
  createdAt: string;
};

function formatNotificationTime(createdAt: string) {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function DashboardNotificationBell({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=8", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = (await response.json()) as {
        notifications?: NotificationItem[];
        pagination?: { unreadCount?: number };
      };

      setNotifications(payload.notifications ?? []);
      setUnreadCount(payload.pagination?.unreadCount ?? 0);
    } catch {
      // ignore navbar errors
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
      return;
    }

    void fetchNotifications();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchNotifications();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchNotifications, isLoggedIn]);

  useEffect(() => {
    if (!isOpen) return;
    void fetchNotifications();
  }, [fetchNotifications, isOpen]);

  const markOneAsRead = async (notificationId: string) => {
    const current = notifications.find((item) => item.id === notificationId);
    if (!current || current.read) return;

    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch("/api/notifications", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
    } catch {
      // optimistic update only
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch {
      // optimistic update only
    }
  };

  if (!isLoggedIn) return null;

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild><button
        className={styles.iconButton}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className={styles.unread}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button></Popover.Trigger>
      <Popover.Portal><Popover.Content className={styles.notifications} align="end" sideOffset={8} collisionPadding={10} aria-label="Notifications">
            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
              <p className="text-white font-bold text-xs tracking-wider uppercase">Notifications</p>
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-[10px] font-bold uppercase tracking-wider text-[#888] hover:text-[#e8a000] disabled:opacity-50"
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <p className="px-3 py-4 text-xs text-[#777]">Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p className="px-3 py-4 text-xs text-[#777]">No notifications yet.</p>
              ) : (
                notifications.map((item) => {
                  const content = (
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full ${item.read ? "bg-[#333]" : "bg-[#e8a000]"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">{item.title}</p>
                        <p className="text-[11px] text-[#aaa] leading-relaxed">{item.message}</p>
                        <p className="text-[10px] text-[#666] mt-1">{formatNotificationTime(item.createdAt)}</p>
                      </div>
                    </div>
                  );

                  return item.linkUrl ? (
                    <Link
                      key={item.id}
                      href={item.linkUrl}
                      onClick={() => {
                        void markOneAsRead(item.id);
                        setIsOpen(false);
                      }}
                      className="block px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={item.id}
                      onClick={() => {
                        void markOneAsRead(item.id);
                      }}
                      className="w-full text-left px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      {content}
                    </button>
                  );
                })
              )}
            </div>
          </Popover.Content></Popover.Portal>
    </Popover.Root>
  );
}

const GROUPS = ["Workspace", "Competition", "Publishing", "Administration"];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className={styles.brand} aria-label="Botsville dashboard">
      <Image src="/mlbb_logobg.png" alt="" width={38} height={38} />
      {!compact && <span><strong>Botsville</strong><small>Dashboard</small></span>}
    </Link>
  );
}

export function DashboardShell({ children, user }: { children: React.ReactNode; user: User }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role } = useRole();
  const activeRole = role || user.role;
  const name = user.ign || user.name || user.email || "Admin";
  const roleLabel = (activeRole || "Admin").replaceAll("_", " ").toLowerCase();
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
  const visible = SIDEBAR_NAV.filter(item => !item.roles || (activeRole && item.roles.includes(activeRole)));
  const seasonRoute = /^\/dashboard\/seasons(?:\/|$)/.test(pathname);
  const current = visible.find(item =>
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
    (seasonRoute && item.href === "/dashboard/tournaments")
  );
  const section = seasonRoute ? "Seasons" : current?.label || pathname.split("/")[2]?.replaceAll("-", " ") || "Overview";

  useEffect(() => {
    if (!mobileOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [mobileOpen]);

  function navigation(compact: boolean, mobile = false) {
    return (
      <nav className={styles.nav} aria-label="Dashboard navigation">
        {GROUPS.map(group => {
          const links = visible.filter(item => item.group === group);
          if (!links.length) return null;
          return <section key={group} aria-label={group}>
            {!compact && group !== "Workspace" && <h2>{group}</h2>}
            {links.map(item => (
              <Link key={item.href} href={item.href} className={styles.navLink}
                aria-current={current === item ? (pathname === item.href ? "page" : "location") : undefined}
                aria-label={item.label} title={compact ? item.label : undefined}
                onClick={mobile ? () => setMobileOpen(false) : undefined}>
                {item.icon}{!compact && <span>{item.label}</span>}
              </Link>
            ))}
          </section>;
        })}
      </nav>
    );
  }

  return (
    <div className={styles.shell} data-compact={collapsed}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBar}><Brand compact={collapsed} /></div>
        {navigation(collapsed)}
        <button className={styles.railToggle} onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}>
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} />Collapse navigation</>}
        </button>
      </aside>

      <div className={styles.body}>
        <header className={styles.topbar}>
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger asChild>
              <button className={styles.menuButton} aria-label="Open dashboard navigation"><Menu size={19} /></button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className={styles.scrim} />
              <Dialog.Content className={styles.drawer} aria-describedby={undefined}>
                <Dialog.Title className="sr-only">Dashboard navigation</Dialog.Title>
                <div className={styles.brandBar}>
                  <Dialog.Close asChild><Link href="/dashboard" className={styles.brand}>
                    <Image src="/mlbb_logobg.png" alt="" width={38} height={38} />
                    <span><strong>Botsville</strong><small>Dashboard</small></span>
                  </Link></Dialog.Close>
                  <Dialog.Close asChild><button className={styles.iconButton} aria-label="Close navigation"><X size={18} /></button></Dialog.Close>
                </div>
                {navigation(false, true)}
                <Dialog.Close asChild><Link href="/" className={styles.railToggle}><ExternalLink size={15} /> View public site</Link></Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className={styles.path}>
            <Link href="/dashboard">Dashboard</Link><ChevronRight size={13} /><strong>{section}</strong>
          </div>
          <div className={styles.actions}>
            <Link href="/" className={styles.siteLink}><ExternalLink size={14} /> View site</Link>
            <DashboardNotificationBell isLoggedIn={Boolean(user.id)} />
            <Popover.Root>
              <Popover.Trigger asChild>
                <button className={styles.account} aria-label={`Account options for ${name}`}>
                  <span className={styles.avatar}>{initials}</span>
                  <span className={styles.identity}><strong>{name}</strong><small>{roleLabel}</small></span>
                </button>
              </Popover.Trigger>
              <Popover.Portal><Popover.Content className={styles.accountPanel} align="end" sideOffset={8} collisionPadding={10} aria-label="Account options">
                <strong>{name}</strong><small>{roleLabel}</small>
                <button onClick={() => signOut({ callbackUrl: "/" })}><LogOut size={15} /> Sign out</button>
              </Popover.Content></Popover.Portal>
            </Popover.Root>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6"><div className="mx-auto max-w-7xl">{children}</div></main>
      </div>
    </div>
  );
}
