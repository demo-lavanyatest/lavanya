// Pure workflow rules for specification approval. No DOM access.

export const STATUS = Object.freeze({
  DRAFT: 'Draft',
  PENDING: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REAPPROVAL: 'Re-approval required',
});

export class WorkflowError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'WorkflowError';
    this.field = field;
  }
}

export function fingerprint(text) {
  return String(text ?? '').trim();
}

const EDITABLE = [STATUS.DRAFT, STATUS.REJECTED, STATUS.REAPPROVAL, STATUS.APPROVED];
const SUBMITTABLE = [STATUS.DRAFT, STATUS.REJECTED, STATUS.REAPPROVAL];

function validate({ title, requirements }) {
  if (!String(title ?? '').trim()) throw new WorkflowError('Title is required.', 'title');
  if (!String(requirements ?? '').trim()) throw new WorkflowError('Requirements are required.', 'requirements');
}

function entry(action, user, now, version, comment) {
  const e = { action, by: user.name, at: now.toISOString(), version };
  if (comment) e.comment = comment;
  return Object.freeze(e);
}

function withEntry(spec, changes, e) {
  return { ...spec, ...changes, history: [...spec.history, e] };
}

function requireAuthor(spec, user) {
  if (spec.author !== user.name) throw new WorkflowError('Only the author can do this.');
}

function requireReviewer(spec, user) {
  if (user.role !== 'Approver') throw new WorkflowError('Only an approver can do this.');
  if (spec.author === user.name) throw new WorkflowError('You cannot review your own specification.');
  if (spec.status !== STATUS.PENDING) {
    throw new WorkflowError(`Cannot review a specification that is "${spec.status}".`);
  }
}

export function createSpec({ title, requirements }, user, now = new Date()) {
  validate({ title, requirements });
  const spec = {
    id: globalThis.crypto.randomUUID(),
    title: title.trim(),
    requirements,
    author: user.name,
    createdAt: now.toISOString(),
    status: STATUS.DRAFT,
    version: 1,
    approved: null,
    history: [],
  };
  return withEntry(spec, {}, entry('Created', user, now, 1));
}

export function editSpec(spec, { title, requirements }, user, now = new Date()) {
  requireAuthor(spec, user);
  if (!EDITABLE.includes(spec.status)) {
    throw new WorkflowError(`Cannot edit a specification that is "${spec.status}".`);
  }
  validate({ title, requirements });
  const changes = { title: title.trim(), requirements };

  if (spec.status === STATUS.APPROVED && fingerprint(requirements) !== fingerprint(spec.approved.requirements)) {
    const version = spec.version + 1;
    return withEntry(
      spec,
      { ...changes, version, status: STATUS.REAPPROVAL },
      entry('Approval revoked', user, now, version,
        `Requirements changed after approval of version ${spec.approved.version}.`),
    );
  }
  return withEntry(spec, changes, entry('Edited', user, now, spec.version));
}

export function submitSpec(spec, user, now = new Date()) {
  requireAuthor(spec, user);
  if (!SUBMITTABLE.includes(spec.status)) {
    throw new WorkflowError(`Cannot submit a specification that is "${spec.status}".`);
  }
  return withEntry(spec, { status: STATUS.PENDING }, entry('Submitted', user, now, spec.version));
}

export function approveSpec(spec, user, now = new Date(), comment = '') {
  requireReviewer(spec, user);
  const approved = {
    version: spec.version,
    requirements: spec.requirements,
    by: user.name,
    at: now.toISOString(),
  };
  return withEntry(spec, { status: STATUS.APPROVED, approved },
    entry('Approved', user, now, spec.version, comment.trim()));
}

export function rejectSpec(spec, user, comment, now = new Date()) {
  requireReviewer(spec, user);
  const text = String(comment ?? '').trim();
  if (!text) throw new WorkflowError('A comment is required to reject.', 'comment');
  return withEntry(spec, { status: STATUS.REJECTED }, entry('Rejected', user, now, spec.version, text));
}

export function canEdit(spec, user) {
  return spec.author === user.name && EDITABLE.includes(spec.status);
}

export function canSubmit(spec, user) {
  return spec.author === user.name && SUBMITTABLE.includes(spec.status);
}

export function canReview(spec, user) {
  return user.role === 'Approver' && spec.author !== user.name && spec.status === STATUS.PENDING;
}
