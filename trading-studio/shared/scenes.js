// Script → scene breakdown, timing, captions and hashing. Pure functions shared by client and server.
import { SECTIONS, SECTION_LABELS } from './defaults.js';

export const WORDS_PER_SECOND = 2.6; // calm documentary narration pace

export function splitSentences(text = '') {
  // Split after sentence punctuation followed by a space, so prices like 27,093.50 stay intact.
  return text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…]["”’)]*)\s+/).map((s) => s.trim()).filter(Boolean);
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
  hook: { action: 'Points at the chart as the key candle lights up', pose: 'motivational', animation: 'Fast zoom into the key moment; the decisive candle flashes', camera: 'Punch-in on the key candles', background: 'Chart full-frame, dark terminal background', code: 'None — the real chart is the visual', sfx: 'Low hit on the key candle, subtle whoosh on the zoom', chart: 'key' },
  intro: { action: 'Stands beside the chart, calm gesture', pose: 'idle', animation: 'Chart eases out to show the wider context', camera: 'Slow pull-back to the full example window', background: 'Chart with session separators', code: 'Concept title card fades in over the chart', sfx: 'Soft rise', chart: 'overview' },
  simple: { action: 'Thinking pose, then gestures toward the chart', pose: 'thinking', animation: 'Relevant candles highlight one by one', camera: 'Gentle drift across the formation', background: 'Chart, other candles dimmed', code: 'Plain-language label appears next to the formation', sfx: 'Light ticks as candles highlight', chart: 'formation' },
  technical: { action: 'Typing / trading pose at the side of the frame', pose: 'trading', animation: 'Precise levels and labels draw onto the chart', camera: 'Tight framing on the exact prices', background: 'Chart with price scale emphasized', code: 'Rule text: exact definition with prices', sfx: 'Pen-draw sound as lines appear', chart: 'formation' },
  demo: { action: 'Watches the chart, small reactions on each step', pose: 'trading', animation: 'Each step’s annotations animate in while the camera moves to its candles', camera: 'Camera follows the step’s focus window', background: 'Real historical chart (source shown on screen)', code: 'Annotations from the detected example', sfx: 'Subtle click per annotation', chart: 'step' },
  breakdown: { action: 'Explains with hand gestures as levels appear', pose: 'thinking', animation: 'Entry, stop and target lines draw in; outcome candles play forward', camera: 'Follows the step’s focus window', background: 'Real historical chart', code: 'Trade plan levels with prices', sfx: 'Soft confirmation tone on the outcome', chart: 'step' },
  takeaway: { action: 'Confident nod, motivational gesture', pose: 'motivational', animation: 'All annotations visible; checklist builds next to the chart', camera: 'Wide shot of the full example', background: 'Chart with every annotation', code: 'Three-point checklist', sfx: 'Gentle chime per checklist point', chart: 'all' },
  ending: { action: 'Sits back calmly at the desk', pose: 'sitting', animation: 'Chart fades, character centered', camera: 'Slow pull-back', background: 'Dark terminal background', code: 'Subscribe / next-video card (edit in post)', sfx: 'Soft outro tone', chart: 'none' },
};

export function sectionSuggestions(section) {
  return SUGGESTIONS[section] || SUGGESTIONS.demo;
}

// Group sentences into scene-sized chunks (~1–2 sentences, ≤ maxWords words).
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

export const DEFAULT_CHAR_LAYOUT = { visible: true, position: 'right', size: 1 };

export function blankScene(section = 'demo', overrides = {}) {
  const sug = sectionSuggestions(section);
  return {
    id: sceneId(),
    section,
    start: 0,
    end: 4,
    voiceover: '',
    characterAction: sug.action,
    pose: sug.pose,
    expression: 'focused',
    environment: sug.background,
    animation: sug.animation,
    camera: sug.camera,
    background: sug.background,
    codeAnimation: sug.code,
    visualTypes: [],
    sfx: sug.sfx,
    caption: '',
    chart: null, // { exampleId, stepId, focus:[a,b], reveal:[annotation ids], hide:[] }
    characterLayout: { ...DEFAULT_CHAR_LAYOUT },
    transition: 'cut',
    ...overrides,
  };
}

