import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  UsersRound,
  Users,
  Calendar,
  Newspaper,
  TrendingUp,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

export default async function DashboardOverviewPage() {
  const session = await auth();
  const [teamsCount, usersCount, tournamentsCount, activeSeason, recentNews] =
    await Promise.all([
      prisma.team.count(),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.tournament.count(),
      prisma.season.findFirst({
        where: { status: "ACTIVE" },
        select: { name: true, id: true },
      }),
      prisma.news.findMany({
        where: { status: "PUBLISHED" },
        take: 3,
        orderBy: { publishedAt: "desc" },
        select: { id: true, title: true, publishedAt: true },
      }),
    ]);

  const stats = [
    {
      label: "Teams",
      value: teamsCount,
      href: "/dashboard/teams",
      icon: <UsersRound size={22} />,
      color: "from-amber-500/20 to-orange-600/10 border-amber-500/30",
    },
    {
      label: "Users",
      value: usersCount,
      href: "/dashboard/users",
      icon: <Users size={22} />,
      color: "from-emerald-500/20 to-teal-600/10 border-emerald-500/30",
    },
    {
      label: "Tournaments",
      value: tournamentsCount,
      href: "/dashboard/tournaments",
      icon: <Calendar size={22} />,
      color: "from-violet-500/20 to-purple-600/10 border-violet-500/30",
    },
    {
      label: "Active season",
      value: activeSeason?.name ?? "—",
      href: "/dashboard/seasons",
      icon: <TrendingUp size={22} />,
      color: "from-[#e8a000]/20 to-amber-600/10 border-[#e8a000]/40",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div className="border-b border-white/[0.06] pb-4">
        <h1 className="font-black text-2xl sm:text-3xl text-white uppercase tracking-[0.08em]">
          Overview
        </h1>
        <p className="mt-1 text-sm text-[#888] tracking-wide">
          Welcome back, {(session?.user as { ign?: string })?.ign ?? "Admin"}. Here’s what’s happening on the platform.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`
              group relative overflow-hidden rounded-lg border bg-gradient-to-br p-5
              transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
              ${stat.color}
            `}
          >
            <div className="absolute right-3 top-3 text-white/10 group-hover:text-white/20 transition-colors">
              {stat.icon}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888]">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-white">
              {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#e8a000] opacity-0 group-hover:opacity-100 transition-opacity">
              Manage <ArrowRight size={12} />
            </span>
          </Link>
        ))}
      </div>

      {/* Quick links + Recent news */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick actions */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0f]/80 p-5">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#e8a000] mb-4">
            Quick actions
          </h2>
          <ul className="space-y-2">
            {[
              { label: "Create tournament", href: "/dashboard/tournaments?new=1" },
              { label: "Manage seasons", href: "/dashboard/seasons" },
              { label: "View audit log", href: "/dashboard/audit-log" },
              { label: "Approve fan art", href: "/dashboard/fan-art" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 text-sm font-bold text-[#aaa] tracking-wider uppercase transition-colors hover:border-[#e8a000]/20 hover:bg-[#e8a000]/5 hover:text-white"
                >
                  {item.label}
                  <ArrowRight size={14} className="text-[#e8a000] opacity-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent news */}
        <div className="rounded-lg border border-white/[0.06] bg-[#0a0a0f]/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#e8a000]">
              Recent news
            </h2>
            <Link
              href="/dashboard/news"
              className="text-[10px] font-bold uppercase tracking-wider text-[#666] hover:text-[#e8a000] transition-colors"
            >
              All news
            </Link>
          </div>
          {recentNews.length === 0 ? (
            <div className="flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] px-4 py-4">
              <Newspaper size={20} className="text-[#444]" />
              <p className="text-sm text-[#666]">No published articles yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentNews.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/dashboard/news?id=${n.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm text-[#aaa] transition-colors hover:border-[#e8a000]/20 hover:bg-[#e8a000]/5 hover:text-white"
                  >
                    <span className="truncate font-semibold">{n.title}</span>
                    <span className="shrink-0 text-[10px] text-[#555]">
                      {n.publishedAt
                        ? new Date(n.publishedAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-[#e8a000]/20 bg-[#e8a000]/5 p-4">
        <AlertCircle size={20} className="shrink-0 text-[#e8a000]" />
        <div>
          <p className="text-sm font-bold text-white">
            Admin dashboard — Botsville MLBB
          </p>
          <p className="mt-1 text-xs text-[#888]">
            Use the sidebar to manage users, seasons, teams, tournaments, matches, news, scrim vault, fan art, and view the audit log. Your access depends on your assigned role.
          </p>
        </div>
      </div>
    </div>
  );
}
