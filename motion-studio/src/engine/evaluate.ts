import { clamp, ease, lerp } from './easing';
import type { Camera, CameraProp, ElementState, Keyframe, LayoutBox, SceneElement, TrackProp } from './schema';

export const TRACK_DEFAULTS: Record<Exclude<TrackProp, 'pose'>, number> = {
  x: 0, y: 0, scale: 1, sx: 1, sy: 1, rotation: 0, opacity: 1, progress: 1, blur: 0,
};

/** Value of a numeric keyframe track at time t (seconds, scene time). */
export function sampleTrack(kfs: Keyframe[] | undefined, t: number, fallback: number): number {
  if (!kfs || kfs.length === 0) return fallback;
  const sorted = kfs.length > 1 ? [...kfs].sort((a, b) => a.time - b.time) : kfs;
  if (t <= sorted[0].time) return Number(sorted[0].value);
  const last = sorted[sorted.length - 1];
  if (t >= last.time) return Number(last.value);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (t >= a.time && t <= b.time) {
      const span = b.time - a.time || 1e-9;
      return lerp(Number(a.value), Number(b.value), ease(a.easing, (t - a.time) / span));
    }
  }
  return fallback;
}

/** Discrete (string) track sample with blending info between neighbouring keys. */
export function sampleDiscrete(kfs: Keyframe[] | undefined, t: number): { from?: string; to?: string; mix: number } {
  if (!kfs || kfs.length === 0) return { mix: 0 };
  const s = [...kfs].sort((a, b) => a.time - b.time);
  if (t <= s[0].time) return { from: String(s[0].value), mix: 0 };
  const last = s[s.length - 1];
  if (t >= last.time) return { from: String(last.value), mix: 0 };
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i], b = s[i + 1];
    if (t >= a.time && t <= b.time) {
      const span = b.time - a.time || 1e-9;
      return { from: String(a.value), to: String(b.value), mix: ease(a.easing, (t - a.time) / span) };
    }
  }
  return { mix: 0 };
}

export function layoutFor(el: SceneElement, formatId: string): LayoutBox {
  return el.layout[formatId] ?? el.layout.landscape ?? Object.values(el.layout)[0] ?? { x: 0, y: 0, scale: 1, rotation: 0 };
}

