// In-browser backend used by the web (claude.ai artifact) build.
// Implements the same /api routes as server/index.js, but keeps data in the artifact's
// private per-user database (falls back to this browser's storage), writes scripts with
// Claude through claude.ai, and stores uploads in the artifact's asset store.
import { buildSeedData } from '../../shared/seedData.js';
import { SYSTEM, claudePrompt, runLocalOp } from '../../shared/writer.js';
import { SECTIONS, QUENTIN_VOICE_ID } from '../../shared/defaults.js';
import referenceImage from '../../server/seed/reference-character.png?inline';

const COLS = ['projects', 'characters', 'assets', 'presets', 'activity', 'datasets'];
const LS_KEY = 'tms-studio-v1';
const now = () => new Date().toISOString();
const newId = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

let state = null;
let backend = { kind: 'browser', db: null, uid: null };
let caps = { sample: null, assets: null, downloads: null, mcp: null };
let ready = null;
const dirty = new Map(); // docKey -> 'set' | 'delete'
let flushTimer = null;

const use = (name) => (window.claude?.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
const withTimeout = (p, ms, fallback = null) => Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms))]);

// ---------------- persistence ----------------
const docKey = (col, id) => `${col}__${id}`;

function markDirty(col, id, op = 'set') {
  dirty.set(docKey(col, id), op);
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 400);
}

async function flush() {
  const entries = [...dirty.entries()];
  dirty.clear();
  if (backend.db) {
    const coll = backend.db.collection(`data/users/${backend.uid}`);
    for (const [key, op] of entries) {
      const [col, ...rest] = key.split('__');
      const id = rest.join('__');
      try {
        if (op === 'delete') await coll.doc(key).delete();
        else {
          const doc = col === 'settings' ? state.settings : state[col].find((d) => d.id === id);
          if (doc) await coll.doc(key).set({ col, doc: JSON.parse(JSON.stringify(doc)) });
        }
      } catch (err) {
        console.error('[studio] save failed', key, err);
      }
    }
  } else {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }
}

function seedState() {
  const seed = buildSeedData({ refUrl: referenceImage });
  return { settings: seed.settings, projects: seed.projects, characters: seed.characters, assets: seed.assets, presets: seed.presets, activity: seed.activity, datasets: seed.datasets };
}

function markAllDirty() {
  markDirty('settings', 'main');
  for (const c of COLS) for (const d of state[c]) markDirty(c, d.id);
}

async function init() {
  const [db, user, sample, assets, downloads, mcp] = await Promise.all(['db', 'user', 'sample', 'assets', 'downloads', 'mcp'].map((n) => withTimeout(use(n), 10000)));
  caps = { sample, assets, downloads, mcp };
  let uid = null;
  if (db && user) { try { uid = await user.id(); } catch { uid = null; } }
  if (db && uid) {
    try {
      const snap = await withTimeout(db.collection(`data/users/${uid}`).get(), 10000, 'timeout');
      if (snap !== 'timeout') {
        backend = { kind: 'cloud', db, uid };
        const loaded = { settings: null, ...Object.fromEntries(COLS.map((c) => [c, []])) };
        snap.docs.forEach((d) => {
          const v = d.data();
          if (v?.col === 'settings') loaded.settings = v.doc;
          else if (v && loaded[v.col]) loaded[v.col].push(v.doc);
        });
        if (loaded.settings) {
          for (const c of COLS) loaded[c].sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
          loaded.activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          state = loaded;
          upgradeV2();
        } else {
          state = seedState();
          markAllDirty();
        }
        return;
      }
    } catch (err) { console.error('[studio] database unavailable, using browser storage', err); }
  }
  backend = { kind: 'browser', db: null, uid: null };
  try { state = JSON.parse(localStorage.getItem(LS_KEY)); } catch { state = null; }
  if (!state?.settings) { state = seedState(); flush(); }
  for (const c of COLS) state[c] ||= [];
  upgradeV2();
}

// Existing studios from the motivational version: keep everything, add the explainer samples once.
function upgradeV2() {
  if (state.settings.explainerVersion >= 2) return;
  const seed = seedState();
  for (const c of ['datasets', 'projects', 'presets']) {
    for (const d of seed[c]) if (!state[c].some((x) => x.id === d.id)) { state[c].push(d); markDirty(c, d.id); }
  }
  state.settings = { ...state.settings, explainerVersion: 2, theme: { ...seed.settings.theme, ...state.settings.theme, chart: { ...seed.settings.theme.chart, ...(state.settings.theme?.chart || {}) } } };
  markDirty('settings', 'main');
}

