import { NextRequest } from 'next/server';
import type { Prisma } from '@/app/generated/prisma/client';
import { requireAdmin, apiError, apiSuccess } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import {
  ACTIVE_TOURNAMENT_STATUSES, REVIEW_MATCH_STATUSES, TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS,
  type DeskTournament, type DeskTournamentFormat, type DeskTournamentStatus, type TournamentDeskView,
} from '@/lib/tournament-dashboard';

const PAGE_SIZE = 12;
const selectTournament = {
  id: true, name: true, subtitle: true, status: true, format: true, date: true,
  registrationDeadline: true, slots: true, banner: true, heroImage: true, isOnline: true, location: true, prizePool: true,
  season: { select: { id: true, name: true } },
  stages: { select: { id: true, name: true, status: true, order: true }, orderBy: { order: 'asc' as const } },
  _count: { select: { waitlist: true } },
} satisfies Prisma.TournamentSelect;

const reviewWhere: Prisma.MatchWhereInput = {
  OR: [{ status: { in: [...REVIEW_MATCH_STATUSES] } }, { status: 'COMPLETED', statsFinalized: false, teamBId: { not: null } }],
};
const eligibleMatchWhere: Prisma.MatchWhereInput = {
  status: { notIn: ['CANCELLED', 'RESTING'] },
  NOT: { status: 'COMPLETED', teamBId: null },
};

function attentionWhere(now: Date): Prisma.TournamentWhereInput {
  return {
    status: { not: 'CANCELLED' },
    OR: [
      { matches: { some: reviewWhere } },
      {
        status: { in: ACTIVE_TOURNAMENT_STATUSES },
        OR: [
          { registrations: { some: { status: 'PENDING' } } },
          { status: 'OPEN', registrationDeadline: { lte: now } },
          { status: { in: ['CLOSED', 'ONGOING'] }, matches: { none: eligibleMatchWhere } },
          { status: { in: ['UPCOMING', 'OPEN', 'CLOSED'] }, date: { lte: now } },
        ],
      },
    ],
  };
}