/** Deterministic hash noise in [-1, 1]. */
export function noise(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

const DRAW_TYPES = new Set(['draw', 'typewriter']);

/**
 * Compute the full animated state of an element at scene time t for a format.
 * Order: base layout → keyframe tracks → entrance → exit → loop.
 */
export function evaluateElement(el: SceneElement, t: number, formatId: string): ElementState {
  const L = layoutFor(el, formatId);
  const visible = !el.hidden && t >= el.start - 1e-9 && t <= el.end + 1e-9;
  const local = t - el.start;
  const ms = L.motionScale ?? 1;
  const tr = el.tracks;
  const st: ElementState = {
    visible,
    local,
    x: L.x + sampleTrack(tr.x, t, 0) * ms,
    y: L.y + sampleTrack(tr.y, t, 0) * ms,
    scale: L.scale * sampleTrack(tr.scale, t, 1),
    sx: sampleTrack(tr.sx, t, 1),
    sy: sampleTrack(tr.sy, t, 1),
    rotation: L.rotation + sampleTrack(tr.rotation, t, 0),
    opacity: sampleTrack(tr.opacity, t, 1),
    progress: sampleTrack(tr.progress, t, 1),
    blur: sampleTrack(tr.blur, t, 0),
  };
  if (tr.pose && tr.pose.length) {
    const d = sampleDiscrete(tr.pose, t);
    st.pose = d.from; st.poseTo = d.to; st.poseMix = d.mix;
  }
  if (!visible) return st;

  // entrance
  const ai = el.animIn;
  if (ai && ai.type !== 'none') {
    const delay = ai.delay ?? 0;
    const raw = clamp((local - delay) / Math.max(ai.duration, 1e-4));
    const p = ease(ai.easing, raw);
    applyAnim(st, ai.type, p, raw, ai.distance ?? 200, true, !tr.progress);
  }
  // exit
  const ao = el.animOut;
  if (ao && ao.type !== 'none') {
    const outStart = el.end - ao.duration;
    if (t >= outStart) {
      const raw = clamp((t - outStart) / Math.max(ao.duration, 1e-4));
      const p = ease(ao.easing, raw);
      applyAnim(st, ao.type, 1 - p, 1 - raw, ao.distance ?? 200, false, !tr.progress);
    }
  }
  // loop
  const lp = el.loop;
  if (lp && lp.type !== 'none') {
    const ph = local * lp.speed * Math.PI * 2;
    switch (lp.type) {
      case 'float': st.y += Math.sin(ph) * lp.amount; break;
      case 'bob': st.y -= Math.abs(Math.sin(ph)) * lp.amount; break;
      case 'pulse': st.scale *= 1 + Math.sin(ph) * lp.amount; break;
      case 'spin': st.rotation += local * lp.speed * 360; break;
      case 'swing': st.rotation += Math.sin(ph) * lp.amount; break;
      case 'shake':
        st.x += noise(Math.floor(local * lp.speed * 20)) * lp.amount;
        st.y += noise(Math.floor(local * lp.speed * 20) + 99) * lp.amount;
        break;
      case 'blink': st.opacity *= Math.sin(ph) > -0.2 ? 1 : 0.15; break;
      case 'glowPulse': st.opacity *= 0.75 + 0.25 * (Math.sin(ph) * 0.5 + 0.5); break;
    }
  }
  return st;
}

/**
 * p   = eased progress (0 hidden → 1 fully in)
 * raw = linear progress (used for draw/typewriter so reveal speed is honest)
 */
function applyAnim(st: ElementState, type: string, p: number, raw: number, dist: number, entering: boolean, ownsProgress: boolean) {
  const inv = 1 - p;
  switch (type) {
    case 'fade': st.opacity *= p; break;
    case 'slideUp': st.y += inv * dist; st.opacity *= clamp(p * 1.6); break;
    case 'slideDown': st.y -= inv * dist; st.opacity *= clamp(p * 1.6); break;
    case 'slideLeft': st.x += inv * dist; st.opacity *= clamp(p * 1.6); break;
    case 'slideRight': st.x -= inv * dist; st.opacity *= clamp(p * 1.6); break;
    case 'pop': st.scale *= p; st.opacity *= clamp(p * 3); break;
    case 'scale': st.scale *= lerp(0.6, 1, p); st.opacity *= p; break;
    case 'rotate': st.rotation += inv * -90; st.scale *= lerp(0.5, 1, p); st.opacity *= p; break;
    case 'blur': st.blur += inv * 24; st.opacity *= p; break;
    case 'bounce': st.scale *= p; st.opacity *= clamp(p * 4); break;
    case 'drop': st.y -= inv * dist * 2; st.opacity *= clamp(p * 2); break;
    case 'flip': st.flip = Math.cos(inv * Math.PI / 2); st.opacity *= clamp(p * 2); break;
    case 'wipe': st.wipe = p; break;
    case 'draw':
    case 'typewriter':
      if (ownsProgress) st.progress = Math.min(st.progress, DRAW_TYPES.has(type) ? (entering ? p : p) : p);
      break;
  }
}

/* ----------------------------------------------------------------- camera */

export interface CameraState { x: number; y: number; zoom: number; rotation: number }

export function evaluateCamera(cam: Camera | undefined, t: number): CameraState {
  const tr = cam?.tracks ?? {};
  const s: CameraState = {
    x: sampleTrack(tr.x, t, 0),
    y: sampleTrack(tr.y, t, 0),
    zoom: sampleTrack(tr.zoom, t, 1),
    rotation: sampleTrack(tr.rotation, t, 0),
  };
  if (cam?.shake) {
    const k = Math.floor(t * 24);
    s.x += noise(k) * cam.shake;
    s.y += noise(k + 77) * cam.shake;
  }
  return s;
}

export const CAMERA_PROPS: CameraProp[] = ['x', 'y', 'zoom', 'rotation'];

/** All "interesting" times of an element (for prompts / snapshot sampling). */
export function elementKeyTimes(el: SceneElement): number[] {
  const set = new Set<number>([el.start, el.end]);
  if (el.animIn.type !== 'none') set.add(el.start + (el.animIn.delay ?? 0) + el.animIn.duration);
  if (el.animOut.type !== 'none') set.add(el.end - el.animOut.duration);
  Object.values(el.tracks).forEach((k) => k?.forEach((f) => set.add(f.time)));
  return [...set].sort((a, b) => a - b);
}
