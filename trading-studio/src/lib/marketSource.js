// Real market data sources for Chart Research.
// 1. TradingView: through the viewer's own claude.ai TradingView connector (web build only),
//    using TradingView's MCP tools under the viewer's TradingView plan. No scraping, no unofficial APIs.
// 2. CSV: TradingView "Export chart data" files (or any OHLCV export) imported by the user.
// Nothing here generates prices.
import { STANDALONE } from './api.js';
import { CONNECTOR_INTERVAL, resample, tfSec, toColumns, parseCsv, inferInterval } from '../../shared/market.js';

const SERVER_NAMES = ['Tradingview', 'TradingView'];
const TOOLS = { ohlcv: 'mcp-tv-get-ohlcv', search: 'mcp-tv-search-symbols' };

async function mcp() {
  if (!STANDALONE) return null;
  const local = await import('./localServer.js');
  return local.mcpCapability();
}

async function call(tool, input) {
  const m = await mcp();
  if (!m) throw Object.assign(new Error('The TradingView connector isn’t available in this view. Open the studio on claude.ai with your TradingView connector connected, or import a chart export (CSV).'), { code: 'unavailable' });
  let lastErr;
  for (const server of SERVER_NAMES) {
    try {
      const res = await m.callTool(server, tool, input);
      const payload = res?.payload ?? (() => { try { return JSON.parse(res?.content?.[0]?.text || 'null'); } catch { return null; } })();
      if (!payload) throw Object.assign(new Error('TradingView returned no data.'), { code: 'empty' });
      if (payload.success === false) throw Object.assign(new Error(payload.error || payload.message || 'TradingView could not return data for that request.'), { code: 'tool_error' });
      return payload;
    } catch (err) {
      lastErr = err;
      if (err?.code !== 'server_not_connected' && err?.code !== 'unknown_server') break;
    }
  }
  const msg = {
    not_granted: 'TradingView access wasn’t allowed for this page. Allow it from the page’s permissions to fetch charts.',
    server_not_connected: 'Your TradingView connector isn’t connected in claude.ai. Connect it under Settings → Connectors, then try again.',
    rate_limited: 'TradingView is rate-limiting requests. Wait a moment and try again.',
  }[lastErr?.code];
  throw Object.assign(new Error(msg || lastErr?.message || 'TradingView request failed.'), { code: lastErr?.code });
}

export const tradingViewAvailable = (integrations) => STANDALONE && !!integrations?.tradingview?.configured;

export async function searchSymbols(query) {
  const out = await call(TOOLS.search, { query });
  const list = out.symbols || out.results || out.data || (Array.isArray(out) ? out : []);
  return list.map((s) => ({ id: s.symbol || `${s.exchange}:${s.ticker}`, label: s.description || s.symbol, type: s.type })).filter((s) => s.id);
}

export async function fetchTradingView({ symbol, timeframe, count = 1500, dateTo }) {
  const interval = CONNECTOR_INTERVAL[timeframe] || '5m';
  const input = { symbol, interval, count: Math.min(5000, timeframe === '2m' ? count * 2 : count), format: 'columns' };
  if (dateTo) input.date_to = dateTo;
  const out = await call(TOOLS.ohlcv, input);
  const cols = out.bars;
  if (!cols?.t?.length) throw new Error(`TradingView returned no bars for ${symbol} ${timeframe}.`);
  let bars = cols.t.map((t, i) => ({ t, o: cols.o[i], h: cols.h[i], l: cols.l[i], c: cols.c[i], v: cols.v?.[i] ?? 0 }));
  if (timeframe === '2m') bars = resample(bars, 120);
  const fetchedAt = new Date().toISOString();
  return {
    name: `${symbol} · ${timeframe} · ${new Date(bars[0].t * 1000).toISOString().slice(0, 10)} → ${new Date(bars[bars.length - 1].t * 1000).toISOString().slice(0, 10)}`,
    symbol,
    label: symbol,
    interval: timeframe,
    source: {
      kind: 'tradingview-connector',
      provider: 'TradingView (via your claude.ai TradingView connector)',
      fetchedAt: fetchedAt.slice(0, 10),
      notice: out.notice || 'Served under your TradingView plan.',
      resampledFrom: timeframe === '2m' ? '1m' : null,
    },
    ...toColumns(bars),
  };
}

export async function datasetFromCsv(file, { symbol, provider }) {
  const text = await file.text();
  const bars = parseCsv(text);
  const sec = inferInterval(bars);
  const tf = Object.entries({ 60: '1m', 120: '2m', 300: '5m', 900: '15m', 3600: '1h', 14400: '4h', 86400: '1D' }).find(([s]) => Math.abs(Number(s) - sec) < 5)?.[1] || `${Math.round(sec / 60)}m`;
  return {
    name: `${symbol || file.name} · ${tf} · imported`,
    symbol: symbol || file.name.replace(/\.csv$/i, ''),
    label: symbol || file.name,
    interval: tf,
    source: { kind: 'csv', provider: provider || 'Chart data export', fileName: file.name, fetchedAt: new Date().toISOString().slice(0, 10) },
    ...toColumns(bars),
  };
}

// Higher timeframe view of a dataset (only aggregating upward; never invents bars).
export function barsForTimeframe(bars, datasetInterval, timeframe) {
  const base = tfSec(datasetInterval);
  const want = tfSec(timeframe);
  if (want <= base) return bars;
  return resample(bars, want);
}
