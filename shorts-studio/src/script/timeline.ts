// Script-driven timing. Every on-screen element enters when the narrator says it.
// Shared by the Remotion template, the HyperFrames generator and the FFmpeg SFX mix
// (Node runs this file directly through type stripping, so keep it import-free).

export type Sfx = "whoosh" | "pop" | "tick" | "impact" | "riser" | "ding" | "swipe";

export type Word = { text: string; start: number; end: number }; // seconds, scene-local

export type TimedScene = {
  start: number;
  dur: number;
  /** Element key → entrance time in seconds, scene-local */
  at: Record<string, number>;
};

export type Cue = { t: number; sfx: Sfx; volume: number };

export type Timeline = { scenes: TimedScene[]; cues: Cue[] };

type Element = { key: string; text: string; sfx: Sfx | null; fixed?: number };

type AnyScene = { type: string; voiceover: string; [k: string]: any };
type CaptionLike = { text: string; startMs: number; endMs: number };

const NUM: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  ten: "10", eleven: "11", twelve: "12", fifteen: "15", twenty: "20", "twenty-five": "25", thirty: "30", "thirty-three": "33",
  forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90", hundred: "100", half: "50", double: "100",
};
const STOP = new Set(
  "the a an and or but to of in on at for with is are was be it its it's this that you your youre you're i my we our they them so just not no do does did says say said like feels feel then there here what when how all".split(" "),
);

export const norm = (w: string) => {
  const s = w.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9'%-]/g, "").replace(/%$/, "");
  return NUM[s] ?? s.replace(/^-|-$/g, "");
};
const content = (text: string) =>
  String(text || "")
    .split(/\s+/)
    .map(norm)
    .filter((w) => w && !STOP.has(w) && (w.length > 2 || /^\d+$/.test(w)));

/** The elements of a scene, in reading order, with the sound each one makes. */
export function elementsOf(s: AnyScene): Element[] {
  const L = (lines: any[] = [], prefix: string, sfx: Sfx | null): Element[] =>
    lines.map((l, i) => ({ key: `${prefix}${i}`, text: l.text, sfx }));
  switch (s.type) {
    case "title":
      return [
        ...(s.icon ? [{ key: "icon", text: "", sfx: "pop" as Sfx, fixed: 0 }] : []),
        { key: "title", text: s.title, sfx: "impact", fixed: s.icon ? 0.25 : 0.05 },
        ...(s.subtitle ? [{ key: "subtitle", text: s.subtitle, sfx: "tick" as Sfx }] : []),
      ];
    case "statement":
      return [...(s.icon ? [{ key: "icon", text: "", sfx: "pop" as Sfx, fixed: 0 }] : []), ...L(s.lines, "line", "tick")];
    case "chart":
      return [
        ...L(s.headline, "head", "tick"),
        { key: "draw", text: "", sfx: "riser" },
        { key: "result", text: `${s.resultNote ?? ""} ${s.levelLabel ?? ""} ${s.result ?? ""}`, sfx: "impact" },
      ];
    case "versus":
      return [
        { key: "a", text: `${s.a?.quote} ${s.a?.label}`, sfx: "swipe" },
        { key: "b", text: `${s.b?.quote} ${s.b?.label}`, sfx: "swipe" },
        ...L(s.footer, "foot", "tick"),
      ];
    case "bars":
      return [
        { key: "head", text: s.headline, sfx: "tick", fixed: 0.05 },
        ...(s.rows ?? []).map((r: any, i: number) => ({ key: `row${i}`, text: `${r.left} ${r.right}`, sfx: "pop" as Sfx })),
        ...(s.footer ? [{ key: "foot", text: s.footer, sfx: "tick" as Sfx }] : []),
      ];
    case "list":
      return [
        { key: "head", text: s.headline, sfx: "tick", fixed: 0.05 },
        ...(s.items ?? []).map((t: string, i: number) => ({ key: `item${i}`, text: t, sfx: "pop" as Sfx })),
      ];
    case "outro":
      return [
        { key: "lead", text: s.lead, sfx: "tick" },
        { key: "punch", text: s.punch, sfx: "impact" },
        ...(s.cta ? [{ key: "cta", text: s.cta, sfx: "ding" as Sfx }] : []),
      ];
  }
  return [];
}

