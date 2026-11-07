import test from 'node:test';
import assert from 'node:assert/strict';
import NQ from '../shared/seed-market/nq5m.js';
import { toBars, resample, parseCsv, sessionOf, toColumns } from '../shared/market.js';
import { DETECTORS } from '../shared/detectors.js';
import { snapshotExample, revealState } from '../shared/examples.js';
import { composeScript } from '../shared/writer.js';
import { buildScenes } from '../shared/scenes.js';
import { CONCEPTS } from '../shared/concepts.js';

const bars = toBars(NQ);
const meta = { conceptId: 'fvg', symbol: NQ.symbol, interval: '5m', source: NQ.source };

test('seed data is real-shaped OHLC (high >= open/close >= low)', () => {
  assert.ok(bars.length >= 200);
  for (const b of bars) assert.ok(b.h >= Math.max(b.o, b.c) && b.l <= Math.min(b.o, b.c));
});

test('every concept points at an existing detector', () => {
  for (const c of CONCEPTS) assert.ok(DETECTORS[c.detector], c.id);
});

test('FVG examples are genuine gaps in the data', () => {
  const ex = DETECTORS.fvg(bars);
  assert.ok(ex.length > 0);
  for (const e of ex) {
    const i = e.keyIndex;
    const { top, bottom } = e.facts;
    assert.ok(top > bottom);
    if (e.direction === 'bullish') { assert.equal(bottom, bars[i - 1].h); assert.equal(top, bars[i + 1].l); }
    else { assert.equal(top, bars[i - 1].l); assert.equal(bottom, bars[i + 1].h); }
  }
});

test('sweeps actually trade beyond the level and close back', () => {
  for (const e of DETECTORS.sweep(bars)) {
    const b = bars[e.facts.sweep];
    if (e.concept === 'bsl') assert.ok(b.h > e.facts.level && b.c < e.facts.level);
    else assert.ok(b.l < e.facts.level && b.c > e.facts.level);
  }
});

test('resampling only aggregates real bars', () => {
  const h = resample(bars, 3600);
  assert.ok(h.length < bars.length);
  assert.equal(Math.max(...h.map((x) => x.h)), Math.max(...bars.map((x) => x.h)));
});

test('CSV import parses TradingView export format', () => {
  const csv = 'time,open,high,low,close,Volume\n' + bars.slice(0, 20).map((b) => `${b.t},${b.o},${b.h},${b.l},${b.c},${b.v}`).join('\n');
  const parsed = parseCsv(csv);
  assert.equal(parsed.length, 20);
  assert.deepEqual(parsed[3], bars[3]);
});

test('session detection uses New York time', () => {
  const nyOpen = bars.find((b) => sessionOf(b.t) === 'nyam');
  assert.ok(nyOpen);
});

test('snapshot keeps real bars, source and in-range annotations', () => {
  const ex = DETECTORS.fvg(bars)[0];
  const snap = snapshotExample(bars, ex, meta);
  assert.equal(snap.source.kind, 'tradingview-connector');
  assert.ok(snap.bars.t.length <= 220);
  for (const a of snap.annotations) for (const k of ['i1', 'i2']) if (a[k] != null) assert.ok(a[k] >= 0 && a[k] < snap.bars.t.length, `${a.id} ${k}`);
  const k = snap.bars.t.indexOf(bars[ex.keyIndex].t);
  assert.equal(snap.bars.h[k], bars[ex.keyIndex].h);
});

test('script uses example facts and scenes sync to chart steps', () => {
  const snap = snapshotExample(bars, DETECTORS.fvg(bars)[0], meta);
  const sections = composeScript({ concept: CONCEPTS.find((c) => c.id === 'fvg'), examples: [snap], inputs: { length: 'short', duration: 60, level: 'Beginner', tone: 'Educational' } });
  assert.match(sections.demo, /TradingView/);
  const scenes = buildScenes(sections, { examples: [snap] });
  const demo = scenes.filter((s) => s.section === 'demo' || s.section === 'breakdown');
  assert.ok(demo.every((s) => s.chart?.exampleId === snap.id && s.chart.stepId));
  const idx = scenes.findIndex((s) => s.chart?.stepId === 'imbalance');
  const { shown, fresh } = revealState(scenes, idx);
  assert.ok([...shown, ...fresh].length > 0);
});
