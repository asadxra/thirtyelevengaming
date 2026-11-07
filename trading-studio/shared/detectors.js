// Concept detectors: scan REAL bars for places where a trading concept actually occurred.
// Each example lists the exact candles, prices and times involved, the chart annotations,
// and a teaching sequence (steps) that the script and animation follow.
// Detection is rule-based and must be reviewed by a human before use in a video.
import { atr, ema, rsi, macd, swings, nyParts, sessionOf, formatBarTime, fmtPrice } from './market.js';

let seq = 0;
const aid = (p) => `${p}_${(seq++).toString(36)}`;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const t = (bars, i) => formatBarTime(bars[clamp(i, 0, bars.length - 1)].t);
const P = (x, ref) => fmtPrice(x, ref);

function view(bars, from, to, pad = 12) {
  return [clamp(from - pad, 0, bars.length - 1), clamp(to + pad, 0, bars.length - 1)];
}

function forward(bars, from, n, dir) {
  const end = Math.min(bars.length - 1, from + n);
  let best = from, worst = from;
  for (let j = from; j <= end; j++) {
    if (dir > 0 ? bars[j].h > bars[best].h : bars[j].l < bars[best].l) best = j;
    if (dir > 0 ? bars[j].l < bars[worst].l : bars[j].h > bars[worst].h) worst = j;
  }
  return { best, worst, end };
}

function tradePlan(bars, { dir, entry, stop, fromIdx, ref }) {
  const risk = Math.abs(entry - stop);
  const f = forward(bars, fromIdx, 40, dir);
  const reach = dir > 0 ? bars[f.best].h : bars[f.best].l;
  let stopped = false;
  for (let j = fromIdx; j <= f.end; j++) {
    if (dir > 0 ? bars[j].l <= stop : bars[j].h >= stop) { stopped = j <= f.best; break; }
    if (j === f.best) break;
  }
  const target = dir > 0 ? entry + risk * 2 : entry - risk * 2;
  const hit2R = dir > 0 ? reach >= target : reach <= target;
  const mfeR = risk ? Math.abs(reach - entry) / risk : 0;
  return { entry, stop, target, risk, reach, reachIdx: f.best, stopped, hit2R, mfeR: +mfeR.toFixed(2), ref };
}

function planAnnotations(plan, i1, i2) {
  const ref = plan.ref;
  return [
    { id: aid('entry'), type: 'hline', role: 'entry', i1, i2, price: plan.entry, text: `Entry ${P(plan.entry, ref)}` },
    { id: aid('stop'), type: 'hline', role: 'stop', i1, i2, price: plan.stop, text: `Stop ${P(plan.stop, ref)}` },
    { id: aid('tp'), type: 'hline', role: 'target', i1, i2, price: plan.target, text: `2R target ${P(plan.target, ref)}` },
  ];
}

function planText(plan, dir) {
  const ref = plan.ref;
  const res = plan.stopped
    ? `In this example the stop at ${P(plan.stop, ref)} was hit before price moved in the expected direction, which is exactly why the stop exists.`
    : plan.hit2R
      ? `Price went on to reach ${P(plan.reach, ref)}, more than two times the risk (about ${plan.mfeR}R at the extreme).`
      : `Price reached ${P(plan.reach, ref)} (about ${plan.mfeR}R) without hitting the stop, but did not reach a full 2R target.`;
  return `A ${dir > 0 ? 'long' : 'short'} idea: entry ${P(plan.entry, ref)}, stop ${P(plan.stop, ref)} (risk ${P(plan.risk, ref)} points), first target at 2R ${P(plan.target, ref)}. ${res}`;
}

function step(id, label, text, focus, reveal = []) {
  return { id, label, text, focus, reveal };
}

// ---------------------------------------------------------------- FVG
function detectFVG(bars, { minAtr = 0.3, max = 8 } = {}) {
  const A = atr(bars);
  const out = [];
  for (let i = 2; i < bars.length - 3; i++) {
    const a = bars[i - 2], b = bars[i - 1], c = bars[i];
    for (const dir of [1, -1]) {
      const bottom = dir > 0 ? a.h : c.h;
      const top = dir > 0 ? c.l : a.l;
      const gap = top - bottom;
      if (gap <= 0 || gap < minAtr * A[i]) continue;
      const ref = c.c;
      // first revisit into the gap
      let j = -1;
      for (let k = i + 1; k < bars.length; k++) {
        if (dir > 0 ? bars[k].l <= top : bars[k].h >= bottom) { j = k; break; }
      }
      let invalid = -1;
      if (j > 0) for (let k = j; k < Math.min(bars.length, j + 30); k++) if (dir > 0 ? bars[k].c < bottom : bars[k].c > top) { invalid = k; break; }
      const entry = dir > 0 ? top : bottom;
      const stop = dir > 0 ? Math.min(a.l, b.l) : Math.max(a.h, b.h);
      const plan = j > 0 ? tradePlan(bars, { dir, entry, stop, fromIdx: j, ref }) : null;
      const score = gap / A[i] + (j > 0 ? 1 : 0) + (plan && !plan.stopped ? Math.min(plan.mfeR, 4) : 0) + Math.abs(b.c - b.o) / A[i];
      const name = dir > 0 ? 'bullish' : 'bearish';
      const boxEnd = j > 0 ? (invalid > 0 ? invalid : Math.min(bars.length - 1, j + 6)) : Math.min(bars.length - 1, i + 30);
      const ann = [
        { id: aid('hl'), type: 'highlight', role: dir > 0 ? 'bull' : 'bear', i1: i - 2, i2: i, text: '3-candle formation' },
        { id: aid('fvg'), type: 'box', role: 'fvg', i1: i - 2, i2: boxEnd, p1: bottom, p2: top, text: `${dir > 0 ? 'Bullish' : 'Bearish'} FVG ${P(bottom, ref)}–${P(top, ref)}` },
        { id: aid('ce'), type: 'hline', role: 'info', i1: i - 2, i2: boxEnd, price: (top + bottom) / 2, text: 'CE (50%)', dashed: true },
      ];
      if (j > 0) ann.push({ id: aid('rv'), type: 'label', role: 'info', i1: j, price: dir > 0 ? bars[j].l : bars[j].h, text: 'Price returns to the gap' });
      const planAnn = plan ? planAnnotations(plan, j, Math.min(bars.length - 1, plan.reachIdx + 3)) : [];
      ann.push(...planAnn);
      const steps = [
        step('context', 'Context', `${name[0].toUpperCase() + name.slice(1)} displacement on ${t(bars, i - 1)}: the middle candle moved ${P(Math.abs(b.c - b.o), ref)} points in one bar.`, view(bars, i - 2, i, 20)),
        step('formation', 'Three-candle formation', `Look at three candles: the first ends at ${P(dir > 0 ? a.h : a.l, ref)}, the second is the large ${dir > 0 ? 'up' : 'down'} candle, and the third ${dir > 0 ? 'low' : 'high'} is ${P(dir > 0 ? c.l : c.h, ref)}.`, [i - 4, i + 2], [ann[0].id]),
        step('imbalance', 'The imbalance', `The ${dir > 0 ? 'third candle’s low' : 'third candle’s high'} never overlaps the ${dir > 0 ? 'first candle’s high' : 'first candle’s low'}. That ${P(gap, ref)}-point space between ${P(bottom, ref)} and ${P(top, ref)} was traded through in only one direction: a fair value gap.`, [i - 4, i + 4], [ann[1].id, ann[2].id]),
        step('why', 'Why price returns', 'Price moved so fast that only one side was filled. Markets often come back to rebalance that inefficient area before continuing, so the gap becomes a level to watch, not a guarantee.', view(bars, i - 2, boxEnd, 6)),
      ];
      if (j > 0) {
        steps.push(step('revisit', 'The revisit', `On ${t(bars, j)} price came back into the gap, trading to ${P(dir > 0 ? bars[j].l : bars[j].h, ref)}.`, view(bars, i - 2, j, 6), [ann[3].id]));
        steps.push(step('outcome', 'What happened next', invalid > 0 ? `The gap failed: on ${t(bars, invalid)} a candle closed ${dir > 0 ? 'below' : 'above'} it, invalidating the idea.` : `From the gap, price moved to ${P(plan.reach, ref)} by ${t(bars, plan.reachIdx)}.`, view(bars, i - 2, plan.reachIdx, 4)));
        steps.push(step('trade', 'Trade idea', planText(plan, dir), view(bars, j - 4, plan.reachIdx, 4), planAnn.map((x) => x.id)));
        steps.push(step('risk', 'Invalidation & risk', `The idea is wrong if price closes ${dir > 0 ? 'below' : 'above'} the gap or reaches the stop at ${P(stop, ref)}, beyond the formation’s ${dir > 0 ? 'low' : 'high'}. Risk is defined before entry.`, view(bars, i - 2, j, 6), [planAnn[1]?.id].filter(Boolean)));
      }
      out.push({ concept: 'fvg', direction: name, keyIndex: i - 1, range: view(bars, i - 2, j > 0 ? (plan?.reachIdx ?? j) : i + 10), score, facts: { gap, top, bottom, revisit: j, invalid, plan }, annotations: ann, steps, summary: `${name} FVG ${P(bottom, ref)}–${P(top, ref)} formed ${t(bars, i - 1)}${j > 0 ? `, revisited ${t(bars, j)}` : ', not revisited in this data'}` });
    }
  }
  return pick(out, max);
}

