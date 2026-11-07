import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as db from './db.js';
import * as eleven from './elevenlabs.js';
import { runScriptOp, claudeKey, CLAUDE_MODEL } from './scriptwriter.js';
import Anthropic from '@anthropic-ai/sdk';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const app = express();

db.load();

app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(db.UPLOAD_DIR, { fallthrough: false }));

// Wrap async handlers so thrown errors become JSON responses.
const h = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error('[api]', err);
    res.status(status).json({ error: err.message || 'Unexpected server error' });
  });

const notFound = (what) => Object.assign(new Error(`${what} not found`), { status: 404 });

// ---------- Bootstrap ----------
app.get('/api/bootstrap', h(async (_req, res) => {
  const d = db.getDb();
  res.json({
    settings: d.settings,
    projects: d.projects,
    characters: d.characters,
    assets: d.assets,
    presets: d.presets,
    datasets: d.datasets.map(({ t, o, h, l, c, v, ...meta }) => ({ ...meta, bars: t?.length || 0, from: t?.[0], to: t?.[t.length - 1] })),
    activity: d.activity.slice(0, 50),
    integrations: integrationSummary(),
  });
}));

function integrationSummary() {
  return {
    elevenlabs: { configured: !!eleven.keySource(), source: eleven.keySource() },
    claude: { configured: !!claudeKey(), source: process.env.ANTHROPIC_API_KEY ? 'environment' : db.getSecret('anthropicApiKey') ? 'stored' : null, model: CLAUDE_MODEL },
    renderer: { configured: false },
    tradingview: { configured: false, reason: 'The TradingView connector is reachable from the claude.ai web version of the studio. Here, import TradingView chart exports (CSV) or screenshots.' },
  };
}

// ---------- Generic collections ----------
const COLLECTION_LABEL = { projects: 'Project', characters: 'Character', assets: 'Asset', presets: 'Preset', datasets: 'Dataset' };

for (const col of ['projects', 'characters', 'assets', 'presets', 'datasets']) {
  app.get(`/api/${col}`, h(async (_req, res) => res.json(db.list(col))));
  app.get(`/api/${col}/:id`, h(async (req, res) => {
    const doc = db.get(col, req.params.id);
    if (!doc) throw notFound(COLLECTION_LABEL[col]);
    res.json(doc);
  }));
  app.post(`/api/${col}`, h(async (req, res) => {
    const doc = db.insert(col, req.body || {});
    if (!['presets', 'datasets'].includes(col)) db.logActivity(col.slice(0, -1), `Created ${COLLECTION_LABEL[col].toLowerCase()} “${doc.title || doc.name}”`, doc.id);
    res.status(201).json(doc);
  }));
  app.put(`/api/${col}/:id`, h(async (req, res) => {
    const { _activity, ...patch } = req.body || {};
    const doc = db.update(col, req.params.id, patch);
    if (!doc) throw notFound(COLLECTION_LABEL[col]);
    if (_activity) db.logActivity(col.slice(0, -1), String(_activity).slice(0, 200), doc.id);
    res.json(doc);
  }));
  app.delete(`/api/${col}/:id`, h(async (req, res) => {
    const doc = db.get(col, req.params.id);
    if (!doc) throw notFound(COLLECTION_LABEL[col]);
    if (col === 'assets' && doc.url?.startsWith('/uploads/')) {
      const inUse = db.list('characters').some((c) => c.referenceUrl === doc.url);
      if (inUse && req.query.force !== '1') throw Object.assign(new Error('This image is the reference for a character. Remove it from the character first.'), { status: 409 });
      const file = path.join(db.UPLOAD_DIR, path.basename(doc.url));
      fs.rm(file, { force: true }, () => {});
    }
    db.remove(col, req.params.id);
    if (col !== 'presets') db.logActivity(col.slice(0, -1), `Deleted ${COLLECTION_LABEL[col].toLowerCase()} “${doc.title || doc.name}”`);
    res.json({ ok: true });
  }));
}

app.post('/api/projects/:id/duplicate', h(async (req, res) => {
  const src = db.get('projects', req.params.id);
  if (!src) throw notFound('Project');
  const { id, createdAt, updatedAt, ...rest } = structuredClone(src);
  const copy = db.insert('projects', { ...rest, title: `${src.title} (copy)`, sample: false, archived: false, generation: { status: 'not_ready', approvedAt: null, lastCheckAt: null } });
  db.logActivity('project', `Duplicated “${src.title}”`, copy.id);
  res.status(201).json(copy);
}));

app.post('/api/characters/:id/duplicate', h(async (req, res) => {
  const src = db.get('characters', req.params.id);
  if (!src) throw notFound('Character');
  const { id, createdAt, updatedAt, ...rest } = structuredClone(src);
  const copy = db.insert('characters', { ...rest, name: `${src.name} (copy)`, status: 'draft', locked: false });
  db.logActivity('character', `Duplicated character “${src.name}”`, copy.id);
  res.status(201).json(copy);
}));

// ---------- Settings ----------
app.get('/api/settings', h(async (_req, res) => res.json(db.getSettings())));
app.put('/api/settings', h(async (req, res) => res.json(db.setSettings(req.body || {}))));
app.post('/api/settings/reset-data', h(async (req, res) => {
  if (req.body?.confirm !== 'RESET') throw Object.assign(new Error('Type RESET to confirm.'), { status: 400 });
  db.resetToSeed();
  res.json({ ok: true });
}));
app.get('/api/export', h(async (_req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="studio-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(db.getDb());
}));

