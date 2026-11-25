import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/app/generated/prisma/client';
import { requireAdmin, apiError, apiSuccess } from '@/lib/api-utils';
import { invalidatePattern } from '@/lib/redis';
import { allocateGroups, buildDrawPlan, defaultDrawConfig, drawSourceSignature, validateDraft, type DrawTeam, type FixtureDraft, type DrawPlan } from '@/lib/tournament-planner';

type Context = { params: Promise<{ id: string }> };
const include = {
  stages: { orderBy: { order: 'asc' as const } },
  registrations: { where: { status: 'APPROVED' as const }, include: { team: { select: { id: true, name: true, tag: true, logo: true } } }, orderBy: [{ seed: 'asc' as const }, { registeredAt: 'asc' as const }] },
  fixtureDraft: true, _count: { select: { matches: true } },
};
type Tournament = Prisma.TournamentGetPayload<{ include: typeof include }>;

function setup(t: Tournament) {
  const defaults = defaultDrawConfig(t);
  const sourceSignature = drawSourceSignature(t.format, defaults, t.tiebreakerSequence);
  const teams: DrawTeam[] = t.registrations.map(r => ({ ...r.team, seed: r.seed }));
  return { defaults, sourceSignature, teams };
}

function responseError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to update the fixture draft.';
  if (message === 'Unauthorized') return apiError(message, 401);
  if (message.includes('Forbidden')) return apiError(message, 403);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return apiError('Another admin changed this tournament. Reload the draft and try again.', 409);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('Fixture draft database error:', error.code);
    return apiError('Unable to save the draft. Please try again.', 500);
  }
  return apiError(message, 400);
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    await requireAdmin('TOURNAMENT_ADMIN');
    const { id } = await context.params;
    const t = await prisma.tournament.findUnique({ where: { id }, include });
    if (!t || t.deletedAt) return apiError('Tournament not found.', 404);
    if (!['GROUP_STAGE', 'ROUND_ROBIN'].includes(t.format)) return apiError('This format does not use a group draw.', 400);
    const { defaults, sourceSignature, teams } = setup(t);
    const draft = (t.fixtureDraft?.data as unknown as FixtureDraft | undefined) ?? { config: defaults, groups: allocateGroups(teams, defaults.numGroups, defaults.drawMode), sourceSignature };
    // Registration setup may save dates before any teams have joined.
    if (teams.length && draft.groups.every(group => group.teamIds.length === 0)) draft.groups = allocateGroups(teams, draft.config.numGroups, draft.config.drawMode);
    let stale = draft.sourceSignature !== sourceSignature;
    let plan: DrawPlan;
    try { validateDraft(draft, teams, t.format); plan = buildDrawPlan(draft, t.format); }
    catch (error) { stale = true; plan = { groups: [], days: [], matches: [], totalMatches: 0, playDays: 0, firstMatch: null, lastMatch: null, issues: [error instanceof Error ? error.message : 'Update the draft settings.'] }; }
    return apiSuccess({ draft, defaults, teams, sourceSignature, stale, revision: t.fixtureDraft?.revision ?? 0, savedAt: t.fixtureDraft?.updatedAt.toISOString() ?? null, publishedMatches: t._count.matches, plan }, 200, { 'Cache-Control': 'private, no-store' });
  } catch (error) { return responseError(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    await requireAdmin('TOURNAMENT_ADMIN');
    const { id } = await context.params;
    const body = await request.json();
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM tournaments WHERE id = ${id} FOR UPDATE`;
      const t = await tx.tournament.findUnique({ where: { id }, include });
      if (!t || t.deletedAt) throw new Error('Tournament not found.');
      if (['COMPLETED', 'CANCELLED'].includes(t.status) || t._count.matches) throw new Error('Fixtures are already published or the tournament has ended. Use match management for changes.');
      const { sourceSignature, teams } = setup(t);
      if (!Number.isInteger(body.revision) || body.revision !== (t.fixtureDraft?.revision ?? 0)) throw new Error('Another admin saved this draft. Reload before saving your changes.');
      const inputDraft: unknown = body.draft;
      validateDraft(inputDraft, teams, t.format);
      if (inputDraft.sourceSignature !== sourceSignature) throw new Error('Tournament settings changed. Reload the planner and use the latest setup settings.');
      const draft: FixtureDraft = { ...inputDraft, groups: inputDraft.groups.map(group => ({ ...group, name: group.name.trim() })) };
      const saved = await tx.tournamentFixtureDraft.upsert({ where: { tournamentId: id }, create: { tournamentId: id, data: draft as unknown as Prisma.InputJsonValue }, update: { data: draft as unknown as Prisma.InputJsonValue, revision: { increment: 1 } } });
      return { draft, revision: saved.revision, savedAt: saved.updatedAt.toISOString(), plan: buildDrawPlan(draft, t.format) };
    }, { isolationLevel: 'Serializable', timeout: 15000 });
    return apiSuccess(result);
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    await requireAdmin('TOURNAMENT_ADMIN');
    const { id } = await context.params;
    const body = await request.json();
    if (body.action !== 'publish') return apiError('Review a draft before publishing.');
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM tournaments WHERE id = ${id} FOR UPDATE`;
      const t = await tx.tournament.findUnique({ where: { id }, include });
      if (!t || t.deletedAt) throw new Error('Tournament not found.');
      if (['COMPLETED', 'CANCELLED'].includes(t.status) || t._count.matches) throw new Error('Fixtures already exist or the tournament has ended. This draft cannot replace them.');
      if (!Number.isInteger(body.revision) || body.revision !== (t.fixtureDraft?.revision ?? 0)) throw new Error('Another admin saved this draft. Reload and review their changes before publishing.');
      const { sourceSignature, teams } = setup(t);
      const inputDraft: unknown = body.draft;
      validateDraft(inputDraft, teams, t.format);
      const draft: FixtureDraft = { ...inputDraft, groups: inputDraft.groups.map(group => ({ ...group, name: group.name.trim() })) };
      if (draft.sourceSignature !== sourceSignature) throw new Error('Tournament settings changed. Refresh the draft before publishing.');
      const plan = buildDrawPlan(draft, t.format);
      if (plan.issues.length) throw new Error(plan.issues.join(' '));
      if (!plan.totalMatches) throw new Error('At least two approved teams are needed to publish fixtures.');
      const c = draft.config;
      const stageData = { name: t.format === 'GROUP_STAGE' ? 'Group stage' : 'Round robin', format: t.format, stageType: t.format === 'GROUP_STAGE' ? 'GROUP_STAGE' as const : 'ROUND_ROBIN' as const, defaultBestOf: c.bestOf, pointSystem: c.pointSystem, numGroups: c.numGroups, teamsPerGroup: null, teamsAdvancingPerGroup: t.format === 'GROUP_STAGE' ? c.advancingPerGroup : null, tiebreakerSequence: t.tiebreakerSequence, startsAt: new Date(plan.firstMatch!), endsAt: new Date(plan.lastMatch!) };
      const existingStage = t.stages.find(s => ['GROUP_STAGE', 'ROUND_ROBIN'].includes(s.stageType));
      const stage = existingStage ? await tx.tournamentStage.update({ where: { id: existingStage.id }, data: stageData }) : await tx.tournamentStage.create({ data: { tournamentId: id, order: 1, ...stageData } });
      await tx.round.deleteMany({ where: { stageId: stage.id } });
      await tx.tournamentGroup.deleteMany({ where: { tournamentId: id } });
      await tx.groupStageStanding.deleteMany({ where: { tournamentId: id } });
      for (const group of draft.groups) {
        await tx.tournamentGroup.create({ data: { tournamentId: id, name: group.name, teams: { create: group.teamIds.map(teamId => ({ teamId })) } } });
      }
      await tx.groupStageStanding.createMany({ data: draft.groups.flatMap(group => group.teamIds.map(teamId => ({ tournamentId: id, groupName: group.name, teamId }))) });
      const roundIds = new Map<number, string>();
      for (const round of [...new Set(plan.matches.map(match => match.round))]) {
        const record = await tx.round.create({ data: { stageId: stage.id, number: round, displayName: `Round ${round}`, bestOf: c.bestOf } });
        roundIds.set(round, record.id);
      }
      await tx.match.createMany({ data: plan.matches.map((match, index) => ({ tournamentId: id, stageId: stage.id, roundId: roundIds.get(match.round), teamAId: match.teamAId, teamBId: match.teamBId, scheduledTime: new Date(match.scheduledTime), round: match.round, playDay: match.playDay, lobby: match.lobby, bracketType: 'GROUP_STAGE', bestOf: c.bestOf, status: 'UPCOMING', stage: `Group Stage - ${match.groupName} - Match ${index + 1}` })) });
      const equalSize = new Set(draft.groups.map(group => group.teamIds.length)).size === 1;
      await tx.tournament.update({ where: { id }, data: { date: new Date(plan.firstMatch!), playDaysPerWeek: c.playDays, matchesPerDay: c.matchesPerDay, defaultBestOf: c.bestOf, pointSystem: c.pointSystem, numGroups: c.numGroups, roundRobinLegs: c.legs, drawMode: c.drawMode, teamsPerGroup: equalSize ? draft.groups[0].teamIds.length : null, matchesPerTeam: equalSize ? plan.groups[0].perTeam : null, matchesBeforeBracket: plan.totalMatches, status: t.status === 'ONGOING' ? 'ONGOING' : 'CLOSED' } });
      await tx.tournamentFixtureDraft.deleteMany({ where: { tournamentId: id } });
      return { message: `Published ${plan.totalMatches} series across ${draft.groups.length} groups and ${plan.playDays} play days.`, matchCount: plan.totalMatches };
    }, { isolationLevel: 'Serializable', timeout: 30000 });
    await Promise.all([invalidatePattern(`tournament:matches:${id}:*`), invalidatePattern('tournaments:*')]);
    return apiSuccess(result, 201);
  } catch (error) { return responseError(error); }
}