/** Evenly spaced words, for when there is no real voiceover yet. */
export function estimateWords(voiceover: string, dur: number): Word[] {
  const ws = String(voiceover || "").trim().split(/\s+/).filter(Boolean);
  const per = Math.max(0.1, (dur - 0.4) / Math.max(1, ws.length));
  return ws.map((text, i) => ({ text, start: 0.15 + i * per, end: 0.15 + (i + 1) * per }));
}

/** Matches each element to the moment its words are spoken. */
export function timeScene(s: AnyScene, dur: number, words: Word[]): Record<string, number> {
  const els = elementsOf(s);
  const spoken = words.map((w) => norm(w.text));
  const at: Record<string, number> = {};
  const latest = Math.max(0.3, dur - 0.7);
  let cursor = 0; // word index: elements follow the narration in order
  let last = -0.3;
  const keysets = els.map((el) => new Set(content(el.text)));
  const found: (number | null)[] = els.map((el, k) => {
    if (el.fixed !== undefined) return el.fixed;
    const keys = keysets[k];
    if (!keys.size) return null;
    // Prefer words only this element has; shared words ("feels", "stop") are a fallback
    const unique = new Set([...keys].filter((w) => !keysets.some((o, m) => m !== k && o.has(w))));
    for (const pool of unique.size ? [unique, keys] : [keys]) {
      for (let i = cursor; i < spoken.length; i++) {
        if (pool.has(spoken[i])) {
          cursor = i + 1;
          return Math.max(0, words[i].start - 0.12);
        }
      }
    }
    return null;
  });
  // Fill elements with no spoken match between their matched neighbours
  for (let i = 0; i < els.length; i++) {
    let t = found[i];
    if (t == null) {
      const prev = i === 0 ? 0 : at[els[i - 1].key];
      let j = i + 1;
      while (j < els.length && found[j] == null) j++;
      const next = j < els.length ? (found[j] as number) : latest;
      t = prev + (next - prev) / (j - i + 1);
      if (els[i].key === "draw") t = Math.max(t, prev + 0.2);
    }
    t = Math.min(latest, Math.max(t, last + 0.22));
    at[els[i].key] = Math.round(t * 100) / 100;
    last = t;
  }
  // The chart line draws from "draw" until the result lands
  if (at.draw !== undefined && at.result !== undefined && at.result - at.draw < 0.8) {
    at.result = Math.min(latest, at.draw + 0.8);
  }
  return at;
}

const VOLUME: Record<Sfx, number> = { whoosh: 0.35, swipe: 0.4, pop: 0.45, tick: 0.25, impact: 0.6, riser: 0.35, ding: 0.4 };

export function buildTimeline(
  scenes: AnyScene[],
  sceneDurations: number[],
  captions?: CaptionLike[] | null,
  sfxVolume = 1,
): Timeline {
  const out: TimedScene[] = [];
  const cues: Cue[] = [];
  let start = 0;
  scenes.forEach((s, i) => {
    const dur = sceneDurations[i];
    const words: Word[] = captions?.length
      ? captions
          .filter((c) => c.startMs / 1000 >= start - 0.05 && c.startMs / 1000 < start + dur)
          .map((c) => ({ text: c.text.trim(), start: c.startMs / 1000 - start, end: c.endMs / 1000 - start }))
      : estimateWords(s.voiceover, dur);
    const at = timeScene(s, dur, words);
    out.push({ start, dur, at });
    if (i > 0) cues.push({ t: Math.max(0, start - 0.18), sfx: "whoosh", volume: VOLUME.whoosh * sfxVolume });
    for (const el of elementsOf(s)) {
      if (el.sfx) cues.push({ t: start + at[el.key], sfx: el.sfx, volume: VOLUME[el.sfx] * sfxVolume });
    }
    start += dur;
  });
  return { scenes: out, cues: cues.sort((a, b) => a.t - b.t) };
}