const ensureReady = () => (ready ||= init());

// ---------------- helpers ----------------
function logActivity(type, text, ref = null) {
  const a = { id: newId('act'), type, text, ref, createdAt: now() };
  state.activity.unshift(a);
  markDirty('activity', a.id);
  const extra = state.activity.splice(80);
  extra.forEach((x) => markDirty('activity', x.id, 'delete'));
}

function integrations() {
  return {
    elevenlabs: { configured: !!caps.mcp, source: caps.mcp ? 'connector' : null, connector: true },
    claude: { configured: !!caps.sample, source: caps.sample ? 'claude.ai' : null, model: 'Claude via claude.ai', builtIn: true },
    renderer: { configured: false },
    tradingview: { configured: !!caps.mcp, connector: true },
    storage: backend.kind,
    standalone: true,
  };
}

function deepMerge(a, b) {
  if (Array.isArray(b) || typeof b !== 'object' || b === null) return b;
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(out[k], v) : v;
  return out;
}

const LABEL = { projects: 'project', characters: 'character', assets: 'asset', presets: 'preset', datasets: 'dataset' };

async function claudeScript(body) {
  if (!caps.sample) fail('Claude writing isn’t available in this view. Use the local writer instead.');
  const { op } = body;
  const shape = op === 'rewrite' ? '{"text": "..."}' : `{${SECTIONS.map((s) => `"${s}": "..."`).join(', ')}}`;
  const prompt = `${SYSTEM}\n\n${claudePrompt(op, body)}\n\nRespond with only a JSON object of this shape: ${shape}`;
  try {
    const out = await caps.sample.json(prompt, { modelTier: 'default', cache: false });
    if (op === 'rewrite') {
      if (typeof out?.text !== 'string') fail('Claude returned an unexpected answer. Try again.', 502);
      return { text: out.text };
    }
    if (!SECTIONS.every((s) => typeof out?.[s] === 'string')) fail('Claude returned an unexpected answer. Try again.', 502);
    return { sections: Object.fromEntries(SECTIONS.map((s) => [s, out[s]])) };
  } catch (err) {
    if (err?.status) throw err;
    const msg = { not_granted: 'Claude access wasn’t allowed for this page. Allow it from the artifact’s permissions, or use the local writer.', rate_limited: 'Claude is busy right now. Wait a moment and try again.', invalid_json: 'Claude returned an unexpected answer. Try again.' }[err?.code];
    fail(msg || err?.message || 'Claude could not write the script.', 502);
  }
  return null;
}

async function upload(file, tags) {
  const kind = (file.type || '').split('/')[0];
  if (!['image', 'video'].includes(kind)) fail('This web version stores images and video. Audio and music uploads need the self-hosted studio.', 415);
  let url;
  let blobId = null;
  if (caps.assets) {
    try {
      const r = await caps.assets.upload(file);
      url = r.url;
      blobId = r.id;
    } catch (err) { fail(`Upload failed: ${err?.message || err?.code || 'unknown error'}`, 502); }
  } else {
    if (file.size > 400_000) fail('Files over 400 KB need asset storage, which isn’t available in this view.', 413);
    url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
  }
  const asset = { id: newId('asse'), name: file.name, kind, url, blobId, mime: file.type, size: file.size, tags, createdAt: now(), updatedAt: now() };
  state.assets.unshift(asset);
  markDirty('assets', asset.id);
  logActivity('asset', `Uploaded ${kind} “${file.name}”`, asset.id);
  return asset;
}

