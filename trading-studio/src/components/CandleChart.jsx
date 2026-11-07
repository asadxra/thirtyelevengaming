// SVG candlestick chart for real OHLCV data, with teaching annotations
// (FVG boxes, liquidity lines, structure labels, Fibonacci, sessions, entry/stop/target).
// Used in Chart Research (interactive), the video editor and the video stage.
import React, { useId, useMemo, useRef } from 'react';
import { ema, fmtPrice, formatBarTime, sessionBreaks, nyParts } from '../../shared/market.js';

const ROLE_VAR = (role) => `var(--c-${role || 'info'}, var(--c-info))`;

export default function CandleChart({
  bars = [], focus, annotations = [], visible = null, fresh = null, progress = 1, selectedId, onSelect,
  width = 960, height = 540, interactive = false, onFocusChange, showSessions = true, showVolume = true,
  overlays = [], replayTo = null, sourceLabel = '', compact = false, className = '', axis = true,
}) {
  const svgRef = useRef(null);
  const clipId = `clip${useId().replace(/:/g, '')}`;
  const drag = useRef(null);
  const n = bars.length;
  const [fa, fb] = focus && Number.isFinite(focus[0]) ? focus : [0, n - 1];
  const a = Math.max(0, Math.floor(Math.min(fa, fb)));
  const b = Math.min(n - 1, Math.ceil(Math.max(fa, fb)));
  const lastShown = replayTo == null ? b : Math.min(b, replayTo);

  const padL = compact ? 4 : 8;
  const padR = axis ? (compact ? 44 : 70) : 8;
  const padT = compact ? 8 : 18;
  const padB = axis ? (compact ? 16 : 26) : 6;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const span = Math.max(1, fb - fa + 1);
  const stepW = plotW / span;
  const x = (i) => padL + (i - fa + 0.5) * stepW;

  const emas = useMemo(() => {
    if (!overlays.some((o) => o.startsWith('ema'))) return {};
    const c = bars.map((q) => q.c);
    return { ema20: ema(c, 20), ema50: ema(c, 50) };
  }, [bars, overlays]);

  const { lo, hi } = useMemo(() => {
    let l = Infinity, h = -Infinity;
    for (let i = a; i <= lastShown; i++) { l = Math.min(l, bars[i].l); h = Math.max(h, bars[i].h); }
    if (!Number.isFinite(l)) { l = 0; h = 1; }
    const r = h - l || 1;
    for (const an of annotations) {
      if (visible && !visible.has(an.id)) continue;
      for (const p of [an.price, an.p1, an.p2]) if (Number.isFinite(p) && p > l - r * 0.35 && p < h + r * 0.35) { l = Math.min(l, p); h = Math.max(h, p); }
    }
    const pad = (h - l) * 0.08 || 1;
    return { lo: l - pad, hi: h + pad };
  }, [bars, a, lastShown, annotations, visible]);
  const y = (p) => padT + (1 - (p - lo) / (hi - lo)) * plotH;
  const ref = bars[b]?.c || 1;

  const vmax = useMemo(() => Math.max(1, ...bars.slice(a, lastShown + 1).map((q) => q.v || 0)), [bars, a, lastShown]);
  const ticks = useMemo(() => {
    const raw = (hi - lo) / 6;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const st = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw) || raw;
    const out = [];
    for (let p = Math.ceil(lo / st) * st; p <= hi; p += st) out.push(p);
    return out;
  }, [lo, hi]);
  const timeTicks = useMemo(() => {
    const every = Math.max(1, Math.round(span / (compact ? 4 : 7)));
    const out = [];
    for (let i = a; i <= b; i += every) out.push(i);
    return out;
  }, [a, b, span, compact]);
  const breaks = useMemo(() => (showSessions ? sessionBreaks(bars).filter((s) => s.index >= a && s.index <= b) : []), [bars, a, b, showSessions]);

  // ---------- interaction ----------
  const toIndexDelta = (dxPx) => {
    const rect = svgRef.current.getBoundingClientRect();
    return (dxPx / rect.width) * width / stepW;
  };
  const onWheel = (e) => {
    if (!interactive || !onFocusChange) return;
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * width;
    const center = fa + (mx - padL) / stepW;
    const k = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    let na = center - (center - fa) * k;
    let nb = center + (fb - center) * k;
    if (nb - na < 8) return;
    na = Math.max(-5, na); nb = Math.min(n + 5, nb);
    onFocusChange([na, nb]);
  };
  const onDown = (e) => { if (interactive && onFocusChange && e.button === 0 && !e.target.closest('[data-ann]')) drag.current = { x: e.clientX, fa, fb }; };
  const onMove = (e) => {
    if (!drag.current) return;
    const d = toIndexDelta(e.clientX - drag.current.x);
    const len = drag.current.fb - drag.current.fa;
    let na = drag.current.fa - d;
    na = Math.max(-5, Math.min(n + 5 - len, na));
    onFocusChange([na, na + len]);
  };
  const onUp = () => { drag.current = null; };

  // ---------- annotation rendering ----------
  const isFresh = (id) => fresh && fresh.has(id);
  const pr = (id, order = 0, count = 1) => {
    if (!isFresh(id)) return 1;
    const slot = 1 / Math.max(1, count);
    return Math.max(0, Math.min(1, (progress - order * slot * 0.6) / (slot * 1.4 || 1)));
  };
  const freshList = annotations.filter((an) => isFresh(an.id));
  const shown = annotations.filter((an) => !visible || visible.has(an.id) || isFresh(an.id));

  const pill = (tx, ty, text, color, anchor = 'start', key) => {
    const w = text.length * (compact ? 5.4 : 6.6) + 12;
    const h = compact ? 14 : 18;
    const x0 = anchor === 'end' ? tx - w : anchor === 'middle' ? tx - w / 2 : tx;
    return (
      <g key={key} className="pill">
        <rect x={x0} y={ty - h / 2} width={w} height={h} rx={4} fill="var(--c-bg)" stroke={color} strokeWidth="1" opacity=".92" />
        <text x={x0 + 6} y={ty + (compact ? 3.5 : 4.5)} fill={color} fontSize={compact ? 9 : 11} fontWeight="600">{text}</text>
      </g>
    );
  };

  const renderAnn = (an) => {
    const order = freshList.indexOf(an);
    const p = pr(an.id, order, freshList.length);
    if (p <= 0) return null;
    const color = an.color || ROLE_VAR(an.role);
    const sel = selectedId === an.id;
    const common = { 'data-ann': an.id, onClick: onSelect ? (e) => { e.stopPropagation(); onSelect(an.id); } : undefined, style: { cursor: onSelect ? 'pointer' : 'default' }, className: `ann ann-${an.type} ${sel ? 'sel' : ''}` };
    const op = an.opacity ?? 1;
    switch (an.type) {
      case 'highlight': {
        const x1 = x(an.i1) - stepW * 0.55, x2 = x(an.i2) + stepW * 0.55;
        return (
          <g key={an.id} {...common} opacity={p * op}>
            <rect x={x1} y={padT} width={Math.max(2, x2 - x1)} height={plotH} fill={color} opacity=".12" />
            <rect x={x1} y={padT} width={Math.max(2, x2 - x1)} height={plotH} fill="none" stroke={color} strokeDasharray="4 4" strokeWidth={sel ? 2 : 1} />
            {an.text && !compact && pill(x1, padT + 12, an.text, color)}
          </g>
        );
      }
      case 'box':
      case 'fib-zone': {
        const x1 = x(an.i1) - stepW * 0.5;
        const x2full = x(an.i2) + stepW * 0.5;
        const x2 = x1 + (x2full - x1) * p;
        const y1 = y(Math.max(an.p1, an.p2)), y2 = y(Math.min(an.p1, an.p2));
        return (
          <g key={an.id} {...common} opacity={op}>
            <rect x={x1} y={y1} width={Math.max(1, x2 - x1)} height={Math.max(1, y2 - y1)} fill={color} fillOpacity=".2" stroke={color} strokeWidth={sel ? 2.5 : 1.2} />
            {an.text && p > 0.6 && pill(x1 + 4, y1 - (compact ? 9 : 12), an.text, color)}
          </g>
        );
      }
      case 'hline': {
        const x1 = x(an.i1 ?? fa) - stepW * 0.5;
        const x2full = x(an.i2 ?? fb) + stepW * 0.5;
        const x2 = x1 + (x2full - x1) * p;
        const yy = y(an.price);
        return (
          <g key={an.id} {...common} opacity={op}>
            <line x1={x1} x2={x2} y1={yy} y2={yy} stroke={color} strokeWidth={sel ? 3 : an.role === 'entry' || an.role === 'stop' || an.role === 'target' ? 1.8 : 1.4} strokeDasharray={an.dashed ? '6 5' : undefined} />
            <line x1={x1} x2={x2} y1={yy} y2={yy} stroke="transparent" strokeWidth="10" />
            {an.text && p > 0.8 && pill(x2 + 4, yy, an.text, color)}
          </g>
        );
      }
      case 'vline': {
        const xx = x(an.i1) - stepW * 0.5;
        return (
          <g key={an.id} {...common} opacity={p * op}>
            <line x1={xx} x2={xx} y1={padT} y2={padT + plotH} stroke={color} strokeDasharray="3 4" strokeWidth={sel ? 2 : 1} />
            {an.text && pill(xx + 4, padT + 30, an.text, color)}
          </g>
        );
      }
      case 'label': {
        const xx = x(an.i1);
        const yy = y(an.price);
        const above = an.price >= (bars[an.i1]?.h ?? an.price) - 1e-9;
        return (
          <g key={an.id} {...common} opacity={p * op}>
            <circle cx={xx} cy={yy} r={compact ? 2.5 : 3.5} fill={color} />
            {pill(xx, yy + (above ? -16 : 16), an.text, color, 'middle')}
          </g>
        );
      }
      case 'trend': {
        const x1 = x(an.i1), y1 = y(an.p1);
        const x2 = x1 + (x(an.i2) - x1) * p, y2 = y1 + (y(an.p2) - y1) * p;
        return (
          <g key={an.id} {...common} opacity={op}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sel ? 3 : 2} />
            {an.text && p > 0.8 && pill(x2 + 4, y2, an.text, color)}
          </g>
        );
      }
      case 'fib': {
        const x1 = x(an.i1) - stepW * 0.5;
        const x2 = x1 + (x(an.i2) + stepW * 0.5 - x1) * p;
        const levels = an.levels || [0, 0.5, 0.618, 0.705, 0.79, 1];
        return (
          <g key={an.id} {...common} opacity={op}>
            {levels.map((r) => {
              const price = an.p2 - (an.p2 - an.p1) * r;
              const yy = y(price);
              return (
                <g key={r}>
                  <line x1={x1} x2={x2} y1={yy} y2={yy} stroke={color} strokeWidth={r === 0.5 ? 1.4 : 1} strokeDasharray={r === 0 || r === 1 ? undefined : '4 4'} opacity={r === 0.5 ? 1 : 0.8} />
                  {p > 0.8 && <text x={x2 + 4} y={yy + 4} fill={color} fontSize={compact ? 9 : 11}>{`${(r * 100).toFixed(r * 100 % 1 ? 1 : 0)}%  ${fmtPrice(price, ref)}`}</text>}
                </g>
              );
            })}
          </g>
        );
      }
      default:
        return null;
    }
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className={`candle-chart ${interactive ? 'interactive' : ''} ${className}`}
      onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
      onClick={() => onSelect?.(null)} role="img" aria-label="Candlestick chart">
      <rect x="0" y="0" width={width} height={height} fill="var(--c-bg)" />
      <defs><clipPath id={clipId}><rect x={padL} y={padT} width={plotW} height={plotH} /></clipPath></defs>
      {/* grid */}
      {ticks.map((p) => <line key={p} x1={padL} x2={padL + plotW} y1={y(p)} y2={y(p)} stroke="var(--c-grid)" strokeWidth="1" />)}
      {timeTicks.map((i) => <line key={i} x1={x(i)} x2={x(i)} y1={padT} y2={padT + plotH} stroke="var(--c-grid)" strokeWidth="1" opacity=".6" />)}
      <g clipPath={`url(#${clipId})`}>
        {breaks.map((s) => (
          <g key={s.index}>
            <line x1={x(s.index) - stepW / 2} x2={x(s.index) - stepW / 2} y1={padT} y2={padT + plotH} stroke="var(--c-session)" strokeDasharray="2 5" />
            {!compact && <text x={x(s.index) - stepW / 2 + 4} y={padT + plotH - 6} fill="var(--c-session)" fontSize="10">{s.label}</text>}
          </g>
        ))}
        {/* volume */}
        {showVolume && !compact && bars.slice(a, lastShown + 1).map((q, k) => {
          const i = a + k;
          const vh = ((q.v || 0) / vmax) * plotH * 0.16;
          return <rect key={`v${i}`} x={x(i) - stepW * 0.35} y={padT + plotH - vh} width={Math.max(1, stepW * 0.7)} height={vh} fill={q.c >= q.o ? 'var(--c-bull)' : 'var(--c-bear)'} opacity=".18" />;
        })}
        {/* annotations behind candles: highlights & boxes */}
        {shown.filter((an) => an.type === 'highlight' || an.type === 'box').map(renderAnn)}
        {/* candles */}
        {bars.slice(a, lastShown + 1).map((q, k) => {
          const i = a + k;
          const up = q.c >= q.o;
          const col = up ? 'var(--c-bull)' : 'var(--c-bear)';
          const bw = Math.max(1, stepW * 0.68);
          const yo = y(Math.max(q.o, q.c)), yc = y(Math.min(q.o, q.c));
          return (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1={y(q.h)} y2={y(q.l)} stroke={col} strokeWidth={Math.max(1, stepW * 0.1)} />
              <rect x={x(i) - bw / 2} y={yo} width={bw} height={Math.max(1, yc - yo)} fill={col} />
            </g>
          );
        })}
        {emas.ema20 && <polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" points={emas.ema20.slice(a, lastShown + 1).map((v, k) => `${x(a + k)},${y(v)}`).join(' ')} />}
        {emas.ema50 && <polyline fill="none" stroke="#60a5fa" strokeWidth="1.5" points={emas.ema50.slice(a, lastShown + 1).map((v, k) => `${x(a + k)},${y(v)}`).join(' ')} />}
        {shown.filter((an) => an.type !== 'highlight' && an.type !== 'box').map(renderAnn)}
      </g>
      {/* axes */}
      {axis && (
        <g fontSize={compact ? 9 : 11} fill="var(--c-text)" fontFamily="'JetBrains Mono', ui-monospace, monospace">
          {ticks.map((p) => <text key={p} x={padL + plotW + 6} y={y(p) + 4}>{fmtPrice(p, ref)}</text>)}
          {timeTicks.map((i) => bars[i] && (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle">{(() => { const p = nyParts(bars[i].t); return compact ? `${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}` : `${p.mo}/${p.d} ${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}`; })()}</text>
          ))}
          {bars[lastShown] && (
            <g>
              <rect x={padL + plotW + 1} y={y(bars[lastShown].c) - 9} width={padR - 2} height={18} rx="3" fill={bars[lastShown].c >= bars[lastShown].o ? 'var(--c-bull)' : 'var(--c-bear)'} />
              <text x={padL + plotW + 6} y={y(bars[lastShown].c) + 4} fill="#fff">{fmtPrice(bars[lastShown].c, ref)}</text>
            </g>
          )}
        </g>
      )}
      {sourceLabel && <text x={padL + 6} y={padT + 14} fill="var(--c-text)" fontSize={compact ? 9 : 11} opacity=".85">{sourceLabel}</text>}
      {!compact && bars[a] && axis && <text x={padL + plotW - 4} y={padT + 14} textAnchor="end" fill="var(--c-text)" fontSize="11" opacity=".7">{formatBarTime(bars[a].t)} → {formatBarTime(bars[lastShown].t, false)}</text>}
    </svg>
  );
}
