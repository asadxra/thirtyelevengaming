import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 8899;
const base = `http://localhost:${PORT}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-test-'));
let proc;

test.before(async () => {
  const env = { ...process.env, PORT: String(PORT), STUDIO_DATA_DIR: dir };
  delete env.ELEVENLABS_API_KEY;
  delete env.ANTHROPIC_API_KEY;
  proc = spawn(process.execPath, ['server/index.js'], { env, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not start');
});
test.after(() => { proc?.kill(); fs.rmSync(dir, { recursive: true, force: true }); });

const json = (method, url, body) => fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));

test('bootstrap returns seeded data without secrets', async () => {
  const { body } = await json('GET', '/api/bootstrap');
  assert.ok(body.projects.length > 0);
  assert.equal(body.characters[0].name, 'The Shadow Trader');
  assert.equal(body.integrations.elevenlabs.configured, false);
  assert.ok(!JSON.stringify(body).includes('apiKey'));
});

test('project CRUD persists', async () => {
  const created = await json('POST', '/api/projects', { title: 'Test', format: 'landscape' });
  assert.equal(created.status, 201);
  const upd = await json('PUT', `/api/projects/${created.body.id}`, { title: 'Renamed' });
  assert.equal(upd.body.title, 'Renamed');
  const dup = await json('POST', `/api/projects/${created.body.id}/duplicate`);
  assert.match(dup.body.title, /copy/);
  assert.equal((await json('DELETE', `/api/projects/${created.body.id}`)).status, 200);
  assert.equal((await json('GET', `/api/projects/${created.body.id}`)).status, 404);
});

test('generation requires explicit confirmation and never renders', async () => {
  const bad = await json('POST', '/api/projects/proj_fvg/generate', {});
  assert.equal(bad.status, 400);
  const ok = await json('POST', '/api/projects/proj_fvg/generate', { confirmed: true });
  assert.equal(ok.body.rendered, false);
  assert.equal(ok.body.project.generation.status, 'approved');
});

test('ElevenLabs reports not connected and TTS is refused', async () => {
  const st = await json('GET', '/api/elevenlabs/status');
  assert.equal(st.body.connected, false);
  const tts = await json('POST', '/api/elevenlabs/tts', { text: 'hi', voiceId: 'x' });
  assert.equal(tts.status, 400);
});

test('upload rejects unsupported types', async () => {
  const r = await fetch(`${base}/api/upload`, { method: 'POST', headers: { 'Content-Type': 'application/x-msdownload' }, body: 'x' });
  assert.equal(r.status, 415);
});