// The operations desk deliberately reads fresh, role-protected data rather than
// the cached public tournament listing.
export async function GET(request: NextRequest) {
  try {
    await requireAdmin('TOURNAMENT_ADMIN');
    const params = request.nextUrl.searchParams;
    const view = params.get('view') || 'active';
    const status = params.get('status') || '';
    const format = params.get('format') || '';
    const seasonId = params.get('season') || '';
    const search = (params.get('q') || '').trim();
    const sort = params.get('sort') || 'soonest';
    const pageValue = params.get('page') || '1';
    if (!['active', 'attention', 'all', 'archive'].includes(view) ||
        !['soonest', 'newest', 'name'].includes(sort) ||
        (status && !Object.hasOwn(TOURNAMENT_STATUS_LABELS, status)) ||
        (format && !Object.hasOwn(TOURNAMENT_FORMAT_LABELS, format)) ||
        !/^[1-9]\d*$/.test(pageValue) || Number(pageValue) > 100000 ||
        search.length > 100 || seasonId.length > 100) return apiError('Invalid tournament filters.', 400);

    const now = new Date();
    const scope: Prisma.TournamentWhereInput = { deletedAt: null, ...(seasonId ? { seasonId } : {}) };
    const searchFormats = Object.entries(TOURNAMENT_FORMAT_LABELS).filter(([, label]) => label.toLowerCase().includes(search.toLowerCase())).map(([key]) => key as DeskTournamentFormat);
    const filters: Prisma.TournamentWhereInput = {
      ...scope,
      ...(status ? { status: status as DeskTournamentStatus } : {}),
      ...(format ? { format: format as DeskTournamentFormat } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { subtitle: { contains: search, mode: 'insensitive' as const } },
        { season: { name: { contains: search, mode: 'insensitive' as const } } },
        ...(searchFormats.length ? [{ format: { in: searchFormats } }] : []),
      ] } : {}),
    };
    const views: Record<TournamentDeskView, Prisma.TournamentWhereInput> = {
      active: { status: { in: ACTIVE_TOURNAMENT_STATUSES } },
      attention: attentionWhere(now),
      all: {},
      archive: { status: { in: ['COMPLETED', 'CANCELLED'] } },
    };
    const activeScope: Prisma.TournamentWhereInput = { AND: [scope, views.active] };

    const [viewTotals, statusGroups, pending, review, attentionTotal, attentionRows, seasons, fixtures] = await Promise.all([
      Promise.all(Object.entries(views).map(async ([key, where]) => [key, await prisma.tournament.count({ where: { AND: [filters, where] } })] as const)),
      prisma.tournament.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      prisma.tournamentRegistration.count({ where: { status: 'PENDING', tournament: activeScope } }),
      prisma.match.count({ where: { AND: [reviewWhere, { tournament: { AND: [scope, { status: { not: 'CANCELLED' } }] } }] } }),
      prisma.tournament.count({ where: { AND: [scope, views.attention] } }),
      prisma.tournament.findMany({ where: { AND: [scope, views.attention] }, select: selectTournament, orderBy: [{ date: 'asc' }, { id: 'asc' }], take: 4 }),
      prisma.season.findMany({ select: { id: true, name: true, status: true, startDate: true, endDate: true }, orderBy: [{ startDate: 'desc' }, { id: 'asc' }] }),
      prisma.match.findMany({
        where: { tournament: activeScope, teamBId: { not: null }, OR: [{ status: 'LIVE' }, { status: { in: ['UPCOMING', 'READY'] }, scheduledTime: { gte: now } }] },
        select: { id: true, scheduledTime: true, status: true, tournament: { select: { id: true, name: true } }, teamA: { select: { name: true, tag: true } }, teamB: { select: { name: true, tag: true } } },
        orderBy: [{ scheduledTime: 'asc' }, { id: 'asc' }], take: 4,
      }),
    ]);
    const viewCounts = Object.fromEntries(viewTotals) as Record<TournamentDeskView, number>;
    const total = viewCounts[view as TournamentDeskView];
    const page = Math.min(Number(pageValue), Math.max(1, Math.ceil(total / PAGE_SIZE)));
    const orderBy: Prisma.TournamentOrderByWithRelationInput[] = sort === 'name' ? [{ name: 'asc' }, { id: 'asc' }]
      : sort === 'newest' ? [{ createdAt: 'desc' }, { id: 'desc' }]
      : [{ date: view === 'archive' ? 'desc' : 'asc' }, { id: 'asc' }];
    const rows = await prisma.tournament.findMany({
      where: { AND: [filters, views[view as TournamentDeskView]] }, select: selectTournament,
      orderBy, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE,
    });
    const ids = [...new Set([...rows, ...attentionRows].map(row => row.id))];
    const counts = new Map<string, DeskTournament['counts']>(ids.map(id => [id, { approved: 0, pending: 0, waitlist: 0, matches: 0, completed: 0, live: 0, review: 0, disputed: 0 }]));
    if (ids.length) {
      const [registrations, matches] = await Promise.all([
        prisma.tournamentRegistration.groupBy({ by: ['tournamentId', 'status'], where: { tournamentId: { in: ids }, status: { in: ['APPROVED', 'PENDING'] } }, _count: { _all: true } }),
        prisma.match.groupBy({ by: ['tournamentId', 'status', 'statsFinalized'], where: { ...eligibleMatchWhere, tournamentId: { in: ids } }, _count: { _all: true } }),
      ]);
      for (const row of registrations) {
        const count = counts.get(row.tournamentId)!;
        if (row.status === 'APPROVED') count.approved += row._count._all;
        else count.pending += row._count._all;
      }
      for (const row of matches) {
        const count = counts.get(row.tournamentId)!;
        const number = row._count._all;
        count.matches += number;
        if (row.status === 'COMPLETED' || row.status === 'FORFEITED') count.completed += number;
        if (row.status === 'LIVE') count.live += number;
        if (row.status === 'DISPUTED') count.disputed += number;
        if ((REVIEW_MATCH_STATUSES as readonly string[]).includes(row.status) || (row.status === 'COMPLETED' && !row.statsFinalized)) count.review += number;
      }
    }
    function serialize(row: typeof rows[number]): DeskTournament {
      const { _count, ...tournament } = row;
      return { ...tournament, date: row.date.toISOString(), registrationDeadline: row.registrationDeadline.toISOString(), counts: { ...counts.get(row.id)!, waitlist: _count.waitlist } };
    }
    return apiSuccess({
      tournaments: rows.map(serialize), pagination: { total, page, pageSize: PAGE_SIZE },
      viewCounts, summary: {
        live: statusGroups.find(group => group.status === 'ONGOING')?._count._all ?? 0,
        open: statusGroups.find(group => group.status === 'OPEN')?._count._all ?? 0,
        pending, review,
      },
      attention: attentionRows.map(serialize), attentionTotal, seasons, fixtures, generatedAt: now.toISOString(),
    }, 200, { 'Cache-Control': 'private, no-store' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load the tournament desk.';
    if (message === 'Unauthorized') return apiError(message, 401);
    if (message.includes('Forbidden')) return apiError(message, 403);
    console.error('Tournament desk error:', error);
    return apiError('Unable to load the tournament desk. Please try again.', 500);
  }
}

