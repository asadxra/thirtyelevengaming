// Script → scene breakdown, timing, captions and hashing. Pure functions shared by client and server.
import { SECTIONS, SECTION_LABELS } from './defaults.js';

export const WORDS_PER_SECOND = 2.6; // calm documentary narration pace

export function splitSentences(text = '') {
  return (text.replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]+["”’)]*|[^.!?…]+$/g) || [])
    .map((s) => s.trim())
    .filter(Boolean);
}

export const wordCount = (t = '') => (t.trim() ? t.trim().split(/\s+/).length : 0);

export function scriptToText(sections = {}) {
  return SECTIONS.map((s) => (sections[s] || '').trim()).filter(Boolean).join('\n\n');
}

export function estimateDuration(text, speed = 1) {
  return +(wordCount(text) / (WORDS_PER_SECOND * speed)).toFixed(1);
}

export function fmtTime(sec = 0) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${String(m).padStart(2, '0')}:${r.toFixed(1).padStart(4, '0')}`;
}

export function fmtShort(sec = 0) {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function parseTime(str) {
  if (typeof str === 'number') return str;
  const s = String(str).trim();
  if (!s) return NaN;
  if (s.includes(':')) {
    const [m, rest] = s.split(':');
    return Number(m) * 60 + Number(rest);
  }
  return Number(s);
}

export function hashText(str = '') {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const SUGGESTIONS = {
  hook: {
    action: 'Sits alone, motionless, facing a wall of trading monitors',
    pose: 'sitting',
    environment: 'Dark bedroom trading desk at 3 AM, only monitor light',
    animation: 'Slow push-in on the character while code lines fade in behind',
    camera: 'Slow dolly-in from wide to medium shot',
    background: 'Multiple monitors with dim candlestick charts',
    code: 'Scrolling Python strategy code, low opacity, purple tint — establishes the trading world',
    visuals: ['screens', 'code'],
    sfx: 'Low drone, faint keyboard clicks, room tone',
  },
  problem: {
    action: 'Leans forward, taps keys faster, shoulders tense',
    pose: 'trading',
    environment: 'Same desk, screens flashing red and green',
    animation: 'Rapid green/red numbers flicker across the frame',
    camera: 'Handheld micro-shake, tight on character and screen',
    background: 'Ticker tape of P&L numbers, mostly red',
    code: 'Terminal prints failed orders and stop-loss hits — the struggle made literal',
    visuals: ['ticker', 'terminal'],
    sfx: 'Notification pings, heartbeat thump, sharp glitch on losses',
  },
  story: {
    action: 'Walks slowly through a void of floating charts',
    pose: 'walking',
    environment: 'Abstract dark space with floating market data',
    animation: 'Charts drift past in parallax; equity curve draws itself',
    camera: 'Lateral tracking shot following the character',
    background: 'Floating statistics and a drawdown curve',
    code: 'Equity curve chart rendering line by line — the journey visualized',
    visuals: ['chart', 'stats', 'particles'],
    sfx: 'Soft piano notes, distant city ambience',
  },
  realization: {
    action: 'Stops, looks up; eyes glow brighter',
    pose: 'thinking',
    environment: 'Darkness lifts; a single spotlight on the character',
    animation: 'Noise fades out, one glowing rule appears in code: if (emotion) { wait(); }',
    camera: 'Static frame, slow zoom on the eyes',
    background: 'Clean glowing interface, minimal elements',
    code: 'A single highlighted line of code — the lesson as a rule',
    visuals: ['glow-ui', 'lighting'],
    sfx: 'Silence drop, then a single resonant tone',
  },
  conclusion: {
    action: 'Stands tall, motivational gesture, then sits back at the desk calmly',
    pose: 'motivational',
    environment: 'Desk at dawn, blue light through a window',
    animation: 'Candlesticks print steady green; particles rise',
    camera: 'Slow pull-back to wide shot',
    background: 'Calm chart with steady uptrend',
    code: 'Terminal logs: "discipline.check() → passed" — closure',
    visuals: ['candles', 'particles', 'lighting'],
    sfx: 'Rising cinematic swell, soft impact on final line',
  },
};

export function sectionSuggestions(section) {
  return SUGGESTIONS[section] || SUGGESTIONS.story;
}

// Group sentences into scene-sized chunks (~1–2 sentences, ≤ 24 words).
function chunkSentences(sentences, maxWords = 24) {
  const chunks = [];
  let cur = [];
  let words = 0;
  for (const s of sentences) {
    const w = wordCount(s);
    if (cur.length && words + w > maxWords) {
      chunks.push(cur.join(' '));
      cur = [];
      words = 0;
    }
    cur.push(s);
    words += w;
  }
  if (cur.length) chunks.push(cur.join(' '));
  return chunks;
}

let seq = 0;
const sceneId = () => `scn_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function blankScene(section = 'story', overrides = {}) {
  const sug = sectionSuggestions(section);
  return {
    id: sceneId(),
    section,
    start: 0,
    end: 4,
    voiceover: '',
    characterAction: sug.action,
    pose: sug.pose,
    expression: section === 'problem' ? 'worried' : section === 'conclusion' ? 'determined' : 'focused',
    environment: sug.environment,
    animation: sug.animation,
    camera: sug.camera,
    background: sug.background,
    codeAnimation: sug.code,
    visualTypes: sug.visuals,
    sfx: sug.sfx,
    caption: '',
    ...overrides,
  };
}

export function buildScenes(sections = {}, { speed = 1, gap = 0.35 } = {}) {
  const scenes = [];
  let t = 0;
  for (const section of SECTIONS) {
    const chunks = chunkSentences(splitSentences(sections[section] || ''));
    for (const text of chunks) {
      const dur = Math.max(1.5, estimateDuration(text, speed) + gap);
      scenes.push(blankScene(section, { start: +t.toFixed(1), end: +(t + dur).toFixed(1), voiceover: text, caption: text }));
      t += dur;
    }
  }
  return scenes;
}

// Recompute sequential timestamps keeping each scene's duration.
export function retime(scenes) {
  let t = 0;
  return scenes.map((s) => {
    const dur = Math.max(0.5, (s.end ?? 0) - (s.start ?? 0));
    const out = { ...s, start: +t.toFixed(1), end: +(t + dur).toFixed(1) };
    t += dur;
    return out;
  });
}

export const totalDuration = (scenes = []) => scenes.reduce((m, s) => Math.max(m, s.end || 0), 0);

export function sectionLabel(s) {
  return SECTION_LABELS[s] || s;
}

// ---------- Captions ----------
let cseq = 0;
const capId = () => `cap_${Date.now().toString(36)}${(cseq++).toString(36)}`;

function wordsWithTiming(text, start, end) {
  const words = text.split(/\s+/).filter(Boolean);
  const total = words.reduce((n, w) => n + Math.max(2, w.length), 0) || 1;
  let t = start;
  return words.map((w) => {
    const d = ((end - start) * Math.max(2, w.length)) / total;
    const out = { w, start: +t.toFixed(2), end: +(t + d).toFixed(2) };
    t += d;
    return out;
  });
}

// mode: 'sentence' → one caption per sentence-chunk (≤ maxWords); 'word' → short 2–4 word bursts.
export function captionsFromScenes(scenes = [], mode = 'sentence') {
  const maxWords = mode === 'word' ? 3 : 8;
  const items = [];
  for (const sc of scenes) {
    const text = (sc.caption || sc.voiceover || '').trim();
    if (!text) continue;
    const words = wordsWithTiming(text, sc.start, sc.end - 0.15);
    for (let i = 0; i < words.length; i += maxWords) {
      const group = words.slice(i, i + maxWords);
      items.push({
        id: capId(),
        sceneId: sc.id,
        start: group[0].start,
        end: group[group.length - 1].end,
        text: group.map((g) => g.w).join(' '),
        words: group,
      });
    }
  }
  return items;
}

// Re-distribute word timings after the user edits a caption's text or times.
export function retimeCaptionWords(cap) {
  return { ...cap, words: wordsWithTiming(cap.text, cap.start, cap.end) };
}