// ---------------------------------------------------------------- IFVG
function detectIFVG(bars, opts = {}) {
  const base = detectFVG(bars, { minAtr: 0.25, max: 200 });
  const out = [];
  for (const ex of base) {
    const { invalid, top, bottom } = ex.facts;
    if (invalid < 0) continue;
    const dir = ex.direction === 'bullish' ? -1 : 1; // inverted direction
    const ref = bars[invalid].c;
    let rt = -1;
    for (let k = invalid + 1; k < Math.min(bars.length, invalid + 40); k++) if (dir < 0 ? bars[k].h >= bottom : bars[k].l <= top) { rt = k; break; }
    if (rt < 0) continue;
    const entry = dir < 0 ? bottom : top;
    const stop = dir < 0 ? top + (top - bottom) * 0.5 : bottom - (top - bottom) * 0.5;
    const plan = tradePlan(bars, { dir, entry, stop, fromIdx: rt, ref });
    const i0 = ex.annotations[1].i1;
    const ann = [
      { ...ex.annotations[1], id: aid('fvg'), i2: invalid, text: `Original ${ex.direction} FVG` },
      { id: aid('hl'), type: 'highlight', role: dir < 0 ? 'bear' : 'bull', i1: invalid, i2: invalid, text: 'Close through the gap' },
      { id: aid('ifvg'), type: 'box', role: 'ifvg', i1: invalid, i2: Math.min(bars.length - 1, rt + 6), p1: bottom, p2: top, text: `Inverse FVG (${dir < 0 ? 'now resistance' : 'now support'})` },
      ...planAnnotations(plan, rt, Math.min(bars.length - 1, plan.reachIdx + 3)),
    ];
    out.push({
      concept: 'ifvg', direction: dir < 0 ? 'bearish' : 'bullish', keyIndex: invalid, range: view(bars, i0, plan.reachIdx), score: ex.score + plan.mfeR, facts: { plan, top, bottom },
      annotations: ann,
      steps: [
        step('origin', 'The original gap', `A ${ex.direction} fair value gap formed between ${P(bottom, ref)} and ${P(top, ref)} (${ex.summary.split(' formed ')[1]?.split(',')[0] || ''}).`, view(bars, i0, invalid, 6), [ann[0].id]),
        step('fail', 'The gap fails', `On ${t(bars, invalid)} a candle closed ${dir < 0 ? 'below' : 'above'} the whole gap. The level that should have held has been broken.`, view(bars, i0, invalid, 4), [ann[1].id]),
        step('invert', 'Inversion', `The broken gap flips roles: what was ${dir < 0 ? 'support is now resistance' : 'resistance is now support'}. That is an inverse fair value gap.`, view(bars, invalid - 4, rt, 6), [ann[2].id]),
        step('retest', 'The retest', `Price came back into the zone on ${t(bars, rt)} and reacted ${dir < 0 ? 'lower' : 'higher'}.`, view(bars, invalid, rt, 6)),
        step('trade', 'Trade idea', planText(plan, dir), view(bars, rt - 4, plan.reachIdx, 4), ann.slice(3).map((a) => a.id)),
      ],
      summary: `${dir < 0 ? 'Bearish' : 'Bullish'} IFVG ${P(bottom, ref)}–${P(top, ref)}, inverted ${t(bars, invalid)}, retested ${t(bars, rt)}`,
    });
  }
  return pick(out, opts.max || 8);
}

// ---------------------------------------------------------------- Structure (BOS / MSS)
function structureEvents(bars, k = 3) {
  const { highs, lows } = swings(bars, k);
  const events = [];
  let trend = 0;
  let hi = null, lo = null;
  const pivots = [...highs.map((h) => ({ ...h, kind: 'H' })), ...lows.map((l) => ({ ...l, kind: 'L' }))].sort((a, b) => a.i - b.i);
  let pi = 0;
  for (let i = 0; i < bars.length; i++) {
    while (pi < pivots.length && pivots[pi].i + k <= i) { // pivot confirmed after k bars
      if (pivots[pi].kind === 'H') hi = { ...pivots[pi], broken: false }; else lo = { ...pivots[pi], broken: false };
      pi++;
    }
    if (hi && !hi.broken && bars[i].c > hi.price) {
      events.push({ type: trend < 0 ? 'MSS' : 'BOS', dir: 1, level: hi.price, from: hi.i, at: i, opposite: lo });
      hi.broken = true; trend = 1;
    }
    if (lo && !lo.broken && bars[i].c < lo.price) {
      events.push({ type: trend > 0 ? 'MSS' : 'BOS', dir: -1, level: lo.price, from: lo.i, at: i, opposite: hi });
      lo.broken = true; trend = -1;
    }
  }
  return events;
}

function detectStructure(bars, { want = 'BOS', max = 8 } = {}) {
  const A = atr(bars);
  const out = [];
  for (const e of structureEvents(bars)) {
    if (e.type !== want) continue;
    const ref = e.level;
    const disp = Math.abs(bars[e.at].c - bars[e.at].o) / A[e.at];
    const f = forward(bars, e.at, 30, e.dir);
    const ann = [
      { id: aid('lvl'), type: 'hline', role: 'structure', i1: e.from, i2: e.at, price: e.level, text: `${e.dir > 0 ? 'Swing high' : 'Swing low'} ${P(e.level, ref)}` },
      { id: aid('hl'), type: 'highlight', role: e.dir > 0 ? 'bull' : 'bear', i1: e.at, i2: e.at, text: 'Close beyond the level' },
      { id: aid('lab'), type: 'label', role: 'structure', i1: e.at, price: e.level, text: e.type },
    ];
    if (e.opposite) ann.push({ id: aid('opp'), type: 'label', role: 'info', i1: e.opposite.i, price: e.opposite.price, text: e.dir > 0 ? 'Protected low' : 'Protected high' });
    const isMSS = e.type === 'MSS';
    out.push({
      concept: isMSS ? 'mss' : 'bos', direction: e.dir > 0 ? 'bullish' : 'bearish', keyIndex: e.at, range: view(bars, e.from, f.best), score: disp + (isMSS ? 1 : 0) + Math.abs((e.dir > 0 ? bars[f.best].h : bars[f.best].l) - e.level) / A[e.at],
      facts: { level: e.level, from: e.from, at: e.at },
      annotations: ann,
      steps: [
        step('context', isMSS ? 'The prior trend' : 'The trend', isMSS ? `Before ${t(bars, e.at)} price was making ${e.dir > 0 ? 'lower highs and lower lows' : 'higher highs and higher lows'}.` : `Price was already trending ${e.dir > 0 ? 'up' : 'down'}.`, view(bars, e.from - 20, e.at, 4)),
        step('level', 'The swing to watch', `The key ${e.dir > 0 ? 'swing high' : 'swing low'} formed on ${t(bars, e.from)} at ${P(e.level, ref)}.`, view(bars, e.from, e.at, 6), [ann[0].id, ann[3]?.id].filter(Boolean)),
        step('break', isMSS ? 'The shift' : 'The break', `On ${t(bars, e.at)} a candle closed ${e.dir > 0 ? 'above' : 'below'} ${P(e.level, ref)} with a ${P(Math.abs(bars[e.at].c - bars[e.at].o), ref)}-point body. ${isMSS ? 'Because it breaks against the previous trend, it is a market structure shift.' : 'Because it continues the existing trend, it is a break of structure.'}`, view(bars, e.from, e.at, 4), [ann[1].id, ann[2].id]),
        step('after', 'What followed', `Price continued to ${P(e.dir > 0 ? bars[f.best].h : bars[f.best].l, ref)} by ${t(bars, f.best)}.`, view(bars, e.from, f.best, 4)),
        step('use', 'How to use it', isMSS ? 'A shift is a warning that order flow may be changing. Traders often wait for a pullback into the displacement (an FVG or order block) rather than chasing the break.' : 'A break confirms the trend. The protected swing on the other side is where the idea is invalidated.', view(bars, e.from, f.best, 4)),
      ],
      summary: `${e.type} ${e.dir > 0 ? 'up' : 'down'} through ${P(e.level, ref)} at ${t(bars, e.at)}`,
    });
  }
  return pick(out, max);
}

