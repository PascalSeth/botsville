import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Newspaper, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import TeamLogo from "./tournaments/TeamLogo";
import styles from "./overview.module.css";

const team = { select: { name: true, tag: true, logo: true } } as const;
const event = { id: true, name: true, banner: true, heroImage: true } as const;
const fixture = {
  id: true, status: true, scheduledTime: true, stage: true, bestOf: true,
  scoreA: true, scoreB: true, teamA: team, teamB: team, tournament: { select: event },
} as const;
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export default async function DashboardOverviewPage() {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayMs = 86_400_000;
  const weekStart = new Date(today - 6 * dayMs);
  const previousStart = new Date(today - 13 * dayMs);
  const week = { gte: weekStart, lte: now };
  const published = { status: "PUBLISHED" as const, deletedAt: null };
  const eligible = { deletedAt: null, status: { notIn: ["CANCELLED", "COMPLETED"] as ("CANCELLED" | "COMPLETED")[] } };
  const scheduled = { tournament: eligible, teamBId: { not: null } };
  const [live, upcoming, nextEvent, posts, teams, users, tournaments, season, signups, newTeams, ongoing, publishedCount, newPosts, reactions] = await Promise.all([
    prisma.match.findMany({ where: { ...scheduled, status: "LIVE" }, select: fixture, orderBy: { scheduledTime: "asc" }, take: 5 }),
    prisma.match.findMany({ where: { ...scheduled, status: { in: ["UPCOMING", "READY"] }, scheduledTime: { gte: now } }, select: fixture, orderBy: { scheduledTime: "asc" }, take: 5 }),
    prisma.tournament.findFirst({ where: eligible, select: event, orderBy: { date: "desc" } }),
    prisma.news.findMany({ where: { status: "PUBLISHED", deletedAt: null }, orderBy: { publishedAt: "desc" }, take: 3,
      select: { id: true, title: true, format: true, publishedAt: true, image: true, images: true } }),
    prisma.team.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.tournament.count({ where: { deletedAt: null } }),
    prisma.season.findFirst({ where: { status: "ACTIVE" }, select: { name: true } }),
    prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT to_char("createdAt", 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
      FROM "users" WHERE "deletedAt" IS NULL AND "createdAt" BETWEEN ${previousStart} AND ${now}
      GROUP BY 1
    `,
    prisma.team.count({ where: { deletedAt: null, registeredAt: week } }),
    prisma.tournament.count({ where: { deletedAt: null, status: "ONGOING" } }),
    prisma.news.count({ where: published }),
    prisma.news.count({ where: { ...published, publishedAt: week } }),
    prisma.newsReaction.count({ where: { createdAt: week, news: published } }),
  ]);
  const dailyCounts = new Map(signups.map(row => [row.date, row.count]));
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(previousStart.getTime() + index * dayMs);
    return { date, count: dailyCounts.get(date.toISOString().slice(0, 10)) ?? 0 };
  });
  const currentWeek = days.slice(7);
  const total = (items: typeof days) => items.reduce((sum, item) => sum + item.count, 0);
  const weeklySignups = total(currentWeek);
  const previousSignups = total(days.slice(0, 7));
  const peak = Math.max(1, ...currentWeek.map(item => item.count));
  const metrics = [
    { label: "Registered users", count: users, detail: weeklySignups + " joined in 7 days", href: "/dashboard/users" },
    { label: "Teams", count: teams, detail: newTeams + " registered in 7 days", href: "/dashboard/teams" },
    { label: "Tournaments", count: tournaments, detail: ongoing + " in progress", href: "/dashboard/tournaments" },
    { label: "Published posts", count: publishedCount, detail: newPosts + " published in 7 days", href: "/dashboard/news" },
  ];
  const [lead, ...queue] = [...live, ...upcoming];
  const competition = lead?.tournament ?? nextEvent;
  const artwork = competition?.banner || competition?.heroImage || "/heroes/granger.png";

  return (
    <div className={styles.desk}>
      <section className={styles.seasonPoster} aria-label="Site overview and registrations">
        <div className={styles.illustration} aria-hidden="true">
          <Image src="/heroes/brody.png" alt="" width={391} height={638} className={styles.brody} sizes="(max-width: 700px) 36vw, 220px" />
          <Image src="/heroes/badang.png" alt="" width={375} height={666} className={styles.badang} sizes="(max-width: 700px) 54vw, 330px" priority />
        </div>
        <div className={styles.posterData}>
          <header>
            <p>{season?.name || "Botsville MLBB"} · {day.format(now)}</p>
            <h1>Site overview</h1>
          </header>
        <div className={styles.chart}>
          <header><h2>New registrations</h2><small>{day.format(weekStart)} – {day.format(now)} · UTC</small></header>
          <div className={styles.bars}>
            {currentWeek.map(item => (
              <div key={item.date.getTime()} aria-label={day.format(item.date) + ", " + item.count + " registrations"}>
                <b>{item.count}</b>
                <i style={{ height: (item.count / peak) * 56 }} />
                <span>{item.date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span>
              </div>
            ))}
          </div>
          <p>{weeklySignups} signups this period · {previousSignups} in the previous seven days</p>
        </div>
        </div>
      </section>
      <section className={styles.metrics} aria-label="Site totals">
        {metrics.map(metric => (
          <Link href={metric.href} key={metric.label}>
            <span>{metric.label}<ArrowUpRight size={14} /></span>
            <strong>{metric.count.toLocaleString()}</strong>
            <small>{metric.detail}</small>
          </Link>
        ))}
      </section>
      <div className={styles.board}>
        <section className={styles.spotlight} aria-label="Featured competition">
          <img src={artwork} alt="" className={styles.cover} />
          <div className={styles.poster}>
            <span className={styles.flag} data-live={lead?.status === "LIVE"}>{lead ? (lead.status === "LIVE" ? "Live now" : "Next match") : "Competition"}</span>
            <h2>{competition?.name || "Tournament desk"}</h2>
            {lead ? <>
              <p>{lead.stage && lead.stage + " · "}Best of {lead.bestOf}</p>
              <div className={styles.duel}>
                {[lead.teamA, lead.teamB].map((side, index) => (
                  <div key={index}><TeamLogo team={side} size={56} /><strong>{side?.name || "TBD"}</strong></div>
                ))}
                <b>{lead.status === "LIVE" ? lead.scoreA + " – " + lead.scoreB : "vs"}</b>
              </div>
            </> : <p>No upcoming fixtures scheduled.</p>}
            <footer>
              {lead && <time dateTime={lead.scheduledTime.toISOString()}>{day.format(lead.scheduledTime)} · {time.format(lead.scheduledTime)} UTC</time>}
              <Link href={lead ? `/matches/${lead.id}` : competition ? `/dashboard/tournaments/${competition.id}` : "/dashboard/tournaments"}>
                {lead ? "Match details" : "Open tournament desk"} <ArrowUpRight size={15} />
              </Link>
            </footer>
          </div>
        </section>
        <section className={styles.schedule}>
          <header><h2>Fixture list</h2><span>UTC</span></header>
          {queue.slice(0, 4).map(match => (
            <Link key={match.id} href={`/matches/${match.id}`} className={styles.fixture}>
              <time dateTime={match.scheduledTime.toISOString()}>{match.status === "LIVE" ? "Live" : time.format(match.scheduledTime)}<small>{day.format(match.scheduledTime)}</small></time>
              <span>{[match.teamA, match.teamB].map((side, index) => <strong key={index}><TeamLogo team={side} size={22} />{side?.name || "TBD"}</strong>)}</span>
            </Link>
          ))}
          {!queue.length && <p>{lead ? "No further fixtures scheduled." : "The schedule is clear."}</p>}
          <Link className={styles.more} href="/dashboard/matches">Manage matches <ArrowUpRight size={14} /></Link>
        </section>
      </div>

      <section className={styles.news}>
        <header><h2>Latest posts</h2><Link href="/dashboard/news">News desk <ArrowUpRight size={14} /></Link></header>
        <p className={styles.newsActivity}>{newPosts.toLocaleString()} posts published · {reactions.toLocaleString()} reactions in the last seven days</p>
        <div className={styles.stories}>{posts.map(post => {
          const cover = post.image || post.images[0];
          return <Link key={post.id} href={`/dashboard/news/${post.id}`}>
            <div className={styles.thumb}>{cover ? <img src={cover} alt="" loading="lazy" /> : <Newspaper size={25} />}</div>
            <div><small>{post.format.replaceAll("_", " ")}{post.publishedAt && " · " + day.format(post.publishedAt)}</small><h3>{post.title}</h3></div>
          </Link>;
        })}</div>
        {!posts.length && <p>No published posts yet.</p>}
      </section>
      <nav className={styles.directory} aria-label="Administration shortcuts">
        <Link href="/dashboard/tournaments/setup"><Plus size={14} /> Create tournament</Link>
        <Link href="/dashboard/seasons">Seasons</Link><Link href="/dashboard/fan-art">Fan art review</Link><Link href="/dashboard/audit-log">Audit log</Link>
      </nav>
    </div>
  );
}
