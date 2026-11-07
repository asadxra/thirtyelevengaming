// Persistent JSON-file database with atomic writes.
// Collections live in data/db.json. Secrets live in a separate file (data/secrets.json)
// that is never returned through any API route.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildSeed } from './seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.STUDIO_DATA_DIR || path.join(here, '..', 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');

export const COLLECTIONS = ['projects', 'characters', 'assets', 'activity', 'presets', 'datasets'];

let db = null;
let writeTimer = null;

export const newId = (prefix = 'id') => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
export const now = () => new Date().toISOString();

function ensureDirs() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function load() {
  ensureDirs();
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (err) {
      const backup = `${DB_FILE}.corrupt-${Date.now()}`;
      fs.copyFileSync(DB_FILE, backup);
      console.error(`[db] Could not parse db.json, backed up to ${backup}. Starting from seed.`);
      db = null;
    }
  }
  if (!db) {
    db = buildSeed({ uploadDir: UPLOAD_DIR });
    flush();
  }
  for (const c of COLLECTIONS) if (!Array.isArray(db[c])) db[c] = [];
  if (!db.settings) db.settings = buildSeed({ uploadDir: UPLOAD_DIR, settingsOnly: true }).settings;
  if (!(db.settings.explainerVersion >= 2)) {
    // Upgrade from the motivational version: keep all data, add explainer samples and chart theme once.
    const seed = buildSeed({ uploadDir: UPLOAD_DIR });
    for (const c of ['datasets', 'projects']) for (const d of seed[c]) if (!db[c].some((x) => x.id === d.id)) db[c].push(d);
    db.settings = { ...db.settings, explainerVersion: 2, customConcepts: db.settings.customConcepts || [], theme: { ...seed.settings.theme, ...db.settings.theme, chart: { ...seed.settings.theme.chart, ...(db.settings.theme?.chart || {}) } } };
    flush();
  }
  return db;
}

export function flush() {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function scheduleWrite() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, 150);
}

export const getDb = () => db;

export function list(collection) {
  return db[collection];
}

export function get(collection, id) {
  return db[collection].find((x) => x.id === id) || null;
}

export function insert(collection, doc) {
  const record = { ...doc, id: doc.id || newId(collection.slice(0, 4)), createdAt: doc.createdAt || now(), updatedAt: now() };
  db[collection].unshift(record);
  scheduleWrite();
  return record;
}

export function update(collection, id, patch) {
  const idx = db[collection].findIndex((x) => x.id === id);
  if (idx === -1) return null;
  const { id: _ignore, createdAt: _c, ...rest } = patch;
  db[collection][idx] = { ...db[collection][idx], ...rest, updatedAt: now() };
  scheduleWrite();
  return db[collection][idx];
}

export function remove(collection, id) {
  const idx = db[collection].findIndex((x) => x.id === id);
  if (idx === -1) return false;
  db[collection].splice(idx, 1);
  scheduleWrite();
  return true;
}

export function getSettings() {
  return db.settings;
}

export function setSettings(patch) {
  db.settings = deepMerge(db.settings, patch);
  scheduleWrite();
  return db.settings;
}

export function logActivity(type, text, ref = null) {
  db.activity.unshift({ id: newId('act'), type, text, ref, createdAt: now() });
  db.activity = db.activity.slice(0, 200);
  scheduleWrite();
}

export function resetToSeed() {
  db = buildSeed({ uploadDir: UPLOAD_DIR });
  flush();
  return db;
}

function deepMerge(a, b) {
  if (Array.isArray(b) || typeof b !== 'object' || b === null) return b;
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(out[k], v) : v;
  }
  return out;
}

// ---------- Secrets (server-side only) ----------
function readSecrets() {
  try {
    return JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function getSecret(name) {
  return readSecrets()[name] || null;
}

export function setSecret(name, value) {
  const s = readSecrets();
  if (value == null) delete s[name];
  else s[name] = value;
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(s, null, 2), { mode: 0o600 });
  try { fs.chmodSync(SECRETS_FILE, 0o600); } catch { /* non-posix fs */ }
}