// ---------------------------------------------------------------- Liquidity sweeps, BSL, SSL
function detectSweeps(bars, { side = 'both', max = 8 } = {}) {
  const { highs, lows } = swings(bars, 3);
  const A = atr(bars);
  const out = [];
  const scan = (pivots, isHigh) => {
    for (const p of pivots) {
      for (let j = p.i + 4; j < Math.min(bars.length, p.i + 80); j++) {
        const b = bars[j];
        const took = isHigh ? b.h > p.price : b.l < p.price;
        if (!took) continue;
        const rejected = isHigh ? b.c < p.price : b.c > p.price;
        const depth = isHigh ? b.h - p.price : p.price - b.l;
        if (rejected && depth >= 0.15 * (A[j] || 0)) {
          const dir = isHigh ? -1 : 1;
          const ref = p.price;
          const f = forward(bars, j, 30, dir);
          const reach = dir > 0 ? bars[f.best].h : bars[f.best].l;
          const wick = isHigh ? b.h - p.price : p.price - b.l;
          const ann = [
            { id: aid('liq'), type: 'hline', role: 'liquidity', i1: p.i, i2: j, price: p.price, text: isHigh ? `Buy-side liquidity ${P(p.price, ref)}` : `Sell-side liquidity ${P(p.price, ref)}`, dashed: true },
            { id: aid('hl'), type: 'highlight', role: isHigh ? 'bear' : 'bull', i1: j, i2: j, text: 'Sweep candle' },
            { id: aid('lab'), type: 'label', role: 'liquidity', i1: j, price: isHigh ? b.h : b.l, text: isHigh ? 'BSL taken' : 'SSL taken' },
          ];
          out.push({
            concept: isHigh ? 'bsl' : 'ssl', sweep: true, direction: dir > 0 ? 'bullish' : 'bearish', keyIndex: j, range: view(bars, p.i, f.best), score: Math.abs(reach - b.c) / Math.max(wick, 1e-9) * 0.2 + 1 + Math.abs(reach - b.c) / (A[j] || 1),
            facts: { level: p.price, pivot: p.i, sweep: j, reach },
            annotations: ann,
            steps: [
              step('pool', 'Where the stops sit', `The ${isHigh ? 'swing high' : 'swing low'} from ${t(bars, p.i)} at ${P(p.price, ref)} is an obvious level. ${isHigh ? 'Shorts place stops and breakout traders place buy orders above it: buy-side liquidity.' : 'Longs place stops and breakdown traders place sell orders below it: sell-side liquidity.'}`, view(bars, p.i, j, 6), [ann[0].id]),
              step('sweep', 'The sweep', `On ${t(bars, j)} price traded ${P(wick, ref)} points ${isHigh ? 'above' : 'below'} that level to ${P(isHigh ? b.h : b.l, ref)}, triggering those orders.`, view(bars, p.i, j, 4), [ann[1].id, ann[2].id]),
              step('reject', 'The rejection', `The same candle closed back ${isHigh ? 'below' : 'above'} the level at ${P(b.c, ref)}. The move ${isHigh ? 'up' : 'down'} was a grab for liquidity, not a real breakout.`, [j - 6, j + 3]),
              step('after', 'What followed', `Price then moved ${dir > 0 ? 'up' : 'down'} to ${P(reach, ref)} by ${t(bars, f.best)}.`, view(bars, p.i, f.best, 4)),
              step('use', 'How to use it', 'A sweep on its own is not an entry. Look for confirmation after it, such as a market structure shift or a fair value gap in the new direction, and keep the stop beyond the sweep’s extreme.', view(bars, j - 10, f.best, 4)),
            ],
            summary: `${isHigh ? 'BSL' : 'SSL'} at ${P(p.price, ref)} swept ${t(bars, j)}, then ${dir > 0 ? 'rallied' : 'sold off'} to ${P(reach, ref)}`,
          });
        }
        break; // first trade beyond the level decides it
      }
    }
  };
  if (side !== 'ssl') scan(highs, true);
  if (side !== 'bsl') scan(lows, false);
  return pick(out, max);
}

// ---------------------------------------------------------------- Displacement, order blocks, breakers, mitigation
function displacements(bars, k = 1.8) {
  const A = atr(bars);
  const res = [];
  for (let i = 15; i < bars.length; i++) {
    const b = bars[i];
    const body = Math.abs(b.c - b.o);
    if (body > k * A[i] && body / Math.max(b.h - b.l, 1e-9) > 0.6) res.push({ i, dir: b.c > b.o ? 1 : -1, size: body / A[i] });
  }
  return res;
}

function detectDisplacement(bars, { max = 8 } = {}) {
  return pick(displacements(bars).map((d) => {
    const b = bars[d.i];
    const ref = b.c;
    const ann = [{ id: aid('hl'), type: 'highlight', role: d.dir > 0 ? 'bull' : 'bear', i1: d.i, i2: d.i, text: `Displacement ${P(Math.abs(b.c - b.o), ref)} pts` }];
    return {
      concept: 'displacement', direction: d.dir > 0 ? 'bullish' : 'bearish', keyIndex: d.i, range: view(bars, d.i - 10, d.i + 10), score: d.size, facts: { size: d.size },
      annotations: ann,
      steps: [
        step('normal', 'Normal candles', 'Most candles move a typical amount. Average true range measures that.', view(bars, d.i - 20, d.i - 1, 2)),
        step('displace', 'Displacement', `On ${t(bars, d.i)} one candle moved ${P(Math.abs(b.c - b.o), ref)} points, about ${d.size.toFixed(1)} times the recent average range, with a large body and small wicks.`, [d.i - 8, d.i + 4], [ann[0].id]),
        step('meaning', 'Why it matters', 'Moves like this show urgency from large participants. They often leave fair value gaps and break structure, which is where the next opportunities form.', view(bars, d.i - 10, d.i + 10)),
      ],
      summary: `${d.dir > 0 ? 'Bullish' : 'Bearish'} displacement (${d.size.toFixed(1)}× ATR) at ${t(bars, d.i)}`,
    };
  }), max);
}

function orderBlocks(bars) {
  const res = [];
  for (const d of displacements(bars, 1.5)) {
    let ob = -1;
    for (let k = d.i - 1; k >= Math.max(0, d.i - 6); k--) if ((bars[k].c < bars[k].o) === d.dir > 0) { ob = k; break; }
    if (ob < 0) continue;
    const top = bars[ob].h, bottom = bars[ob].l;
    let rt = -1, broken = -1;
    for (let k = d.i + 2; k < bars.length; k++) {
      if (rt < 0 && (d.dir > 0 ? bars[k].l <= top : bars[k].h >= bottom)) rt = k;
      if (d.dir > 0 ? bars[k].c < bottom : bars[k].c > top) { broken = k; break; }
    }
    res.push({ ob, disp: d.i, dir: d.dir, top, bottom, retest: rt, broken });
  }
  return res;
}

