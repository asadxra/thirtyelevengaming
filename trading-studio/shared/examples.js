// Chart examples saved into a project: a window of REAL bars plus the detected example,
// re-indexed to that window, and the source metadata that must travel with it.
import { toColumns, toBars, formatBarTime, sessionOf, SESSIONS } from './market.js';
import { resolveReveal } from './detectors.js';

const MAX_BARS = 220;

export function snapshotExample(bars, ex, meta) {
  let [a, b] = ex.range;
  const pad = 15;
  a = Math.max(0, a - pad);
  b = Math.min(bars.length - 1, b + pad);
  if (b - a + 1 > MAX_BARS) a = Math.max(0, b - MAX_BARS + 1);
  const shift = (i) => (i == null ? i : i - a);
  const win = bars.slice(a, b + 1);
  const annotations = ex.annotations.map((x) => ({ ...x, i1: shift(x.i1), i2: shift(x.i2) }));
  const steps = ex.steps.map((s) => ({ ...s, focus: [Math.max(0, s.focus[0] - a), Math.min(win.length - 1, s.focus[1] - a)], reveal: resolveReveal(ex, s.reveal) }));
  const key = bars[ex.keyIndex];
  return {
    id: `ex_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    kind: 'historical',
    conceptId: meta.conceptId,
    detector: ex.concept,
    symbol: meta.symbol,
    interval: meta.interval,
    direction: ex.direction,
    summary: ex.summary,
    keyTime: key.t,
    keyLabel: formatBarTime(key.t),
    session: SESSIONS.find((s) => s.id === sessionOf(key.t))?.label || 'Outside main sessions',
    range: [Math.max(0, ex.range[0] - a), Math.min(win.length - 1, ex.range[1] - a)],
    bars: toColumns(win),
    annotations,
    steps,
    overlays: ex.overlays || [],
    source: { ...meta.source, symbol: meta.symbol, interval: meta.interval, from: win[0].t, to: win[win.length - 1].t },
    approved: true,
    note: '',
    createdAt: new Date().toISOString(),
  };
}

export const exampleBars = (ex) => (ex?.bars ? toBars(ex.bars) : []);

export function sourceLabel(ex) {
  if (!ex) return '';
  if (ex.kind === 'screenshot') return ex.source?.label || 'User-provided screenshot';
  if (ex.kind === 'illustration') return 'Illustration (not real market data)';
  const s = ex.source || {};
  if (s.kind === 'tradingview-connector') return `Real data · TradingView · ${ex.symbol} ${ex.interval}`;
  if (s.kind === 'csv') return `Real data · imported CSV${s.provider ? ` (${s.provider})` : ''} · ${ex.symbol} ${ex.interval}`;
  return `${s.provider || 'Imported data'} · ${ex.symbol} ${ex.interval}`;
}

// Annotations visible (and newly revealed) at a given scene: cumulative over earlier scenes using the same example.
export function revealState(scenes, sceneIdx) {
  const scene = scenes[sceneIdx];
  const exId = scene?.chart?.exampleId;
  if (!exId) return { shown: new Set(), fresh: new Set() };
  const shown = new Set();
  for (let k = 0; k < sceneIdx; k++) {
    const s = scenes[k];
    if (s.chart?.exampleId === exId) (s.chart.reveal || []).forEach((id) => shown.add(id));
  }
  const fresh = new Set((scene.chart.reveal || []).filter((id) => !shown.has(id)));
  (scene.chart.hide || []).forEach((id) => shown.delete(id));
  return { shown, fresh };
}
