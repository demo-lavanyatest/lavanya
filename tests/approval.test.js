import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS, WorkflowError, fingerprint, createSpec, editSpec,
  submitSpec, approveSpec, rejectSpec, canEdit, canSubmit, canReview,
} from '../approval.js';

const alice = { name: 'Alice', role: 'Author' };
const bob = { name: 'Bob', role: 'Approver' };
const carol = { name: 'Carol', role: 'Author' };
const now = new Date('2025-01-01T10:00:00Z');
const base = { title: 'Login', requirements: 'Users can sign in.' };

const pending = () => submitSpec(createSpec(base, alice, now), alice, now);
const approved = () => approveSpec(pending(), bob, now);
const actions = (s) => s.history.map((h) => h.action);

test('R1.1 create saves a Draft at version 1 with id, author, time and history', () => {
  const s = createSpec(base, alice, now);
  assert.equal(s.status, STATUS.DRAFT);
  assert.equal(s.version, 1);
  assert.equal(s.author, 'Alice');
  assert.equal(s.createdAt, now.toISOString());
  assert.match(s.id, /^[0-9a-f-]{36}$/);
  assert.notEqual(createSpec(base, alice, now).id, s.id);
  assert.deepEqual(s.history, [{ action: 'Created', by: 'Alice', at: now.toISOString(), version: 1 }]);
});

test('R1.2 empty title or requirements is refused with the field', () => {
  assert.throws(() => createSpec({ title: ' ', requirements: 'x' }, alice, now),
    (e) => e instanceof WorkflowError && e.field === 'title');
  assert.throws(() => createSpec({ title: 'x', requirements: '' }, alice, now),
    (e) => e instanceof WorkflowError && e.field === 'requirements');
});

test('R1.3 author can edit in Draft and Rejected; others cannot', () => {
  const d = editSpec(createSpec(base, alice, now), { title: 'New', requirements: 'R' }, alice, now);
  assert.equal(d.title, 'New');
  assert.equal(d.status, STATUS.DRAFT);
  assert.deepEqual(actions(d), ['Created', 'Edited']);
  const r = rejectSpec(pending(), bob, 'Too vague', now);
  assert.equal(editSpec(r, { title: 'T', requirements: 'More detail' }, alice, now).status, STATUS.REJECTED);
  assert.throws(() => editSpec(d, base, carol, now), WorkflowError);
});

test('R2.1 submit moves Draft and Rejected to Pending approval', () => {
  assert.equal(pending().status, STATUS.PENDING);
  const r = rejectSpec(pending(), bob, 'No', now);
  assert.equal(submitSpec(r, alice, now).status, STATUS.PENDING);
});

test('R2.2 editing while Pending approval is refused', () => {
  assert.throws(() => editSpec(pending(), base, alice, now), WorkflowError);
  assert.equal(canEdit(pending(), alice), false);
});

test('R2.3 submit refused when Pending or Approved', () => {
  const p = pending();
  assert.throws(() => submitSpec(p, alice, now), WorkflowError);
  assert.equal(p.status, STATUS.PENDING);
  assert.throws(() => submitSpec(approved(), alice, now), WorkflowError);
});

test('R3.1 approve stores status, version and approved requirements', () => {
  const a = approved();
  assert.equal(a.status, STATUS.APPROVED);
  assert.deepEqual(a.approved, { version: 1, requirements: base.requirements, by: 'Bob', at: now.toISOString() });
});

test('R3.2/R3.3 reject requires a comment', () => {
  assert.throws(() => rejectSpec(pending(), bob, '  ', now),
    (e) => e instanceof WorkflowError && e.field === 'comment');
  const r = rejectSpec(pending(), bob, 'Needs detail', now);
  assert.equal(r.status, STATUS.REJECTED);
  assert.equal(r.history.at(-1).comment, 'Needs detail');
});

test('R3.4 author cannot approve or reject their own spec; non-approvers cannot review', () => {
  const selfApprover = { name: 'Alice', role: 'Approver' };
  assert.throws(() => approveSpec(pending(), selfApprover, now), WorkflowError);
  assert.throws(() => rejectSpec(pending(), selfApprover, 'x', now), WorkflowError);
  assert.throws(() => approveSpec(pending(), carol, now), WorkflowError);
  assert.equal(canReview(pending(), selfApprover), false);
  assert.equal(canReview(pending(), bob), true);
});

test('R3.5 approve/reject refused when not Pending approval', () => {
  const d = createSpec(base, alice, now);
  assert.throws(() => approveSpec(d, bob, now), WorkflowError);
  assert.throws(() => rejectSpec(approved(), bob, 'x', now), WorkflowError);
});

test('R4.2/R4.4 history is appended and earlier entries are never changed', () => {
  const p = pending();
  const before = structuredClone(p.history);
  const a = approveSpec(p, bob, now);
  assert.deepEqual(p.history, before);
  assert.deepEqual(a.history.slice(0, before.length), before);
  assert.deepEqual(actions(a), ['Created', 'Submitted', 'Approved']);
  assert.ok(Object.isFrozen(a.history[0]));
});

test('R5.1 changed requirements revoke approval and bump version', () => {
  const m = editSpec(approved(), { title: 'Login', requirements: 'Users can sign in with SSO.' }, alice, now);
  assert.equal(m.status, STATUS.REAPPROVAL);
  assert.equal(m.version, 2);
  assert.equal(m.history.at(-1).action, 'Approval revoked');
  assert.equal(m.approved.requirements, base.requirements);
});

test('R5.2 title-only change keeps Approved', () => {
  const m = editSpec(approved(), { title: 'Sign-in', requirements: base.requirements }, alice, now);
  assert.equal(m.status, STATUS.APPROVED);
  assert.equal(m.version, 1);
  assert.equal(m.history.at(-1).action, 'Edited');
});

test('R5.3 whitespace-only change keeps Approved', () => {
  assert.equal(fingerprint('  a \n'), 'a');
  const m = editSpec(approved(), { title: 'Login', requirements: `\n  ${base.requirements}  ` }, alice, now);
  assert.equal(m.status, STATUS.APPROVED);
});

test('R5.4 full cycle: approve, modify, resubmit, approve', () => {
  let s = editSpec(approved(), { title: 'Login', requirements: 'Changed' }, alice, now);
  assert.equal(canSubmit(s, alice), true);
  s = submitSpec(s, alice, now);
  assert.equal(s.status, STATUS.PENDING);
  s = approveSpec(s, bob, now);
  assert.equal(s.status, STATUS.APPROVED);
  assert.equal(s.approved.version, 2);
  assert.deepEqual(actions(s), ['Created', 'Submitted', 'Approved', 'Approval revoked', 'Submitted', 'Approved']);
});