function detectOrderBlocks(bars, { max = 8 } = {}) {
  const out = [];
  for (const o of orderBlocks(bars)) {
    if (o.retest < 0 || (o.broken > 0 && o.broken <= o.retest)) continue;
    const ref = bars[o.ob].c;
    const entry = o.dir > 0 ? o.top : o.bottom;
    const stop = o.dir > 0 ? o.bottom - (o.top - o.bottom) * 0.1 : o.top + (o.top - o.bottom) * 0.1;
    const plan = tradePlan(bars, { dir: o.dir, entry, stop, fromIdx: o.retest, ref });
    const ann = [
      { id: aid('ob'), type: 'box', role: 'ob', i1: o.ob, i2: Math.min(bars.length - 1, o.retest + 4), p1: o.bottom, p2: o.top, text: `${o.dir > 0 ? 'Bullish' : 'Bearish'} order block` },
      { id: aid('hl'), type: 'highlight', role: o.dir > 0 ? 'bull' : 'bear', i1: o.disp, i2: o.disp, text: 'Displacement' },
      ...planAnnotations(plan, o.retest, Math.min(bars.length - 1, plan.reachIdx + 3)),
    ];
    out.push({
      concept: 'ob', direction: o.dir > 0 ? 'bullish' : 'bearish', keyIndex: o.ob, range: view(bars, o.ob - 6, plan.reachIdx), score: plan.mfeR + 1, facts: { ...o, plan },
      annotations: ann,
      steps: [
        step('candle', 'The last opposite candle', `On ${t(bars, o.ob)} the last ${o.dir > 0 ? 'down' : 'up'} candle before the move spans ${P(o.bottom, ref)}–${P(o.top, ref)}.`, view(bars, o.ob - 8, o.disp, 4), [ann[0].id]),
        step('disp', 'The displacement', `Right after it, a strong ${o.dir > 0 ? 'up' : 'down'} candle on ${t(bars, o.disp)} showed where orders were filled.`, view(bars, o.ob - 4, o.disp + 4), [ann[1].id]),
        step('retest', 'Return to the block', `Price came back into the order block on ${t(bars, o.retest)}.`, view(bars, o.ob, o.retest, 6)),
        step('trade', 'Trade idea', planText(plan, o.dir), view(bars, o.retest - 4, plan.reachIdx, 4), ann.slice(2).map((a) => a.id)),
        step('risk', 'Invalidation', `A close ${o.dir > 0 ? 'below' : 'above'} ${P(o.dir > 0 ? o.bottom : o.top, ref)} invalidates the block.`, view(bars, o.ob, o.retest, 6)),
      ],
      summary: `${o.dir > 0 ? 'Bullish' : 'Bearish'} order block ${P(o.bottom, ref)}–${P(o.top, ref)} (${t(bars, o.ob)}), retested ${t(bars, o.retest)}`,
    });
  }
  return pick(out, max);
}

function detectBreakers(bars, { mitigation = false, max = 8 } = {}) {
  const out = [];
  const { highs, lows } = swings(bars, 3);
  for (const o of orderBlocks(bars)) {
    if (o.broken < 0) continue;
    // Breaker: the move from the block took liquidity (made a new extreme) before failing; mitigation: it did not.
    const legEnd = o.broken;
    const ext = o.dir > 0 ? Math.max(...bars.slice(o.disp, legEnd).map((b) => b.h)) : Math.min(...bars.slice(o.disp, legEnd).map((b) => b.l));
    const prior = (o.dir > 0 ? highs : lows).filter((p) => p.i < o.ob).slice(-1)[0];
    const tookLiq = prior ? (o.dir > 0 ? ext > prior.price : ext < prior.price) : false;
    if (tookLiq === mitigation) continue;
    const dir = -o.dir;
    let rt = -1;
    for (let k = o.broken + 1; k < Math.min(bars.length, o.broken + 60); k++) if (dir < 0 ? bars[k].h >= o.bottom : bars[k].l <= o.top) { rt = k; break; }
    if (rt < 0) continue;
    const ref = bars[o.ob].c;
    const entry = dir < 0 ? o.bottom : o.top;
    const stop = dir < 0 ? o.top : o.bottom;
    const plan = tradePlan(bars, { dir, entry, stop, fromIdx: rt, ref });
    const name = mitigation ? 'Mitigation block' : 'Breaker block';
    const ann = [
      { id: aid('ob'), type: 'box', role: 'ob', i1: o.ob, i2: o.broken, p1: o.bottom, p2: o.top, text: `Original ${o.dir > 0 ? 'bullish' : 'bearish'} block` },
      { id: aid('hl'), type: 'highlight', role: dir < 0 ? 'bear' : 'bull', i1: o.broken, i2: o.broken, text: 'Block fails' },
      { id: aid('brk'), type: 'box', role: 'breaker', i1: o.broken, i2: Math.min(bars.length - 1, rt + 5), p1: o.bottom, p2: o.top, text: name },
      ...planAnnotations(plan, rt, Math.min(bars.length - 1, plan.reachIdx + 3)),
    ];
    out.push({
      concept: mitigation ? 'mitigation' : 'breaker', direction: dir > 0 ? 'bullish' : 'bearish', keyIndex: o.broken, range: view(bars, o.ob - 6, plan.reachIdx), score: plan.mfeR + 1, facts: { ...o, plan, tookLiq },
      annotations: ann,
      steps: [
        step('block', 'An order block forms', `A ${o.dir > 0 ? 'bullish' : 'bearish'} block formed on ${t(bars, o.ob)} between ${P(o.bottom, ref)} and ${P(o.top, ref)}.`, view(bars, o.ob - 6, o.disp, 6), [ann[0].id]),
        step('leg', mitigation ? 'A failure swing' : 'Liquidity is taken', mitigation ? 'The move away from it failed to make a new extreme. Buyers or sellers could not follow through.' : `The move away from it ran beyond the prior ${o.dir > 0 ? 'high' : 'low'}, taking liquidity first.`, view(bars, o.ob, o.broken, 4)),
        step('fail', 'The block breaks', `On ${t(bars, o.broken)} price closed through the whole block.`, view(bars, o.ob, o.broken, 4), [ann[1].id]),
        step('flip', `It becomes a ${name.toLowerCase()}`, `The failed block now works in the opposite direction, ${dir < 0 ? 'as resistance' : 'as support'}.`, view(bars, o.broken - 4, rt, 6), [ann[2].id]),
        step('trade', 'Trade idea', planText(plan, dir), view(bars, rt - 4, plan.reachIdx, 4), ann.slice(3).map((a) => a.id)),
      ],
      summary: `${name} ${P(o.bottom, ref)}–${P(o.top, ref)} broken ${t(bars, o.broken)}, retested ${t(bars, rt)}`,
    });
  }
  return pick(out, max);
}

// ---------------------------------------------------------------- Fib-based: premium/discount & OTE
function legs(bars) {
  const { highs, lows } = swings(bars, 4);
  const piv = [...highs.map((h) => ({ ...h, k: 'H' })), ...lows.map((l) => ({ ...l, k: 'L' }))].sort((a, b) => a.i - b.i);
  const A = atr(bars);
  const res = [];
  for (let n = 1; n < piv.length; n++) {
    const a = piv[n - 1], b = piv[n];
    if (a.k === b.k) continue;
    if (Math.abs(b.price - a.price) < 4 * A[b.i]) continue;
    res.push({ from: a, to: b, dir: b.k === 'H' ? 1 : -1 });
  }
  return res;
}

