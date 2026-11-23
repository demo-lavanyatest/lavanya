import {
  STATUS, WorkflowError, createSpec, editSpec, submitSpec, approveSpec, rejectSpec,
  canEdit, canSubmit, canReview,
} from './approval.js';

const SPECS_KEY = 'tms.specs.v1';
const USER_KEY = 'tms.user.v1';
const $ = (id) => document.getElementById(id);

let specs = [];
let user = { name: 'Alice', role: 'Author' };
let selectedId = null;
let editingId = null; // null = not editing; 'new' = creating

function loadState() {
  try {
    const raw = localStorage.getItem(SPECS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) throw new Error('bad shape');
    specs = parsed;
  } catch {
    specs = [];
    showAlert('Saved data could not be read, so the list was started empty.', true);
  }
  try {
    const u = JSON.parse(localStorage.getItem(USER_KEY));
    if (u && typeof u.name === 'string' && u.name.trim() && ['Author', 'Approver'].includes(u.role)) user = u;
  } catch { /* keep default user */ }
}

function save() {
  localStorage.setItem(SPECS_KEY, JSON.stringify(specs));
}

function showAlert(message, info = false) {
  const el = $('alert');
  el.textContent = message;
  el.classList.toggle('info', info);
  el.hidden = !message;
}

function clearErrors() {
  showAlert('');
  for (const id of ['title-error', 'requirements-error', 'comment-error']) $(id).textContent = '';
}

function run(action) {
  clearErrors();
  try {
    action();
    save();
  } catch (e) {
    if (!(e instanceof WorkflowError)) throw e;
    if (e.field) $(`${e.field}-error`).textContent = e.message;
    else showAlert(e.message);
  }
  render();
}

function replace(updated) {
  specs = specs.map((s) => (s.id === updated.id ? updated : s));
}

const selected = () => specs.find((s) => s.id === selectedId);
const fmt = (iso) => new Date(iso).toLocaleString();

function badge(status) {
  const b = document.createElement('span');
  b.className = 'badge';
  b.dataset.status = status;
  b.textContent = status;
  return b;
}

function renderList() {
  const list = $('spec-list');
  list.replaceChildren();
  for (const s of specs) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-current', String(s.id === selectedId));
    const name = document.createElement('span');
    name.textContent = `${s.title} (v${s.version})`;
    btn.append(name, badge(s.status));
    btn.addEventListener('click', () => { selectedId = s.id; editingId = null; clearErrors(); render(); });
    li.append(btn);
    list.append(li);
  }
  $('empty-list').hidden = specs.length > 0;
}

function renderDetail() {
  const s = selected();
  const editing = editingId !== null;
  $('spec-form').hidden = !editing;
  $('detail').hidden = editing || !s;
  $('placeholder').hidden = editing || !!s;
  if (editing || !s) return;

  $('d-title').textContent = s.title;
  const st = $('d-status');
  st.dataset.status = s.status;
  st.textContent = s.status;
  $('d-meta').textContent = `By ${s.author} · created ${fmt(s.createdAt)} · version ${s.version}`
    + (s.approved ? ` · last approved v${s.approved.version} by ${s.approved.by}` : '');
  $('d-req').textContent = s.requirements;
  const showOld = s.status === STATUS.REAPPROVAL && s.approved;
  $('d-approved-box').hidden = !showOld;
  $('d-approved').textContent = showOld ? s.approved.requirements : '';

  $('act-edit').hidden = !canEdit(s, user);
  $('act-submit').hidden = !canSubmit(s, user);
  $('review').hidden = !canReview(s, user);

  const hist = $('d-history');
  hist.replaceChildren();
  for (const h of s.history) {
    const li = document.createElement('li');
    li.textContent = `${fmt(h.at)} — ${h.action} by ${h.by} (v${h.version})${h.comment ? `: ${h.comment}` : ''}`;
    hist.append(li);
  }
}

function render() {
  $('user-name').value = user.name;
  $('user-role').value = user.role;
  renderList();
  renderDetail();
}

function openForm(spec) {
  clearErrors();
  editingId = spec ? spec.id : 'new';
  $('form-heading').textContent = spec ? 'Edit specification' : 'New specification';
  $('spec-title').value = spec ? spec.title : '';
  $('spec-req').value = spec ? spec.requirements : '';
  render();
  $('spec-title').focus();
}

$('user-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('user-name').value.trim();
  if (!name) return;
  user = { name, role: $('user-role').value };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  editingId = null;
  clearErrors();
  render();
});

$('new-spec').addEventListener('click', () => openForm(null));
$('cancel-edit').addEventListener('click', () => { editingId = null; clearErrors(); render(); });
$('act-edit').addEventListener('click', () => openForm(selected()));

$('spec-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const fields = { title: $('spec-title').value, requirements: $('spec-req').value };
  run(() => {
    if (editingId === 'new') {
      const s = createSpec(fields, user);
      specs = [...specs, s];
      selectedId = s.id;
    } else {
      const before = selected();
      const updated = editSpec(before, fields, user);
      replace(updated);
      if (updated.status === STATUS.REAPPROVAL && before.status === STATUS.APPROVED) {
        showAlert('Requirements changed: approval was revoked and the specification needs re-approval.', true);
      }
    }
    editingId = null;
  });
});

$('act-submit').addEventListener('click', () => run(() => replace(submitSpec(selected(), user))));
$('act-approve').addEventListener('click', () => run(() => {
  replace(approveSpec(selected(), user, new Date(), $('review-comment').value));
  $('review-comment').value = '';
}));
$('act-reject').addEventListener('click', () => run(() => {
  replace(rejectSpec(selected(), user, $('review-comment').value));
  $('review-comment').value = '';
}));

loadState();
render();