// ---------------- router ----------------
export async function handle(method, url, body, extra = {}) {
  await ensureReady();
  const path = url.split('?')[0].replace(/^\/api/, '');
  const query = new URLSearchParams(url.split('?')[1] || '');
  const parts = path.split('/').filter(Boolean);
  const clone = (x) => JSON.parse(JSON.stringify(x));

  if (path === '/bootstrap') return clone({ ...state, datasets: state.datasets.map(({ t, o, h, l, c, v, ...meta }) => ({ ...meta, bars: t?.length || 0, from: t?.[0], to: t?.[t.length - 1] })), activity: state.activity.slice(0, 50), integrations: integrations() });
  if (path === '/health') return { ok: true };
  if (path === '/integrations') return integrations();
  if (path === '/settings') {
    if (method === 'PUT') { state.settings = deepMerge(state.settings, body || {}); markDirty('settings', 'main'); }
    return clone(state.settings);
  }
  if (path === '/settings/reset-data') {
    if (body?.confirm !== 'RESET') fail('Type RESET to confirm.');
    for (const c of COLS) state[c].forEach((d) => markDirty(c, d.id, 'delete'));
    await flush();
    state = seedState();
    markAllDirty();
    await flush();
    return { ok: true };
  }
  if (path === '/upload') return upload(extra.file, extra.tags || []);
  if (path === '/script') return body?.engine === 'claude' ? claudeScript(body) : runLocalOp(body || {});
  if (path === '/elevenlabs/status') return caps.mcp ? { connected: true, source: 'connector', connector: true } : { connected: false, source: null, unavailable: true };
  if (path === '/elevenlabs/voices') return elevenVoices();
  if (path === '/elevenlabs/tts') return elevenSpeak(body || {});
  if (parts[0] === 'elevenlabs') fail('Not available in the web version.', 501);
  if (parts[0] === 'integrations') fail('Integrations with API keys need the self-hosted studio.', 501);

  const col = parts[0];
  if (!['projects', 'characters', 'assets', 'presets', 'datasets'].includes(col)) fail('Unknown API route', 404);
  const list = state[col];
  const id = parts[1];

  if (!id) {
    if (method === 'GET') return clone(list);
    if (method === 'POST') {
      const doc = { ...clone(body || {}), id: body?.id || newId(col.slice(0, 4)), createdAt: now(), updatedAt: now() };
      list.unshift(doc);
      markDirty(col, doc.id);
      if (!['presets', 'datasets'].includes(col)) logActivity(col.slice(0, -1), `Created ${LABEL[col]} “${doc.title || doc.name}”`, doc.id);
      return clone(doc);
    }
  }
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) fail(`${LABEL[col]} not found`, 404);
  const doc = list[idx];
  const action = parts[2];

  if (action === 'duplicate') {
    const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = clone(doc);
    const copy = col === 'projects'
      ? { ...rest, title: `${doc.title} (copy)`, sample: false, archived: false, generation: { status: 'not_ready', approvedAt: null, lastCheckAt: null } }
      : { ...rest, name: `${doc.name} (copy)`, status: 'draft', locked: false };
    const created = { ...copy, id: newId(col.slice(0, 4)), createdAt: now(), updatedAt: now() };
    list.unshift(created);
    markDirty(col, created.id);
    logActivity(col.slice(0, -1), `Duplicated “${doc.title || doc.name}”`, created.id);
    return clone(created);
  }
  if (action === 'generate') {
    if (parts[3] === 'cancel') {
      list[idx] = { ...doc, generation: { ...doc.generation, status: 'not_ready', approvedAt: null }, updatedAt: now() };
      markDirty(col, id);
      return clone(list[idx]);
    }
    if (body?.confirmed !== true) fail('Generation requires explicit confirmation.');
    list[idx] = { ...doc, generation: { ...doc.generation, status: 'approved', approvedAt: now(), lastCheckAt: now() }, updatedAt: now() };
    markDirty(col, id);
    logActivity('project', `Approved “${doc.title}” for generation (renderer not connected — nothing rendered)`, id);
    return { project: clone(list[idx]), rendered: false, message: 'Project is ready for generation. The video rendering engine is not connected yet, so no video was generated.' };
  }
  if (method === 'GET') return clone(doc);
  if (method === 'PUT') {
    const { _activity, id: _i, createdAt: _c, ...patch } = body || {};
    list[idx] = { ...doc, ...clone(patch), updatedAt: now() };
    markDirty(col, id);
    if (_activity) logActivity(col.slice(0, -1), String(_activity).slice(0, 200), id);
    return clone(list[idx]);
  }
  if (method === 'DELETE') {
    if (col === 'assets' && state.characters.some((c) => c.referenceUrl === doc.url) && query.get('force') !== '1') {
      fail('This image is the reference for a character. Remove it from the character first.', 409);
    }
    if (col === 'assets' && doc.blobId && caps.assets) { try { await caps.assets.delete(doc.blobId); } catch { /* already gone */ } }
    list.splice(idx, 1);
    markDirty(col, id, 'delete');
    if (col !== 'presets') logActivity(col.slice(0, -1), `Deleted ${LABEL[col]} “${doc.title || doc.name}”`);
    return { ok: true };
  }
  fail('Unknown API route', 404);
  return null;
}

