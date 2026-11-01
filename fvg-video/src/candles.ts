import { interpolate } from "remotion";

export type CandleData = { o: number; h: number; l: number; c: number };

/** Shorthand: k(open, high, low, close). */
export const k = (o: number, h: number, l: number, c: number): CandleData => ({ o, h, l, c });

/** Mirror candles around a price (turns a bullish sequence into a bearish one). */
export const mirror = (data: CandleData[], axis: number): CandleData[] =>
  data.map((d) => ({ o: axis - d.o, h: axis - d.l, l: axis - d.h, c: axis - d.c }));

/**
 * State of a candle while it is forming.
 * Price travels open -> low -> high -> close (bullish) or open -> high -> low -> close (bearish),
 * so wicks and body grow the way a live candle does.
 */
export const candleAt = (d: CandleData, progress: number) => {
  if (progress >= 1) return { cur: d.c, hi: d.h, lo: d.l };
  const bull = d.c >= d.o;
  const pts = bull ? [d.o, d.l, d.h, d.c] : [d.o, d.h, d.l, d.c];
  const segs = [Math.abs(pts[1] - pts[0]), Math.abs(pts[2] - pts[1]), Math.abs(pts[3] - pts[2])];
  const total = segs[0] + segs[1] + segs[2] || 1;
  const knots = [0, segs[0] / total, (segs[0] + segs[1]) / total, 1];
  // Ensure strictly increasing knots
  for (let i = 1; i < knots.length; i++) {
    if (knots[i] <= knots[i - 1]) knots[i] = knots[i - 1] + 1e-6;
  }
  const p = Math.max(0, Math.min(1, progress));
  const cur = interpolate(p, knots, pts);
  let hi = Math.max(d.o, cur);
  let lo = Math.min(d.o, cur);
  for (let i = 1; i < 3; i++) {
    if (p >= knots[i]) {
      hi = Math.max(hi, pts[i]);
      lo = Math.min(lo, pts[i]);
    }
  }
  return { cur, hi, lo };
};

export type Timing = [at: number, dur: number];

/**
 * Build appear-times for a candle list.
 * groups: indices [from..to] start at `start` seconds, one every `step` seconds, each forming over `dur`.
 */
export const buildTiming = (
  n: number,
  groups: { from: number; to: number; start: number; step?: number; dur?: number }[],
): Timing[] => {
  const out: Timing[] = Array.from({ length: n }, () => [1e6, 0.5] as Timing);
  for (const g of groups) {
    const step = g.step ?? 0.5;
    for (let i = g.from; i <= g.to; i++) {
      out[i] = [g.start + (i - g.from) * step, g.dur ?? step * 0.9];
    }
  }
  return out;
};

/** Deterministic pseudo random walk, used for background charts. */
export const randomWalk = (n: number, start: number, seed: number, drift = 0.05): CandleData[] => {
  let x = seed;
  const rnd = () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
  const out: CandleData[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    const o = price;
    const c = o + (rnd() - 0.5 + drift) * 3;
    const h = Math.max(o, c) + rnd() * 1.2;
    const l = Math.min(o, c) - rnd() * 1.2;
    out.push({ o, h, l, c });
    price = c;
  }
  return out;
};

/** Lowest / highest price reached so far by candles [from..to] at time t. */
export const extremeSoFar = (
  data: CandleData[],
  timing: Timing[],
  t: number,
  from: number,
  to: number,
  kind: "low" | "high",
): number | null => {
  let best: number | null = null;
  for (let i = from; i <= to; i++) {
    const [at, dur] = timing[i];
    if (t < at) continue;
    const st = candleAt(data[i], Math.min(1, (t - at) / dur));
    const v = kind === "low" ? st.lo : st.hi;
    if (best === null) best = v;
    else best = kind === "low" ? Math.min(best, v) : Math.max(best, v);
  }
  return best;
};