function detectFib(bars, { mode = 'ote', max = 8 } = {}) {
  const out = [];
  for (const leg of legs(bars)) {
    const { from, to, dir } = leg;
    const range = to.price - from.price;
    const lvl = (r) => to.price - range * r;
    const zoneA = mode === 'ote' ? lvl(0.62) : lvl(0.5);
    const zoneB = mode === 'ote' ? lvl(0.79) : lvl(0.79);
    let hit = -1;
    for (let k = to.i + 1; k < Math.min(bars.length, to.i + 60); k++) {
      if (dir > 0 ? bars[k].l < from.price : bars[k].h > from.price) break;
      if (dir > 0 ? bars[k].l <= zoneA : bars[k].h >= zoneA) { hit = k; break; }
    }
    if (hit < 0) continue;
    const ref = to.price;
    const entry = mode === 'ote' ? lvl(0.705) : lvl(0.62);
    const plan = tradePlan(bars, { dir, entry, stop: from.price - Math.sign(range) * Math.abs(range) * 0.05, fromIdx: hit, ref });
    const ann = [
      { id: aid('fib'), type: 'fib', role: 'fib', i1: from.i, i2: Math.min(bars.length - 1, hit + 10), p1: from.price, p2: to.price, levels: mode === 'ote' ? [0, 0.5, 0.62, 0.705, 0.79, 1] : [0, 0.5, 1], text: 'Fibonacci' },
      { id: aid('zone'), type: 'box', role: mode === 'ote' ? 'ote' : (dir > 0 ? 'discount' : 'premium'), i1: to.i, i2: Math.min(bars.length - 1, hit + 10), p1: Math.min(zoneA, zoneB), p2: Math.max(zoneA, zoneB), text: mode === 'ote' ? 'OTE 62–79%' : dir > 0 ? 'Discount' : 'Premium' },
      ...planAnnotations(plan, hit, Math.min(bars.length - 1, plan.reachIdx + 3)),
    ];
    const isOte = mode === 'ote';
    out.push({
      concept: isOte ? 'ote' : 'premium-discount', direction: dir > 0 ? 'bullish' : 'bearish', keyIndex: hit, range: view(bars, from.i, plan.reachIdx), score: plan.mfeR + 1, facts: { from, to, plan },
      annotations: ann,
      steps: [
        step('leg', 'The dealing range', `Price moved from ${P(from.price, ref)} (${t(bars, from.i)}) to ${P(to.price, ref)} (${t(bars, to.i)}). That leg is the range we measure.`, view(bars, from.i, to.i, 6)),
        step('fib', 'Draw the Fibonacci', `Anchor the Fibonacci from the ${dir > 0 ? 'low to the high' : 'high to the low'}. The 50% level, ${P(lvl(0.5), ref)}, splits the range into premium and discount.`, view(bars, from.i, to.i, 6), [ann[0].id]),
        step('zone', isOte ? 'The OTE zone' : dir > 0 ? 'Buy in discount' : 'Sell in premium', isOte ? `The optimal trade entry sits between the 62% and 79% retracement: ${P(Math.min(zoneA, zoneB), ref)}–${P(Math.max(zoneA, zoneB), ref)}.` : `In an up-move, buying below 50% means buying at a discount; in a down-move, selling above 50% means selling at a premium.`, view(bars, from.i, hit, 6), [ann[1].id]),
        step('retrace', 'The retracement', `On ${t(bars, hit)} price pulled back into that zone.`, view(bars, to.i - 4, hit, 6)),
        step('trade', 'Trade idea', planText(plan, dir), view(bars, hit - 4, plan.reachIdx, 4), ann.slice(2).map((a) => a.id)),
      ],
      summary: `${isOte ? 'OTE' : 'Premium/discount'} retracement on the ${P(from.price, ref)}→${P(to.price, ref)} leg, filled ${t(bars, hit)}`,
    });
  }
  return pick(out, max);
}

// ---------------------------------------------------------------- Sessions, Asia range, Judas, Power of 3
function dayGroups(bars) {
  // Trading day starts 18:00 ET.
  const groups = new Map();
  bars.forEach((b, i) => {
    const p = nyParts(b.t);
    const key = p.minutes >= 18 * 60 ? `${p.date}+` : p.date;
    const day = key.endsWith('+') ? nextDate(p.date) : p.date;
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(i);
  });
  return groups;
}
function nextDate(d) {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
}

function sessionRanges(bars) {
  const res = [];
  for (const [day, idx] of dayGroups(bars)) {
    const by = {};
    for (const i of idx) { const s = sessionOf(bars[i].t); if (s) (by[s] ||= []).push(i); }
    res.push({ day, idx, by });
  }
  return res;
}

function rangeOf(bars, ids) {
  let hi = -Infinity, lo = Infinity, hiI = ids[0], loI = ids[0];
  for (const i of ids) { if (bars[i].h > hi) { hi = bars[i].h; hiI = i; } if (bars[i].l < lo) { lo = bars[i].l; loI = i; } }
  return { hi, lo, hiI, loI, from: ids[0], to: ids[ids.length - 1] };
}

function detectSessions(bars, { mode = 'asia', max = 6 } = {}) {
  const out = [];
  for (const d of sessionRanges(bars)) {
    if (mode === 'asia' || mode === 'po3') {
      if (!d.by.asia || d.by.asia.length < 6) continue;
      const r = rangeOf(bars, d.by.asia);
      const after = d.idx.filter((i) => i > r.to);
      if (!after.length) continue;
      const tookHi = after.find((i) => bars[i].h > r.hi);
      const tookLo = after.find((i) => bars[i].l < r.lo);
      const first = [tookHi, tookLo].filter((x) => x != null).sort((a, b) => a - b)[0];
      const ref = r.hi;
      const ann = [
        { id: aid('ah'), type: 'hline', role: 'liquidity', i1: r.from, i2: Math.min(bars.length - 1, (first ?? r.to) + 8), price: r.hi, text: `Asian high ${P(r.hi, ref)}`, dashed: true },
        { id: aid('al'), type: 'hline', role: 'liquidity', i1: r.from, i2: Math.min(bars.length - 1, (first ?? r.to) + 8), price: r.lo, text: `Asian low ${P(r.lo, ref)}`, dashed: true },
        { id: aid('box'), type: 'box', role: 'session', i1: r.from, i2: r.to, p1: r.lo, p2: r.hi, text: 'Asian range' },
      ];
      if (mode === 'asia') {
        out.push({
          concept: 'asia', direction: first === tookHi ? 'bearish' : 'bullish', keyIndex: first ?? r.to, range: view(bars, r.from, Math.min(bars.length - 1, (first ?? r.to) + 30), 4), score: first != null ? 2 : 1, facts: r,
          annotations: ann,
          steps: [
            step('range', 'Mark the Asian range', `During the Asian session on ${d.day} price stayed between ${P(r.lo, ref)} and ${P(r.hi, ref)}.`, view(bars, r.from, r.to, 6), [ann[2].id]),
            step('levels', 'Two liquidity pools', 'The high and low of that quiet range collect stops. London and New York often run one of them.', view(bars, r.from, r.to + 20, 4), [ann[0].id, ann[1].id]),
            step('run', 'Which side was taken', first == null ? 'In this data neither side was taken later that day.' : `On ${t(bars, first)} price took the Asian ${first === tookHi ? 'high' : 'low'}.`, view(bars, r.from, (first ?? r.to) + 20, 4)),
          ],
          summary: `Asian range ${P(r.lo, ref)}–${P(r.hi, ref)} on ${d.day}${first != null ? `, ${first === tookHi ? 'high' : 'low'} taken ${t(bars, first)}` : ''}`,
        });
      } else if (first != null) {
        const dir = first === tookHi ? -1 : 1;
        const f = forward(bars, first, 60, dir);
        const reach = dir > 0 ? bars[f.best].h : bars[f.best].l;
        const back = dir > 0 ? reach > r.hi : reach < r.lo;
        if (!back) continue;
        out.push({
          concept: 'po3', direction: dir > 0 ? 'bullish' : 'bearish', keyIndex: first, range: view(bars, r.from, f.best, 4), score: 3, facts: r,
          annotations: [...ann, { id: aid('m'), type: 'label', role: 'liquidity', i1: first, price: dir > 0 ? bars[first].l : bars[first].h, text: 'Manipulation' }, { id: aid('d'), type: 'label', role: 'structure', i1: f.best, price: reach, text: 'Distribution' }],
          steps: [
            step('acc', 'Accumulation', `Asia built a range from ${P(r.lo, ref)} to ${P(r.hi, ref)}.`, view(bars, r.from, r.to, 6), [ann[2].id]),
            step('man', 'Manipulation', `Then price ran the ${dir > 0 ? 'low' : 'high'} on ${t(bars, first)}, the false move.`, view(bars, r.from, first + 6, 4), [ann[0].id, ann[1].id]),
            step('dist', 'Distribution', `The real move followed in the other direction, reaching ${P(reach, ref)} by ${t(bars, f.best)}, beyond the opposite side of the range.`, view(bars, r.from, f.best, 4)),
          ],
          summary: `Power of three on ${d.day}: Asia ${P(r.lo, ref)}–${P(r.hi, ref)}, ${dir > 0 ? 'low' : 'high'} run, then expansion to ${P(reach, ref)}`,
        });
      }
    }
    if (mode === 'sessions' || mode === 'judas') {
      const ny = d.by.nyam;
      if (!ny || ny.length < 4) continue;
      const pre = d.idx.filter((i) => i < ny[0]);
      if (pre.length < 6) continue;
      const r = rangeOf(bars, pre);
      const open = bars[ny[0]].o;
      const ref = open;
      if (mode === 'sessions') {
        const nyR = rangeOf(bars, ny);
        out.push({
          concept: 'sessions', direction: bars[ny[ny.length - 1]].c > open ? 'bullish' : 'bearish', keyIndex: ny[0], range: view(bars, pre[0], ny[ny.length - 1], 2), score: (nyR.hi - nyR.lo) / Math.max(r.hi - r.lo, 1e-9), facts: { r, nyR },
          annotations: [
            { id: aid('sep'), type: 'vline', role: 'session', i1: ny[0], text: 'NY open 9:30' },
            { id: aid('pre'), type: 'box', role: 'session', i1: pre[0], i2: pre[pre.length - 1], p1: r.lo, p2: r.hi, text: 'Overnight / London' },
            { id: aid('ny'), type: 'box', role: 'session', i1: ny[0], i2: ny[ny.length - 1], p1: nyR.lo, p2: nyR.hi, text: 'New York AM' },
          ],
          steps: [
            step('over', 'Overnight and London', `Before New York opened on ${d.day}, price ranged ${P(r.lo, ref)}–${P(r.hi, ref)}.`, view(bars, pre[0], pre[pre.length - 1], 2)),
            step('open', 'New York opens', `At 9:30 ET price opened at ${P(open, ref)}. Volume and range usually expand here.`, view(bars, ny[0] - 20, ny[0] + 10, 2)),
            step('ny', 'The New York move', `The NY AM session ranged ${P(nyR.lo, ref)}–${P(nyR.hi, ref)}, ${((nyR.hi - nyR.lo) / Math.max(r.hi - r.lo, 1e-9)).toFixed(1)}× the overnight range.`, view(bars, pre[0], ny[ny.length - 1], 2)),
          ],
          summary: `Sessions on ${d.day}: overnight ${P(r.lo, ref)}–${P(r.hi, ref)}, NY AM ${P(nyR.lo, ref)}–${P(nyR.hi, ref)}`,
        });
      } else {
        const first = ny.slice(0, 6);
        const upFirst = Math.max(...first.map((i) => bars[i].h)) - open > open - Math.min(...first.map((i) => bars[i].l));
        const dir = upFirst ? -1 : 1;
        const fakeExt = upFirst ? Math.max(...first.map((i) => bars[i].h)) : Math.min(...first.map((i) => bars[i].l));
        const end = ny[ny.length - 1];
        const reversed = dir < 0 ? bars[end].c < open : bars[end].c > open;
        if (!reversed) continue;
        const extI = first.find((i) => (upFirst ? bars[i].h : bars[i].l) === fakeExt);
        out.push({
          concept: 'judas', direction: dir > 0 ? 'bullish' : 'bearish', keyIndex: extI, range: view(bars, ny[0] - 12, end, 2), score: Math.abs(bars[end].c - open) / Math.max(Math.abs(fakeExt - open), 1e-9), facts: { open, fakeExt },
          annotations: [
            { id: aid('open'), type: 'hline', role: 'info', i1: ny[0], i2: end, price: open, text: `NY open ${P(open, ref)}` },
            { id: aid('fake'), type: 'label', role: 'liquidity', i1: extI, price: fakeExt, text: 'Judas swing' },
          ],
          steps: [
            step('open', 'The open', `New York opened at ${P(open, ref)} on ${d.day}.`, view(bars, ny[0] - 12, ny[0] + 4, 2)),
            step('fake', 'The false move', `Price first pushed ${upFirst ? 'up' : 'down'} to ${P(fakeExt, ref)} by ${t(bars, extI)}, drawing traders in the wrong direction.`, view(bars, ny[0] - 6, extI + 4, 2)),
            step('real', 'The real move', `It then reversed and closed the session ${dir > 0 ? 'above' : 'below'} the open at ${P(bars[end].c, ref)}.`, view(bars, ny[0] - 6, end, 2)),
          ],
          summary: `Judas swing ${upFirst ? 'up' : 'down'} to ${P(fakeExt, ref)} after the ${d.day} NY open, then reversal`,
        });
      }
    }
  }
  return pick(out, max);
}