export async function exportBackup() {
  await ensureReady();
  await flush();
  const data = JSON.stringify(state, null, 2);
  if (!caps.downloads) fail('Downloads aren’t available in this view.', 501);
  await caps.downloads.save({ filename: `studio-backup-${now().slice(0, 10)}.json`, data });
}

export const storageKind = () => backend.kind;

export const mcpCapability = async () => { await ensureReady(); return caps.mcp; };

export async function saveFile(blob, filename) {
  await ensureReady();
  if (!caps.downloads) fail('Downloads aren’t available in this view.', 501);
  await caps.downloads.save({ filename, data: blob });
}

// ---------------- ElevenLabs (through the viewer's claude.ai ElevenLabs connector) ----------------
const EL_SERVERS = ['ElevenLabs', 'Elevenlabs'];
async function el(tool, input) {
  if (!caps.mcp) fail('Your ElevenLabs connector isn’t available in this view. Connect it in claude.ai (Settings → Connectors) and allow it for this page.', 400);
  let last;
  for (const server of EL_SERVERS) {
    try {
      const res = await caps.mcp.callTool(server, tool, { context: 'Trading explainer studio voiceover', ...input });
      return res?.payload ?? JSON.parse(res?.content?.[0]?.text || 'null');
    } catch (err) {
      last = err;
      if (err?.code !== 'server_not_connected' && err?.code !== 'unknown_server') break;
    }
  }
  const msg = { not_granted: 'ElevenLabs access wasn’t allowed for this page. Allow it from the page’s permissions.', server_not_connected: 'Your ElevenLabs connector isn’t connected in claude.ai. Connect it under Settings → Connectors.', rate_limited: 'ElevenLabs is busy. Wait a moment and try again.' }[last?.code];
  fail(msg || last?.message || 'ElevenLabs request failed.', 502);
  return null;
}

async function elevenVoices() {
  const [q, edu] = await Promise.all([el('creative_list_voices', { search: 'Quentin', languages: ['en'] }), el('creative_list_voices', { use_cases: ['informative_educational'], languages: ['en'] })]);
  const seen = new Set();
  const voices = [...(q?.voices || []), ...(edu?.voices || [])].filter((v) => !seen.has(v.voice_id) && seen.add(v.voice_id)).map((v) => ({
    id: v.voice_id, name: v.name, category: v.category, previewUrl: v.preview_url, labels: v.labels || {}, description: v.description || '',
  }));
  voices.sort((a, b) => (a.id === QUENTIN_VOICE_ID ? -1 : b.id === QUENTIN_VOICE_ID ? 1 : 0));
  return { voices, quentin: voices.find((v) => v.id === QUENTIN_VOICE_ID) || null };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function elevenSpeak({ text, voiceId, flowId }) {
  if (!text?.trim()) fail('There is no voiceover text to generate.');
  let fid = flowId;
  if (!fid) fid = (await el('creative_create_flow', { name: 'Trading explainer voiceover' }))?.flow_id;
  const started = await el('creative_generate_speech', { prompt: text, model_id: 'eleven_multilingual_v2', voice_id: voiceId || QUENTIN_VOICE_ID, generations_count: 1, flow_id: fid });
  if (!started?.session_ids?.length) fail('ElevenLabs did not start the generation.', 502);
  let status = null;
  for (let k = 0; k < 40; k++) {
    await wait(Math.max(2, started.poll_after_seconds || 3) * 1000); // eslint-disable-line no-await-in-loop
    status = await el('creative_get_flow_run_status', { flow_id: started.flow_id, session_ids: started.session_ids }); // eslint-disable-line no-await-in-loop
    if (status?.all_completed || status?.has_failures) break;
  }
  if (!status?.all_completed || status.has_failures) fail('ElevenLabs could not finish this clip. Check the flow in ElevenLabs before trying again (each try uses credits).', 502);
  const m = status.media?.[0] || {};
  const g = status.generations?.[0] || {};
  return {
    url: m.url || g.content_url || null,
    duration: m.duration_secs || g.duration_secs || null,
    generationId: m.generation_id || g.id,
    listenUrl: m.product_link?.url || status.flow_url || started.url,
    flowUrl: status.flow_url || started.flow_url,
    flowId: started.flow_id,
    credits: g.price?.credits ?? null,
    voiceName: m.voice?.name || null,
    source: 'elevenlabs-connector',
  };
}
