// Market data utilities shared by server, browser build and tests.
// A "dataset" stores OHLCV as columns: { t:[unix sec], o:[], h:[], l:[], c:[], v:[] } plus metadata.
// Nothing here creates prices: every bar comes from a real source (TradingView connector, CSV export).

export const TIMEFRAMES = [
  { id: '1m', label: '1m', sec: 60 },
  { id: '2m', label: '2m', sec: 120 },
  { id: '5m', label: '5m', sec: 300 },
  { id: '15m', label: '15m', sec: 900 },
  { id: '1h', label: '1H', sec: 3600 },
  { id: '4h', label: '4H', sec: 14400 },
  { id: '1D', label: 'Daily', sec: 86400 },
];
export const tfSec = (id) => TIMEFRAMES.find((t) => t.id === id)?.sec || 300;

// TradingView connector intervals (2m is built by resampling 1m).
export const CONNECTOR_INTERVAL = { '1m': '1m', '2m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1D': '1D' };

export const INSTRUMENTS = [
  { id: 'CME_MINI:NQ1!', label: 'NQ · E-mini Nasdaq-100', short: 'NQ' },
  { id: 'CME_MINI:MNQ1!', label: 'MNQ · Micro Nasdaq-100', short: 'MNQ' },
  { id: 'CME_MINI:ES1!', label: 'ES · E-mini S&P 500', short: 'ES' },
  { id: 'CME_MINI:MES1!', label: 'MES · Micro S&P 500', short: 'MES' },
  { id: 'FX:EURUSD', label: 'EURUSD', short: 'EURUSD' },
  { id: 'FX:GBPUSD', label: 'GBPUSD', short: 'GBPUSD' },
  { id: 'BITSTAMP:BTCUSD', label: 'BTCUSD', short: 'BTCUSD' },
  { id: 'COMEX:GC1!', label: 'GC · Gold futures', short: 'GC' },
];

export function toBars(ds) {
  const out = [];
  for (let i = 0; i < (ds?.t?.length || 0); i++) out.push({ t: ds.t[i], o: ds.o[i], h: ds.h[i], l: ds.l[i], c: ds.c[i], v: ds.v?.[i] ?? 0 });
  return out;
}

export function toColumns(bars) {
  const cols = { t: [], o: [], h: [], l: [], c: [], v: [] };
  for (const b of bars) for (const k of Object.keys(cols)) cols[k].push(b[k]);
  return cols;
}

// Aggregate bars into a larger timeframe (only upward). Buckets align to UTC epoch multiples.
export function resample(bars, sec) {
  if (!bars.length) return [];
  const out = [];
  let cur = null;
  for (const b of bars) {
    const bucket = Math.floor(b.t / sec) * sec;
    if (!cur || cur.t !== bucket) {
      if (cur) out.push(cur);
      cur = { t: bucket, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0 };
    } else {
      cur.h = Math.max(cur.h, b.h);
      cur.l = Math.min(cur.l, b.l);
      cur.c = b.c;
      cur.v += b.v || 0;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function inferInterval(bars) {
  const diffs = [];
  for (let i = 1; i < Math.min(bars.length, 60); i++) diffs.push(bars[i].t - bars[i - 1].t);
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)] || 300;
}

// ---------- CSV import (TradingView "Export chart data", or any OHLCV CSV) ----------
export function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length < 3) throw new Error('The CSV has no data rows.');
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const col = (...names) => head.findIndex((h) => names.includes(h));
  const ti = col('time', 'date', 'datetime', 'timestamp');
  const oi = col('open', 'o');
  const hi = col('high', 'h');
  const li = col('low', 'l');
  const ci = col('close', 'c');
  const vi = col('volume', 'vol', 'v');
  if ([ti, oi, hi, li, ci].some((x) => x < 0)) throw new Error('CSV needs time, open, high, low and close columns (TradingView’s “Export chart data” format works).');
  const bars = [];
  for (const line of lines.slice(1)) {
    const p = line.split(',').map((x) => x.trim().replace(/^"|"$/g, ''));
    const raw = p[ti];
    let t = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : Date.parse(raw) / 1000;
    if (t > 1e12) t = Math.round(t / 1000);
    const b = { t, o: +p[oi], h: +p[hi], l: +p[li], c: +p[ci], v: vi >= 0 ? +p[vi] || 0 : 0 };
    if ([b.t, b.o, b.h, b.l, b.c].every(Number.isFinite)) bars.push(b);
  }
  if (bars.length < 10) throw new Error('Fewer than 10 valid OHLC rows were found.');
  bars.sort((a, b) => a.t - b.t);
  return bars;
}

