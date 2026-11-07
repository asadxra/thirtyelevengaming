// ElevenLabs integration. All calls happen server-side; the API key is read from the
// ELEVENLABS_API_KEY environment variable or from data/secrets.json (written via Settings).
// The key is never sent back to the browser.
import fs from 'node:fs';
import path from 'node:path';
import { getSecret, setSecret, UPLOAD_DIR, newId } from './db.js';

const BASE = 'https://api.elevenlabs.io/v1';
export const TTS_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

export function elevenKey() {
  return process.env.ELEVENLABS_API_KEY || getSecret('elevenLabsApiKey');
}

export function keySource() {
  if (process.env.ELEVENLABS_API_KEY) return 'environment';
  if (getSecret('elevenLabsApiKey')) return 'stored';
  return null;
}

class ElevenError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function elevenFetch(pathname, { method = 'GET', body, key = elevenKey(), raw = false } = {}) {
  if (!key) throw new ElevenError('ElevenLabs is not connected.', 400);
  let res;
  try {
    res = await fetch(`${BASE}${pathname}`, {
      method,
      headers: { 'xi-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}), Accept: raw ? 'audio/mpeg' : 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ElevenError(`Could not reach ElevenLabs (${err.message}). Check your network connection.`, 502);
  }
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.detail?.message || j?.detail?.status || (typeof j?.detail === 'string' ? j.detail : '') || j?.message || '';
    } catch { /* ignore */ }
    const msg = res.status === 401 ? 'ElevenLabs rejected the API key (401). Reconnect with a valid key.' : `ElevenLabs error ${res.status}${detail ? `: ${detail}` : ''}`;
    throw new ElevenError(msg, res.status === 401 ? 401 : 502);
  }
  return raw ? Buffer.from(await res.arrayBuffer()) : res.json();
}

export async function status() {
  const source = keySource();
  if (!source) return { connected: false, source: null };
  try {
    const user = await elevenFetch('/user');
    return {
      connected: true,
      source,
      subscription: user?.subscription
        ? { tier: user.subscription.tier, used: user.subscription.character_count, limit: user.subscription.character_limit }
        : null,
    };
  } catch (err) {
    return { connected: false, source, error: err.message };
  }
}

export async function connect(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) throw new ElevenError('Please paste a valid ElevenLabs API key.', 400);
  await elevenFetch('/user', { key: apiKey.trim() }); // validate before storing
  setSecret('elevenLabsApiKey', apiKey.trim());
  return status();
}

export function disconnect() {
  setSecret('elevenLabsApiKey', null);
}

export async function voices() {
  const data = await elevenFetch('/voices');
  const list = (data.voices || []).map((v) => ({
    id: v.voice_id,
    name: v.name,
    category: v.category,
    previewUrl: v.preview_url,
    labels: v.labels || {},
    description: v.description || '',
  }));
  list.sort((a, b) => (a.name === 'Quentin' ? -1 : b.name === 'Quentin' ? 1 : a.name.localeCompare(b.name)));
  return { voices: list, quentin: list.find((v) => v.id === 'Aa6nEBJJMKJwJkCx8VU2') || list.find((v) => /^quentin/i.test(v.name)) || null };
}

export async function synthesize({ text, voiceId, settings = {} }) {
  if (!text?.trim()) throw new ElevenError('There is no voiceover text to generate.', 400);
  if (!voiceId) throw new ElevenError('Select a voice first.', 400);
  const audio = await elevenFetch(`/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    raw: true,
    body: {
      text,
      model_id: TTS_MODEL,
      voice_settings: {
        stability: clamp(settings.stability, 0, 1, 0.45),
        similarity_boost: clamp(settings.similarity, 0, 1, 0.8),
        style: clamp(settings.style, 0, 1, 0.25),
        speed: clamp(settings.speed, 0.7, 1.2, 1),
        use_speaker_boost: settings.speakerBoost !== false,
      },
    },
  });
  const file = `${newId('vo')}.mp3`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), audio);
  return { url: `/uploads/${file}`, file, bytes: audio.length };
}

function clamp(v, lo, hi, d) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
}