// ---------------------------------------------------------------- CISD
function detectCISD(bars, { max = 8 } = {}) {
  const out = [];
  for (let i = 4; i < bars.length - 2; i++) {
    for (const dir of [1, -1]) {
      // run of opposite candles ending at i-1
      let s = i - 1;
      while (s >= 0 && (dir > 0 ? bars[s].c < bars[s].o : bars[s].c > bars[s].o)) s--;
      const start = s + 1;
      if (i - start < 3) continue;
      const openLvl = bars[start].o;
      if (!(dir > 0 ? bars[i].c > openLvl : bars[i].c < openLvl)) continue;
      const ref = openLvl;
      const f = forward(bars, i, 30, dir);
      const reach = dir > 0 ? bars[f.best].h : bars[f.best].l;
      const ann = [
        { id: aid('run'), type: 'highlight', role: dir > 0 ? 'bear' : 'bull', i1: start, i2: i - 1, text: `${i - start} ${dir > 0 ? 'down' : 'up'} candles` },
        { id: aid('lvl'), type: 'hline', role: 'structure', i1: start, i2: i + 2, price: openLvl, text: `Open of the run ${P(openLvl, ref)}` },
        { id: aid('hl'), type: 'highlight', role: dir > 0 ? 'bull' : 'bear', i1: i, i2: i, text: 'CISD close' },
      ];
      out.push({
        concept: 'cisd', direction: dir > 0 ? 'bullish' : 'bearish', keyIndex: i, range: view(bars, start - 6, f.best), score: Math.abs(reach - bars[i].c) / Math.max(Math.abs(bars[i].c - openLvl), 1e-9) * 0.2 + (i - start) * 0.3,
        facts: { start, openLvl },
        annotations: ann,
        steps: [
          step('run', 'The delivery', `From ${t(bars, start)} price printed ${i - start} consecutive ${dir > 0 ? 'down' : 'up'}-close candles: it was delivering ${dir > 0 ? 'lower' : 'higher'}.`, view(bars, start - 6, i - 1, 4), [ann[0].id]),
          step('level', 'The reference level', `Mark the open of the first candle in that series: ${P(openLvl, ref)}.`, view(bars, start - 4, i, 4), [ann[1].id]),
          step('change', 'The change in state', `On ${t(bars, i)} a candle closed ${dir > 0 ? 'above' : 'below'} that open. Delivery has changed from ${dir > 0 ? 'bearish to bullish' : 'bullish to bearish'}.`, view(bars, start - 4, i + 2, 4), [ann[2].id]),
          step('after', 'What followed', `Price moved to ${P(reach, ref)} by ${t(bars, f.best)}.`, view(bars, start - 4, f.best, 4)),
        ],
        summary: `${dir > 0 ? 'Bullish' : 'Bearish'} CISD through ${P(openLvl, ref)} at ${t(bars, i)}`,
      });
    }
  }
  return pick(out, max);
}

// ---------------------------------------------------------------- Classic TA
function detectSR(bars, { max = 6 } = {}) {
  const A = atr(bars);
  const { highs, lows } = swings(bars, 3);
  const piv = [...highs, ...lows].sort((a, b) => a.i - b.i);
  const out = [];
  const used = new Set();
  for (const p of piv) {
    if (used.has(p.i)) continue;
    const tol = A[p.i] * 0.18;
    const touches = piv.filter((q) => Math.abs(q.price - p.price) <= tol);
    if (touches.length < 3) continue;
    touches.forEach((q) => used.add(q.i));
    const level = touches.reduce((s, q) => s + q.price, 0) / touches.length;
    const last = touches[touches.length - 1];
    const ref = level;
    const isRes = bars[last.i].c < level;
    out.push({
      concept: 'sr', direction: isRes ? 'bearish' : 'bullish', keyIndex: last.i, range: view(bars, touches[0].i, last.i, 10), score: touches.length,
      facts: { level, touches: touches.map((q) => q.i) },
      annotations: [
        { id: aid('lvl'), type: 'hline', role: 'structure', i1: touches[0].i, i2: Math.min(bars.length - 1, last.i + 10), price: level, text: `${isRes ? 'Resistance' : 'Support'} ≈ ${P(level, ref)}` },
        ...touches.map((q, n) => ({ id: aid('tch'), type: 'label', role: 'info', i1: q.i, price: q.price, text: `Touch ${n + 1}` })),
      ],
      steps: [
        step('first', 'First reaction', `Price reacted at ${P(touches[0].price, ref)} on ${t(bars, touches[0].i)}.`, view(bars, touches[0].i - 10, touches[0].i + 10)),
        step('repeat', 'It happens again', `It reacted at the same area ${touches.length - 1} more time(s), last on ${t(bars, last.i)}.`, view(bars, touches[0].i, last.i, 10)),
        step('level', 'Draw the level', `Those reactions define a ${isRes ? 'resistance' : 'support'} level around ${P(level, ref)}. The more times it holds, the more orders traders place around it.`, view(bars, touches[0].i, last.i, 10), ['*']),
      ],
      summary: `${isRes ? 'Resistance' : 'Support'} ≈ ${P(level, ref)} with ${touches.length} touches`,
    });
  }
  return pick(out, max);
}