// ---------- Uploads ----------
const ALLOWED = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/ogg': '.ogg', 'video/mp4': '.mp4' };
app.post('/api/upload', express.raw({ type: () => true, limit: '60mb' }), h(async (req, res) => {
  const mime = (req.headers['content-type'] || '').split(';')[0];
  const ext = ALLOWED[mime];
  if (!ext) throw Object.assign(new Error(`Unsupported file type: ${mime || 'unknown'}`), { status: 415 });
  if (!req.body?.length) throw Object.assign(new Error('Empty upload'), { status: 400 });
  const name = decodeURIComponent(req.headers['x-filename'] || `upload${ext}`).slice(0, 120);
  const file = `${db.newId('up')}${ext}`;
  fs.writeFileSync(path.join(db.UPLOAD_DIR, file), req.body);
  const kind = mime.split('/')[0];
  const tags = String(req.headers['x-tags'] || '').split(',').map((t) => t.trim()).filter(Boolean);
  const asset = db.insert('assets', { name, kind, url: `/uploads/${file}`, mime, size: req.body.length, tags });
  db.logActivity('asset', `Uploaded ${kind} “${name}”`, asset.id);
  res.status(201).json(asset);
}));

// ---------- Script writing ----------
app.post('/api/script', h(async (req, res) => {
  res.json(await runScriptOp(req.body || {}));
}));

// ---------- Integrations: Claude (script writer) ----------
app.post('/api/integrations/claude', h(async (req, res) => {
  const key = String(req.body?.apiKey || '').trim();
  if (key.length < 20) throw Object.assign(new Error('Please paste a valid Anthropic API key.'), { status: 400 });
  try {
    await new Anthropic({ apiKey: key }).models.retrieve(CLAUDE_MODEL);
  } catch (err) {
    throw Object.assign(new Error(`Anthropic rejected the key: ${err.message}`), { status: 400 });
  }
  db.setSecret('anthropicApiKey', key);
  db.logActivity('settings', 'Connected Claude script writer');
  res.json(integrationSummary());
}));
app.delete('/api/integrations/claude', h(async (_req, res) => {
  db.setSecret('anthropicApiKey', null);
  res.json(integrationSummary());
}));
app.get('/api/integrations', h(async (_req, res) => res.json(integrationSummary())));

// ---------- Integrations: ElevenLabs ----------
app.get('/api/elevenlabs/status', h(async (_req, res) => res.json(await eleven.status())));
app.post('/api/elevenlabs/connect', h(async (req, res) => {
  const result = await eleven.connect(req.body?.apiKey);
  db.logActivity('settings', 'Connected ElevenLabs');
  res.json(result);
}));
app.delete('/api/elevenlabs/connect', h(async (_req, res) => {
  eleven.disconnect();
  res.json({ connected: false, source: eleven.keySource() });
}));
app.get('/api/elevenlabs/voices', h(async (_req, res) => res.json(await eleven.voices())));
app.post('/api/elevenlabs/tts', h(async (req, res) => {
  const { text, voiceId, settings, projectId, sceneId, preview } = req.body || {};
  const out = await eleven.synthesize({ text, voiceId, settings });
  if (!preview && projectId) {
    const project = db.get('projects', projectId);
    const asset = db.insert('assets', {
      name: `Voiceover · ${project?.title || 'project'}${sceneId ? ` · scene ${(project?.scenes || []).findIndex((s) => s.id === sceneId) + 1}` : ''}`,
      kind: 'audio', url: out.url, mime: 'audio/mpeg', size: out.bytes, tags: ['voiceover'], projectId, sceneId,
    });
    out.assetId = asset.id;
  }
  res.json(out);
}));

// Combined voiceover: concatenates the project's scene MP3s in scene order (MPEG frames concatenate cleanly).
app.get('/api/projects/:id/voiceover.mp3', h(async (req, res) => {
  const project = db.get('projects', req.params.id);
  if (!project) throw notFound('Project');
  const buffers = [];
  for (const s of project.scenes || []) {
    const clip = project.voice?.clips?.[s.id];
    if (!clip?.url?.startsWith('/uploads/')) continue;
    const f = path.join(db.UPLOAD_DIR, path.basename(clip.url));
    if (fs.existsSync(f)) buffers.push(fs.readFileSync(f));
  }
  if (!buffers.length) throw Object.assign(new Error('No generated voiceover audio in this project yet.'), { status: 404 });
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/[^\w-]+/g, '_')}_voiceover.mp3"`);
  res.send(Buffer.concat(buffers));
}));

// ---------- Video generation (intentionally inactive) ----------
app.post('/api/projects/:id/generate', h(async (req, res) => {
  const project = db.get('projects', req.params.id);
  if (!project) throw notFound('Project');
  if (req.body?.confirmed !== true) throw Object.assign(new Error('Generation requires explicit confirmation.'), { status: 400 });
  // No rendering is performed. The project is marked as approved so it can be picked up once a renderer is connected.
  const updated = db.update('projects', project.id, { generation: { ...project.generation, status: 'approved', approvedAt: db.now(), lastCheckAt: db.now() } });
  db.logActivity('project', `Approved “${project.title}” for generation (renderer not connected — nothing rendered)`, project.id);
  res.json({ project: updated, rendered: false, message: 'Project is ready for generation. The video rendering engine is not connected yet, so no video was generated.' });
}));
app.post('/api/projects/:id/generate/cancel', h(async (req, res) => {
  const project = db.get('projects', req.params.id);
  if (!project) throw notFound('Project');
  res.json(db.update('projects', project.id, { generation: { ...project.generation, status: 'not_ready', approvedAt: null } }));
}));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route' }));

// ---------- Static client (production) ----------
const dist = path.join(here, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Trading Motivation Studio API on http://localhost:${PORT}`);
  if (!fs.existsSync(dist)) console.log('Client not built — run "npm run dev" for the Vite dev server on http://localhost:5173');
});
