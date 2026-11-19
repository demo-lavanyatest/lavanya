import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';

let server, base, dataDir;

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'site-test-'));
  server = createApp({ dataDir, env: {} }).listen(0);
  base = `http://localhost:${server.address().port}`;
});
after(async () => { server.close(); await rm(dataDir, { recursive: true, force: true }); });

const post = (path, body, headers = {}) => fetch(base + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});

test('valid contact is saved', async () => {
  const res = await post('/api/contact', { name: 'Asha', email: 'asha@example.com', subject: 'Website', message: 'I need a new website please' });
  assert.equal(res.status, 200);
  const saved = await readFile(join(dataDir, 'contacts.jsonl'), 'utf8');
  assert.match(saved, /asha@example.com/);
});

test('invalid contact returns field errors', async () => {
  const res = await post('/api/contact', { name: 'A', email: 'bad', subject: '', message: 'short' });
  assert.equal(res.status, 422);
  const { errors } = await res.json();
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'message', 'name', 'subject']);
});

test('honeypot submissions are silently dropped', async () => {
  const res = await post('/api/newsletter', { email: 'bot@example.com', website: 'spam' });
  assert.equal(res.status, 200);
  await assert.rejects(readFile(join(dataDir, 'subscribers.jsonl'), 'utf8'));
});

test('cross-origin and non-JSON posts are rejected', async () => {
  assert.equal((await post('/api/newsletter', { email: 'a@b.co' }, { Origin: 'https://evil.test' })).status, 403);
  const form = await fetch(`${base}/api/newsletter`, { method: 'POST', body: new URLSearchParams({ email: 'a@b.co' }) });
  assert.equal(form.status, 415);
});

test('security headers are set', async () => {
  const res = await fetch(`${base}/api/missing`);
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
});

test('rate limit kicks in', async () => {
  let last;
  for (let i = 0; i < 12; i++) last = await post('/api/newsletter', { email: `u${i}@example.com` });
  assert.equal(last.status, 429);
});