function detectTrendlines(bars, { max = 6 } = {}) {
  const A = atr(bars);
  const { highs, lows } = swings(bars, 3);
  const out = [];
  for (const [pts, up] of [[lows, true], [highs, false]]) {
    for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
      const p1 = pts[a], p2 = pts[b];
      if (up ? p2.price <= p1.price : p2.price >= p1.price) continue;
      const slope = (p2.price - p1.price) / (p2.i - p1.i);
      const at = (i) => p1.price + slope * (i - p1.i);
      let ok = true;
      for (let i = p1.i; i <= p2.i; i++) if (up ? bars[i].c < at(i) - A[i] * 0.2 : bars[i].c > at(i) + A[i] * 0.2) { ok = false; break; }
      if (!ok) continue;
      const third = pts.find((q) => q.i > p2.i + 2 && Math.abs(q.price - at(q.i)) < A[q.i] * 0.4);
      if (!third) continue;
      const ref = p2.price;
      out.push({
        concept: 'trendline', direction: up ? 'bullish' : 'bearish', keyIndex: third.i, range: view(bars, p1.i, third.i, 10), score: (third.i - p1.i) / 20,
        facts: { p1, p2, third },
        annotations: [{ id: aid('tl'), type: 'trend', role: 'structure', i1: p1.i, p1: p1.price, i2: Math.min(bars.length - 1, third.i + 8), p2: at(Math.min(bars.length - 1, third.i + 8)), text: up ? 'Rising trendline' : 'Falling trendline' }, { id: aid('t3'), type: 'label', role: 'info', i1: third.i, price: third.price, text: 'Third touch' }],
        steps: [
          step('two', 'Two points', `Connect the ${up ? 'lows' : 'highs'} at ${P(p1.price, ref)} (${t(bars, p1.i)}) and ${P(p2.price, ref)} (${t(bars, p2.i)}).`, view(bars, p1.i, p2.i, 8), ['*']),
          step('third', 'The confirming touch', `Price came back to the line on ${t(bars, third.i)} at ${P(third.price, ref)} and respected it.`, view(bars, p1.i, third.i, 8)),
        ],
        summary: `${up ? 'Rising' : 'Falling'} trendline, third touch ${t(bars, third.i)}`,
      });
    }
  }
  return pick(out, max);
}

function detectCandles(bars, { max = 8 } = {}) {
  const A = atr(bars);
  const { highs, lows } = swings(bars, 3);
  const out = [];
  const piv = new Map([...highs.map((h) => [h.i, 'H']), ...lows.map((l) => [l.i, 'L'])]);
  for (let i = 1; i < bars.length - 1; i++) {
    const b = bars[i], p = bars[i - 1];
    const body = Math.abs(b.c - b.o), range = b.h - b.l;
    let name = null, dir = 0;
    if (b.c > b.o && p.c < p.o && b.c >= p.o && b.o <= p.c && body > A[i] * 0.6) { name = 'Bullish engulfing'; dir = 1; }
    else if (b.c < b.o && p.c > p.o && b.o >= p.c && b.c <= p.o && body > A[i] * 0.6) { name = 'Bearish engulfing'; dir = -1; }
    else if (range > A[i] * 0.8 && Math.min(b.o, b.c) - b.l > 2 * body && b.h - Math.max(b.o, b.c) < body) { name = 'Hammer'; dir = 1; }
    else if (range > A[i] * 0.8 && b.h - Math.max(b.o, b.c) > 2 * body && Math.min(b.o, b.c) - b.l < body) { name = 'Shooting star'; dir = -1; }
    if (!name) continue;
    const atSwing = [i - 1, i, i + 1].some((k) => piv.get(k) === (dir > 0 ? 'L' : 'H'));
    const f = forward(bars, i, 15, dir);
    const reach = dir > 0 ? bars[f.best].h : bars[f.best].l;
    const ref = b.c;
    out.push({
      concept: 'candles', direction: dir > 0 ? 'bullish' : 'bearish', keyIndex: i, range: view(bars, i - 15, f.best, 4), score: (atSwing ? 2 : 0) + Math.abs(reach - b.c) / A[i],
      facts: { name },
      annotations: [{ id: aid('hl'), type: 'highlight', role: dir > 0 ? 'bull' : 'bear', i1: name.includes('engulfing') ? i - 1 : i, i2: i, text: name }],
      steps: [
        step('where', 'Location', `Context first: ${atSwing ? `this candle printed at a swing ${dir > 0 ? 'low' : 'high'}` : 'this candle printed mid-range'}.`, view(bars, i - 15, i, 3)),
        step('pattern', name, `On ${t(bars, i)} a ${name.toLowerCase()} formed: open ${P(b.o, ref)}, high ${P(b.h, ref)}, low ${P(b.l, ref)}, close ${P(b.c, ref)}.`, [i - 6, i + 3], ['*']),
        step('after', 'Follow-through', `Over the next bars price reached ${P(reach, ref)}.`, view(bars, i - 6, f.best, 3)),
      ],
      summary: `${name} at ${t(bars, i)}${atSwing ? ' (at a swing)' : ''}`,
    });
  }
  return pick(out, max);
}

function detectMarketStructure(bars, { max = 4 } = {}) {
  const { highs, lows } = swings(bars, 4);
  const piv = [...highs.map((h) => ({ ...h, k: 'H' })), ...lows.map((l) => ({ ...l, k: 'L' }))].sort((a, b) => a.i - b.i);
  const out = [];
  for (let s = 0; s + 6 <= piv.length; s += 3) {
    const win = piv.slice(s, s + 6);
    const labels = [];
    let lastH = null, lastL = null;
    for (const p of win) {
      if (p.k === 'H') { labels.push({ ...p, text: lastH == null ? 'H' : p.price > lastH ? 'HH' : 'LH' }); lastH = p.price; }
      else { labels.push({ ...p, text: lastL == null ? 'L' : p.price > lastL ? 'HL' : 'LL' }); lastL = p.price; }
    }
    const up = labels.filter((l) => l.text === 'HH' || l.text === 'HL').length;
    const down = labels.filter((l) => l.text === 'LH' || l.text === 'LL').length;
    const dir = up >= down ? 1 : -1;
    const ref = win[0].price;
    out.push({
      concept: 'structure', direction: dir > 0 ? 'bullish' : 'bearish', keyIndex: win[win.length - 1].i, range: view(bars, win[0].i, win[win.length - 1].i, 6), score: Math.abs(up - down),
      facts: { labels },
      annotations: labels.map((l) => ({ id: aid('ms'), type: 'label', role: 'structure', i1: l.i, price: l.price, text: l.text })),
      steps: [
        step('swings', 'Find the swings', 'Mark each swing high and swing low.', view(bars, win[0].i, win[win.length - 1].i, 6), ['*']),
        step('read', 'Read the sequence', `${labels.map((l) => l.text).join(' → ')}: ${dir > 0 ? 'mostly higher highs and higher lows, an uptrend' : 'mostly lower highs and lower lows, a downtrend'}.`, view(bars, win[0].i, win[win.length - 1].i, 6)),
      ],
      summary: `Swing sequence ${labels.map((l) => l.text).join(' ')} (${t(bars, win[0].i)} → ${t(bars, win[win.length - 1].i)})`,
    });
  }
  return pick(out, max);
}

