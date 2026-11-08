import type { Easing, EasingName } from './schema';

/** Exact cubic-bezier equivalents of named easings (used in exports & prompts). */
export const EASING_BEZIER: Partial<Record<EasingName, [number, number, number, number]>> = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  easeInCubic: [0.32, 0, 0.67, 0],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  easeInExpo: [0.7, 0, 0.84, 0],
  easeOutExpo: [0.16, 1, 0.3, 1],
  easeInOutExpo: [0.87, 0, 0.13, 1],
  easeInBack: [0.36, 0, 0.66, -0.56],
  easeOutBack: [0.34, 1.56, 0.64, 1],
  easeInOutBack: [0.68, -0.6, 0.32, 1.6],
};

export const EASING_NAMES: EasingName[] = [
  'linear', 'easeIn', 'easeOut', 'easeInOut', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
  'easeInExpo', 'easeOutExpo', 'easeInOutExpo', 'easeInBack', 'easeOutBack', 'easeInOutBack',
  'easeOutElastic', 'easeOutBounce', 'step',
];

/** Solve a CSS cubic-bezier timing function. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (x > v) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

function bounceOut(x: number) {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

function elasticOut(x: number) {
  const c4 = (2 * Math.PI) / 3;
  return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

const cache = new Map<string, (x: number) => number>();

export function easingFn(e: Easing | undefined): (x: number) => number {
  if (!e) return (x) => x;
  const key = Array.isArray(e) ? e.join(',') : e;
  const hit = cache.get(key);
  if (hit) return hit;
  let fn: (x: number) => number;
  if (Array.isArray(e)) fn = cubicBezier(e[0], e[1], e[2], e[3]);
  else if (e === 'easeOutBounce') fn = bounceOut;
  else if (e === 'easeOutElastic') fn = elasticOut;
  else if (e === 'step') fn = (x) => (x >= 1 ? 1 : 0);
  else {
    const b = EASING_BEZIER[e] ?? [0, 0, 1, 1];
    fn = cubicBezier(b[0], b[1], b[2], b[3]);
  }
  cache.set(key, fn);
  return fn;
}

export function ease(e: Easing | undefined, x: number) {
  return easingFn(e)(Math.min(1, Math.max(0, x)));
}

export function describeEasing(e: Easing): string {
  if (Array.isArray(e)) return `cubic-bezier(${e.map((n) => +n.toFixed(3)).join(', ')})`;
  const b = EASING_BEZIER[e];
  if (b) return `${e} = cubic-bezier(${b.join(', ')})`;
  if (e === 'easeOutBounce') return 'easeOutBounce (Robert Penner bounce-out, n1=7.5625, d1=2.75)';
  if (e === 'easeOutElastic') return 'easeOutElastic (2^(-10x) * sin((10x - 0.75) * 2π/3) + 1)';
  if (e === 'step') return 'step (hold value, jump at end of segment)';
  return e;
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