// ---------- time & sessions (New York time, DST-aware via Intl) ----------
const nyFmt = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }) : null;

export function nyParts(t) {
  const parts = Object.fromEntries(nyFmt.formatToParts(new Date(t * 1000)).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour) % 24;
  return { y: +parts.year, mo: +parts.month, d: +parts.day, h: hour, m: +parts.minute, wd: parts.weekday, date: `${parts.year}-${parts.month}-${parts.day}`, minutes: hour * 60 + +parts.minute };
}

// ICT-style session windows in New York time.
export const SESSIONS = [
  { id: 'asia', label: 'Asian session', from: 20 * 60, to: 24 * 60 },
  { id: 'london', label: 'London session', from: 2 * 60, to: 5 * 60 },
  { id: 'nyam', label: 'New York AM', from: 9 * 60 + 30, to: 11 * 60 },
  { id: 'nypm', label: 'New York PM', from: 13 * 60 + 30, to: 16 * 60 },
];

export function sessionOf(t) {
  const { minutes } = nyParts(t);
  return SESSIONS.find((s) => minutes >= s.from && minutes < s.to)?.id || null;
}

export function formatBarTime(t, withDate = true) {
  const p = nyParts(t);
  const hm = `${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}`;
  return withDate ? `${p.date} ${hm} ET` : `${hm}`;
}

// Session start indices (new NY trading day at 18:00 ET, plus session opens) for separators.
export function sessionBreaks(bars) {
  const out = [];
  let prev = null;
  bars.forEach((b, i) => {
    const s = sessionOf(b.t);
    if (s && s !== prev) out.push({ index: i, session: s, label: SESSIONS.find((x) => x.id === s).label });
    prev = s;
  });
  return out;
}

// ---------- indicators ----------
export function atr(bars, n = 14) {
  const out = new Array(bars.length).fill(null);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const tr = i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c));
    if (i < n) { sum += tr; out[i] = sum / (i + 1); } else out[i] = (out[i - 1] * (n - 1) + tr) / n;
  }
  return out;
}

export function ema(values, n) {
  const k = 2 / (n + 1);
  const out = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}

export function sma(values, n) {
  return values.map((_, i) => (i < n - 1 ? null : values.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n));
}

export function rsi(closes, n = 14) {
  const out = new Array(closes.length).fill(null);
  let g = 0, l = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (i <= n) { g += Math.max(0, d); l += Math.max(0, -d); if (i === n) out[i] = 100 - 100 / (1 + g / Math.max(l, 1e-9)); continue; }
    g = (g * (n - 1) + Math.max(0, d)) / n;
    l = (l * (n - 1) + Math.max(0, -d)) / n;
    out[i] = 100 - 100 / (1 + g / Math.max(l, 1e-9));
  }
  if (closes.length > n) { g /= n; l /= n; }
  return out;
}

export function macd(closes, f = 12, s = 26, sig = 9) {
  const a = ema(closes, f);
  const b = ema(closes, s);
  const line = a.map((x, i) => x - b[i]);
  const signal = ema(line, sig);
  return { line, signal, hist: line.map((x, i) => x - signal[i]) };
}

// Pivot swings: a high/low that is the extreme of `k` bars on each side.
export function swings(bars, k = 3) {
  const highs = [];
  const lows = [];
  for (let i = k; i < bars.length - k; i++) {
    let isH = true, isL = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if (bars[j].h >= bars[i].h) isH = false;
      if (bars[j].l <= bars[i].l) isL = false;
    }
    if (isH) highs.push({ i, price: bars[i].h });
    if (isL) lows.push({ i, price: bars[i].l });
  }
  return { highs, lows };
}

export function tickRound(x, ref) {
  const step = ref > 1000 ? 0.25 : ref > 10 ? 0.01 : 0.00001;
  return Math.round(x / step) * step;
}

export function fmtPrice(x, ref = x) {
  if (x == null || !Number.isFinite(x)) return '—';
  const d = ref > 1000 ? 2 : ref > 10 ? 2 : 5;
  return x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}