function detectVolume(bars, { max = 6 } = {}) {
  const vols = bars.map((b) => b.v || 0);
  if (!vols.some((v) => v > 0)) return [];
  const out = [];
  for (let i = 20; i < bars.length; i++) {
    const avg = vols.slice(i - 20, i).reduce((a, b) => a + b, 0) / 20;
    if (vols[i] < avg * 2.5) continue;
    const dir = bars[i].c >= bars[i].o ? 1 : -1;
    const f = forward(bars, i, 20, dir);
    const ref = bars[i].c;
    out.push({
      concept: 'volume', direction: dir > 0 ? 'bullish' : 'bearish', keyIndex: i, range: view(bars, i - 20, f.best, 4), score: vols[i] / avg,
      facts: { ratio: vols[i] / avg }, volume: true,
      annotations: [{ id: aid('hl'), type: 'highlight', role: dir > 0 ? 'bull' : 'bear', i1: i, i2: i, text: `Volume ${(vols[i] / avg).toFixed(1)}× average` }],
      steps: [
        step('base', 'Normal participation', `Over the previous 20 bars, average volume was ${Math.round(avg).toLocaleString()} contracts per bar.`, view(bars, i - 20, i - 1, 2)),
        step('spike', 'The spike', `On ${t(bars, i)} volume hit ${Math.round(vols[i]).toLocaleString()}, ${(vols[i] / avg).toFixed(1)} times normal.`, [i - 10, i + 3], ['*']),
        step('after', 'What it showed', `Price then moved to ${P(dir > 0 ? bars[f.best].h : bars[f.best].l, ref)}. Heavy volume shows where real participation entered.`, view(bars, i - 10, f.best, 3)),
      ],
      summary: `Volume spike ${(vols[i] / avg).toFixed(1)}× at ${t(bars, i)}`,
    });
  }
  return pick(out, max);
}

function detectMA(bars, { max = 6 } = {}) {
  const c = bars.map((b) => b.c);
  const fast = ema(c, 20), slow = ema(c, 50);
  const out = [];
  for (let i = 51; i < bars.length; i++) {
    const cross = Math.sign(fast[i] - slow[i]);
    if (cross === Math.sign(fast[i - 1] - slow[i - 1]) || cross === 0) continue;
    const f = forward(bars, i, 30, cross);
    const ref = c[i];
    out.push({
      concept: 'ma', direction: cross > 0 ? 'bullish' : 'bearish', keyIndex: i, range: view(bars, i - 40, f.best, 4), score: Math.abs((cross > 0 ? bars[f.best].h : bars[f.best].l) - c[i]),
      facts: {}, overlays: ['ema20', 'ema50'],
      annotations: [{ id: aid('x'), type: 'label', role: cross > 0 ? 'bull' : 'bear', i1: i, price: fast[i], text: cross > 0 ? '20 EMA crosses above 50' : '20 EMA crosses below 50' }],
      steps: [
        step('mas', 'Two averages', 'The 20-period EMA follows price quickly; the 50-period EMA shows the slower trend.', view(bars, i - 40, i, 2)),
        step('cross', 'The cross', `On ${t(bars, i)} the 20 EMA crossed ${cross > 0 ? 'above' : 'below'} the 50 EMA near ${P(fast[i], ref)}.`, view(bars, i - 20, i + 4), ['*']),
        step('after', 'Follow-through', `Price reached ${P(cross > 0 ? bars[f.best].h : bars[f.best].l, ref)}. Crosses lag price, so they confirm trends rather than predict them.`, view(bars, i - 20, f.best, 3)),
      ],
      summary: `20/50 EMA ${cross > 0 ? 'bullish' : 'bearish'} cross at ${t(bars, i)}`,
    });
  }
  return pick(out, max);
}

function detectRsiMacd(bars, { max = 6 } = {}) {
  const c = bars.map((b) => b.c);
  const r = rsi(c);
  const m = macd(c);
  const out = [];
  for (let i = 30; i < bars.length; i++) {
    const crossUp = m.line[i] > m.signal[i] && m.line[i - 1] <= m.signal[i - 1];
    const crossDn = m.line[i] < m.signal[i] && m.line[i - 1] >= m.signal[i - 1];
    if (!crossUp && !crossDn) continue;
    const recentR = r.slice(i - 8, i + 1).filter((x) => x != null);
    const extreme = crossUp ? Math.min(...recentR) < 32 : Math.max(...recentR) > 68;
    if (!extreme) continue;
    const dir = crossUp ? 1 : -1;
    const f = forward(bars, i, 25, dir);
    const ref = c[i];
    out.push({
      concept: 'rsi-macd', direction: dir > 0 ? 'bullish' : 'bearish', keyIndex: i, range: view(bars, i - 30, f.best, 4), score: Math.abs((dir > 0 ? bars[f.best].h : bars[f.best].l) - c[i]),
      facts: { rsi: recentR }, overlays: ['rsi', 'macd'],
      annotations: [{ id: aid('x'), type: 'label', role: dir > 0 ? 'bull' : 'bear', i1: i, price: dir > 0 ? bars[i].l : bars[i].h, text: `RSI ${dir > 0 ? 'oversold' : 'overbought'} + MACD cross` }],
      steps: [
        step('rsi', 'RSI at an extreme', `RSI dipped ${dir > 0 ? 'below 30 (oversold)' : 'above 70 (overbought)'} shortly before ${t(bars, i)}.`, view(bars, i - 20, i, 2)),
        step('macd', 'MACD confirms', `On ${t(bars, i)} the MACD line crossed ${dir > 0 ? 'above' : 'below'} its signal line.`, view(bars, i - 15, i + 3), ['*']),
        step('after', 'Follow-through', `Price then reached ${P(dir > 0 ? bars[f.best].h : bars[f.best].l, ref)}. Indicators confirm what price is doing; they do not replace reading price.`, view(bars, i - 15, f.best, 3)),
      ],
      summary: `RSI ${dir > 0 ? 'oversold' : 'overbought'} with MACD ${dir > 0 ? 'bull' : 'bear'} cross at ${t(bars, i)}`,
    });
  }
  return pick(out, max);
}

function pick(list, max) {
  return list.sort((a, b) => b.score - a.score).slice(0, max).map((ex, n) => ({ ...ex, rank: n + 1 }));
}

export const DETECTORS = {
  fvg: (b) => detectFVG(b),
  ifvg: (b) => detectIFVG(b),
  mss: (b) => detectStructure(b, { want: 'MSS' }),
  bos: (b) => detectStructure(b, { want: 'BOS' }),
  cisd: (b) => detectCISD(b),
  sweep: (b) => detectSweeps(b),
  bsl: (b) => detectSweeps(b, { side: 'bsl' }),
  ssl: (b) => detectSweeps(b, { side: 'ssl' }),
  ob: (b) => detectOrderBlocks(b),
  breaker: (b) => detectBreakers(b),
  mitigation: (b) => detectBreakers(b, { mitigation: true }),
  displacement: (b) => detectDisplacement(b),
  'premium-discount': (b) => detectFib(b, { mode: 'pd' }),
  ote: (b) => detectFib(b, { mode: 'ote' }),
  judas: (b) => detectSessions(b, { mode: 'judas' }),
  po3: (b) => detectSessions(b, { mode: 'po3' }),
  asia: (b) => detectSessions(b, { mode: 'asia' }),
  sessions: (b) => detectSessions(b, { mode: 'sessions' }),
  sr: (b) => detectSR(b),
  trendline: (b) => detectTrendlines(b),
  candles: (b) => detectCandles(b),
  structure: (b) => detectMarketStructure(b),
  volume: (b) => detectVolume(b),
  ma: (b) => detectMA(b),
  'rsi-macd': (b) => detectRsiMacd(b),
  rr: (b) => detectFVG(b).filter((e) => e.facts.plan),
  sltp: (b) => detectOrderBlocks(b).concat(detectFVG(b).filter((e) => e.facts.plan)).sort((a, b) => b.score - a.score).slice(0, 8),
};

export function detect(conceptDetector, bars) {
  const fn = DETECTORS[conceptDetector];
  if (!fn || bars.length < 30) return [];
  return fn(bars);
}

// Annotation ids referenced as '*' mean "all annotations of this example".
export function resolveReveal(example, ids) {
  return ids.includes('*') ? example.annotations.map((a) => a.id) : ids;
}