// Default chart binding for a section, based on the first approved example.
function chartFor(kind, ex, stepIdx = 0) {
  if (!ex || kind === 'none') return null;
  const steps = ex.steps || [];
  const all = (ex.annotations || []).map((a) => a.id);
  if (kind === 'step') {
    const st = steps[Math.min(stepIdx, steps.length - 1)];
    return st ? { exampleId: ex.id, stepId: st.id, focus: [...st.focus], reveal: [...(st.reveal || [])], hide: [] } : null;
  }
  if (kind === 'key') {
    const k = steps.find((x) => x.reveal?.length) || steps[0];
    return { exampleId: ex.id, stepId: k?.id || null, focus: k ? [...k.focus] : [...ex.range], reveal: [], hide: [] };
  }
  if (kind === 'formation') {
    const k = steps.find((x) => x.reveal?.length) || steps[0];
    return { exampleId: ex.id, stepId: k?.id || null, focus: k ? [...k.focus] : [...ex.range], reveal: k ? [...k.reveal] : [], hide: [] };
  }
  if (kind === 'all') return { exampleId: ex.id, stepId: null, focus: [...ex.range], reveal: all, hide: [] };
  return { exampleId: ex.id, stepId: null, focus: [...ex.range], reveal: [], hide: [] };
}

// Build timed scenes from the script. In "demo" and "breakdown", each paragraph is bound
// to the next teaching step of the approved examples (in order), so narration and chart stay in sync.
export function buildScenes(sections = {}, { speed = 1, gap = 0.35, examples = [] } = {}) {
  const scenes = [];
  let t = 0;
  const steps = examples.filter((e) => e.kind !== 'screenshot').flatMap((ex) => (ex.steps || []).map((_, k) => ({ ex, k })));
  const shots = examples.filter((e) => e.kind === 'screenshot');
  let stepPtr = 0;
  let shotPtr = 0;
  const first = examples.find((e) => e.kind !== 'screenshot');
  for (const section of SECTIONS) {
    const text = (sections[section] || '').trim();
    if (!text) continue;
    const sug = sectionSuggestions(section);
    const paragraphs = sug.chart === 'step' ? text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) : [text];
    for (const para of paragraphs) {
      let chart = null;
      if (sug.chart === 'step') {
        // Prefer the step whose text this paragraph contains (the writer quotes step text); else the next step in order.
        const match = steps.findIndex((x, k) => k >= stepPtr - 1 && para.includes(x.ex.steps[x.k].text.slice(0, 48)));
        if (match >= 0) stepPtr = match;
        if (stepPtr < steps.length) { const { ex, k } = steps[stepPtr++]; chart = chartFor('step', ex, k); }
        else if (shotPtr < shots.length) { const sh = shots[shotPtr++]; chart = { exampleId: sh.id, stepId: null, focus: null, reveal: [], hide: [] }; }
        else chart = chartFor('all', first);
      } else chart = chartFor(sug.chart, first);
      const chunks = chunkSentences(splitSentences(para), sug.chart === 'step' ? 40 : 24);
      chunks.forEach((chunk, n) => {
        const dur = Math.max(1.5, estimateDuration(chunk, speed) + gap);
        scenes.push(blankScene(section, {
          start: +t.toFixed(1), end: +(t + dur).toFixed(1), voiceover: chunk, caption: chunk,
          chart: chart ? { ...chart, reveal: n === 0 ? chart.reveal : [] } : null,
          characterLayout: { ...DEFAULT_CHAR_LAYOUT, position: chart ? 'right' : 'center', size: chart ? 0.8 : 1.2 },
          transition: n === 0 ? 'zoom' : 'cut',
        }));
        t += dur;
      });
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
