import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planLineupChange, chooseJoinPosition, TEAM_ROLES, parseTeamRole } from '../lib/team-lineup';
import { isTeamApplication, invitedRole } from '../lib/team-invites';
const starters = TEAM_ROLES.map((role, index) => ({ id: 'p' + index, ign: 'Player ' + index, role, isSubstitute: false }));
const sub = { id: 'sub', ign: 'Sub', role: 'MID', isSubstitute: true };
const apply = (roster: typeof sub[], command: Parameters<typeof planLineupChange>[2], id = sub.id) => {
  const changes = planLineupChange(roster, id, command);
  return roster.map(p => ({ ...p, ...changes.find(c => c.id === p.id) }));
};
test('promotion into a full lineup requires a named replacement', () => {
  assert.throws(() => planLineupChange([...starters, sub], sub.id, { isSubstitute: false }), /full/);
});
test('replacement keeps five unique roles and benches exactly the chosen starter', () => {
  const result = apply([...starters, sub], { replacePlayerId: 'p1' });
  assert.equal(result.find(p => p.id === sub.id)?.role, 'JUNGLE');
  assert.equal(result.find(p => p.id === 'p1')?.isSubstitute, true);
  assert.equal(result.filter(p => !p.isSubstitute).length, 5);
  assert.equal(new Set(result.filter(p => !p.isSubstitute).map(p => p.role)).size, 5);
});
test('substitution works from either player and preserves the outgoing role', () => {
  const result = apply([...starters, sub], { replacePlayerId: sub.id }, 'p3');
  assert.equal(result.find(p => p.id === sub.id)?.role, 'GOLD');
  assert.equal(result.find(p => p.id === 'p3')?.role, 'GOLD');
  assert.equal(result.find(p => p.id === 'p3')?.isSubstitute, true);
});
test('a promotion can fill an open position without moving anyone else', () => {
  const result = apply([...starters.slice(0,4), sub], { isSubstitute: false, role: 'ROAM' });
  assert.equal(result.filter(p => !p.isSubstitute).length, 5);
  assert.deepEqual(result.slice(0,4), starters.slice(0,4));
});
test('a sub can replace an occupied role even when another role is open', () => {
  const result = apply([...starters.slice(0,3), sub], { replacePlayerId: 'p2', role: 'MID' });
  assert.equal(result.filter(p => !p.isSubstitute).length, 3);
  assert.equal(result.find(p => p.id === 'p2')?.isSubstitute, true);
});
test('benching a starter leaves an open role and never auto-promotes another sub', () => {
  const result = apply([...starters, sub], { isSubstitute: true }, 'p0');
  assert.equal(result.filter(p => !p.isSubstitute).length, 4);
  assert.equal(result.find(p => p.id === sub.id)?.isSubstitute, true);
});
test('role swaps update both starters', () => {
  const result = apply(starters, { swapRoleWithPlayerId: 'p2' }, 'p0');
  assert.equal(result[0].role, 'MID'); assert.equal(result[2].role, 'EXP');
});
test('editing an occupied starter role requires explicit swap intent', () => {
  assert.throws(() => planLineupChange(starters, 'p0', { role: 'MID' }), /already has a starter/);
  const result = apply(starters, { role: 'MID', swapRoleIfTaken: true }, 'p0');
  assert.equal(result[0].role, 'MID'); assert.equal(result[2].role, 'EXP');
});
test('a substitute cannot displace a starter via the role-swap shortcut', () => {
  assert.throws(() => planLineupChange([...starters, sub], sub.id, { isSubstitute: false, role: 'GOLD', swapRoleIfTaken: true }), /Select the starter/);
  assert.throws(() => planLineupChange([...starters, sub], sub.id, { swapRoleWithPlayerId: 'p0' }), /two starters/);
});
test('same player, foreign player, and two-sub replacements are rejected', () => {
  for (const id of [sub.id, 'foreign', 'sub2']) assert.throws(() => planLineupChange([...starters, sub, { ...sub, id: 'sub2' }], sub.id, { replacePlayerId: id }));
});
test('replacement cannot steal a different starter role', () => {
  assert.throws(() => planLineupChange([...starters, sub], sub.id, { replacePlayerId: 'p1', role: 'GOLD' }), /already has a starter/);
});
test('invalid fields do not mutate the supplied roster', () => {
  const before = structuredClone(starters);
  assert.throws(() => planLineupChange(starters, 'p0', { role: 'MID', isSubstitute: 'false', swapRoleIfTaken: true }), /boolean/);
  assert.deepEqual(starters, before);
  assert.throws(() => parseTeamRole('INVALID'));
});
test('accepting explicitly as substitute keeps that choice with open roles', () => {
  assert.equal(chooseJoinPosition(starters.slice(0,2), 'MID', true), true);
  assert.equal(chooseJoinPosition(starters.slice(0,2), 'MID', false), false);
});
test('stale starter acceptance is rejected when the slot was filled', () => {
  assert.throws(() => chooseJoinPosition(starters, 'MID', false), /no longer open/);
  assert.equal(chooseJoinPosition(starters, 'MID'), true);
});
test('direction survives captain transfer for both invitations and applications', () => {
  assert.equal(isTeamApplication({ fromUserId: 'old-cap', fromUser: { ign: 'Captain' }, toUserId: 'candidate', toIGN: 'Recruit', team: { captainId: 'new-cap' } }), false);
  assert.equal(isTeamApplication({ fromUserId: 'candidate', fromUser: { ign: 'Recruit' }, toUserId: 'old-cap', toIGN: 'Recruit', team: { captainId: 'new-cap' } }), true);
});
test('application direction still works when the applicant changes IGN', () => {
  assert.equal(isTeamApplication({ fromUserId: 'candidate', fromUser: { ign: 'Renamed' }, toUserId: 'captain', toIGN: 'OldName', team: { captainId: 'captain' } }), true);
});
test('offered and applied roles can be recovered from existing request messages', () => {
  assert.equal(invitedRole('Invited Role: JUNGLE ? Join us'), 'JUNGLE');
  assert.equal(invitedRole('Preferred Role: MID ? Signature Hero: Kagura'), 'MID');
  assert.equal(invitedRole('hello'), undefined);
});
