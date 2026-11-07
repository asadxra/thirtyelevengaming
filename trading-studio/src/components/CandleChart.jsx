// SVG candlestick chart for real OHLCV data, with teaching annotations
// (FVG boxes, liquidity lines, structure labels, Fibonacci, sessions, entry/stop/target).
// Used in Chart Research (interactive), the video editor and the video stage.
import React, { useId, useMemo, useRef } from 'react';
import { ema, fmtPrice, formatBarTime, sessionBreaks, nyParts } from '../../shared/market.js';


export default function CandleChart({
  bars = [], focus, annotations = [], visible = null, fresh = null, progress = 1, selectedId, onSelect,
  width = 960, height = 540, interactive = false, onFocusChange, showSessions = true, showVolume = true,
  overlays = [], replayTo = null, sourceLabel = '', compact = false, className = '', axis = true,
  palette = null, faded = null, labelScale = 1, embed = null, buildIn = null, hiddenBars = null, onCandleClick = null, markedBars = null,
}) {
  // Clean look (palette.clean): dashed grid, plain-text labels, zones with dashed edges.
  const clean = !!palette?.clean;
  // Explicit palette (videos, thumbnails) or theme CSS variables (dashboard).
  const C = (k) => (palette ? palette[k] || palette.info : `var(--c-${k}, var(--c-info))`);
  const ROLE_VAR = (role) => C(role || 'info');
  const pillQueue = [];
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
  const shown = annotations.filter((an) => !visible || visible.has(an.id) || isFresh(an.id) || (faded && faded.has(an.id)));

  // Labels are queued and laid out at the end so they never overlap each other.
  const pill = (tx, ty, text, color, anchor = 'start', key) => {
    const fs = (compact ? 9 : 11) * labelScale;
    const w = text.length * fs * 0.6 + 12 * labelScale;
    const h = fs + 8 * labelScale;
    const x0 = anchor === 'end' ? tx - w : anchor === 'middle' ? tx - w / 2 : tx;
    pillQueue.push({ key: key || `${text}${tx}${ty}`, x: x0, y: ty - h / 2, w, h, fs, text, color });
    return null;
  };

  const layoutPills = () => {
    const placed = [];
    const minX = padL + 2, maxX = padL + plotW - 2, minY = padT + 2, maxY = padT + plotH - 2;
    const hit = (r) => placed.some((q) => r.x < q.x + q.w + 3 && r.x + r.w + 3 > q.x && r.y < q.y + q.h + 2 && r.y + r.h + 2 > q.y);
    for (const p0 of [...pillQueue].sort((u, v) => u.y - v.y)) {
      const r = { ...p0, x: Math.min(Math.max(p0.x, minX), maxX - p0.w) };
      const offs = [0];
      for (let k = 1; k <= 8; k++) offs.push(k * (r.h + 3), -k * (r.h + 3));
      let done = null;
      for (const o of offs) {
        const cand = { ...r, y: Math.min(Math.max(r.y + o, minY), maxY - r.h) };
        if (!hit(cand)) { done = cand; break; }
      }
      placed.push(done || r);
    }
    return placed;
  };

  const renderAnn = (an) => {
    const order = freshList.indexOf(an);
    const p = pr(an.id, order, freshList.length);
    if (p <= 0) return null;
    const color = an.color || ROLE_VAR(an.role);
    const sel = selectedId === an.id;
    const common = { 'data-ann': an.id, onClick: onSelect ? (e) => { e.stopPropagation(); onSelect(an.id); } : undefined, style: onCandleClick ? { pointerEvents: 'none' } : { cursor: onSelect ? 'pointer' : 'default' }, className: `ann ann-${an.type} ${sel ? 'sel' : ''}` };
    const isFaded = faded && faded.has(an.id) && !isFresh(an.id);
    const op = (an.opacity ?? 1) * (isFaded ? 0.22 : 1);
    if (isFaded) an = { ...an, text: '' };
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
            {clean ? (<>
              <rect x={x1} y={y1} width={Math.max(1, x2 - x1)} height={Math.max(1, y2 - y1)} fill={color} fillOpacity=".55" stroke={sel ? C('structure') : 'none'} strokeWidth="2" />
              <line x1={x1} x2={x2} y1={y1} y2={y1} stroke={C('edge')} strokeWidth="1.4" strokeDasharray="6 5" />
              <line x1={x1} x2={x2} y1={y2} y2={y2} stroke={C('edge')} strokeWidth="1.4" strokeDasharray="6 5" />
            </>) : <rect x={x1} y={y1} width={Math.max(1, x2 - x1)} height={Math.max(1, y2 - y1)} fill={color} fillOpacity=".2" stroke={color} strokeWidth={sel ? 2.5 : 1.2} />}
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
            {an.text && p > 0.8 && pill(x2 - 4, yy - 11 * labelScale, an.text, color, 'end')}
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
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} {...(embed || {})} className={embed ? undefined : `candle-chart ${interactive ? 'interactive' : ''} ${className}`}
      onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
      onClick={() => onSelect?.(null)} role="img" aria-label="Candlestick chart">
      <rect x="0" y="0" width={width} height={height} fill={C('bg')} />
      <defs><clipPath id={clipId}><rect x={padL} y={padT} width={plotW} height={plotH} /></clipPath></defs>
      {/* grid */}
      {ticks.map((p) => <line key={p} x1={padL} x2={padL + plotW} y1={y(p)} y2={y(p)} stroke={C('grid')} strokeWidth="1" strokeDasharray={clean ? '7 6' : undefined} />)}
      {timeTicks.map((i) => <line key={i} x1={x(i)} x2={x(i)} y1={padT} y2={padT + plotH} stroke={C('grid')} strokeWidth="1" opacity={clean ? 1 : 0.6} strokeDasharray={clean ? '7 6' : undefined} />)}
      <g clipPath={`url(#${clipId})`}>
        {breaks.map((s) => (
          <g key={s.index}>
            <line x1={x(s.index) - stepW / 2} x2={x(s.index) - stepW / 2} y1={padT} y2={padT + plotH} stroke={C('session')} strokeDasharray="2 5" />
            {!compact && <text x={x(s.index) - stepW / 2 + 4} y={padT + plotH - 6} fill={C('session')} fontSize="10">{s.label}</text>}
          </g>
        ))}
        {/* volume */}
        {showVolume && !compact && bars.slice(a, lastShown + 1).map((q, k) => {
          const i = a + k;
          const vh = ((q.v || 0) / vmax) * plotH * 0.16;
          return <rect key={`v${i}`} x={x(i) - stepW * 0.35} y={padT + plotH - vh} width={Math.max(1, stepW * 0.7)} height={vh} fill={q.c >= q.o ? C('bull') : C('bear')} opacity=".18" />;
        })}
        {/* annotations behind candles: highlights & boxes */}
        {shown.filter((an) => an.type === 'highlight' || an.type === 'box').map(renderAnn)}
        {/* candles */}
        {bars.slice(a, lastShown + 1).map((q, k) => {
          const i = a + k;
          if (hiddenBars && hiddenBars.has(i)) {
            // Hidden in this scene: leave the slot empty (or a faint placeholder while editing).
            return onCandleClick ? <rect key={i} x={x(i) - stepW * 0.4} y={padT} width={stepW * 0.8} height={plotH} fill="transparent" stroke={C('grid')} strokeDasharray="2 3" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onCandleClick(i); }} /> : null;
          }
          const up = q.c >= q.o;
          const col = up ? C('bull') : C('bear');
          const bw = Math.max(1, stepW * 0.68);
          const yo = y(Math.max(q.o, q.c)), yc = y(Math.min(q.o, q.c));
          // Build-in motion: candles in [from, to] appear one after another.
          let bi = 1;
          if (buildIn && i >= buildIn.from && i <= buildIn.to) {
            const n = buildIn.to - buildIn.from + 1;
            bi = Math.max(0, Math.min(1, (buildIn.t * n - (i - buildIn.from)) * 1.6));
            if (bi <= 0) return null;
          }
          return (
            <g key={i} opacity={bi} transform={bi < 1 ? `translate(0 ${(1 - bi) * 10})` : undefined}
              onClick={onCandleClick ? (e) => { e.stopPropagation(); onCandleClick(i); } : undefined} style={onCandleClick ? { cursor: 'pointer' } : undefined}>
              {markedBars && markedBars.has(i) && <rect x={x(i) - stepW * 0.5} y={padT} width={stepW} height={plotH} fill={C('highlight')} opacity=".18" />}
              <line x1={x(i)} x2={x(i)} y1={y(q.h)} y2={y(q.l)} stroke={(up ? palette?.bullWick : palette?.bearWick) || col} strokeWidth={Math.max(1, stepW * 0.1)} />
              <rect x={x(i) - bw / 2} y={yo} width={bw} height={Math.max(1, yc - yo)} fill={col} stroke={(up ? palette?.bullBorder : palette?.bearBorder) || 'none'} strokeWidth={(up ? palette?.bullBorder : palette?.bearBorder) ? Math.max(1, stepW * 0.08) : 0} />
            </g>
          );
        })}
        {emas.ema20 && <polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" points={emas.ema20.slice(a, lastShown + 1).map((v, k) => `${x(a + k)},${y(v)}`).join(' ')} />}
        {emas.ema50 && <polyline fill="none" stroke="#60a5fa" strokeWidth="1.5" points={emas.ema50.slice(a, lastShown + 1).map((v, k) => `${x(a + k)},${y(v)}`).join(' ')} />}
        {shown.filter((an) => an.type !== 'highlight' && an.type !== 'box').map(renderAnn)}
        {layoutPills().map((q) => (
          <g key={q.key} className="pill">
            {!clean && <rect x={q.x} y={q.y} width={q.w} height={q.h} rx={4 * labelScale} fill={C('bg')} stroke={q.color} strokeWidth="1" opacity=".95" />}
            <text x={q.x + 6 * labelScale} y={q.y + q.h / 2 + q.fs * 0.36} fill={clean ? C('label') : q.color} fontSize={clean ? q.fs * 1.15 : q.fs} fontWeight={clean ? 800 : 600}
              stroke={clean ? C('bg') : undefined} strokeWidth={clean ? 3 : undefined} paintOrder="stroke" fontFamily={clean ? "'Montserrat', 'Poppins', Arial, sans-serif" : undefined}>{q.text}</text>
          </g>
        ))}
      </g>
      {/* axes */}
      {axis && (
        <g fontSize={compact ? 9 : 11} fill={C('text')} fontFamily="'JetBrains Mono', ui-monospace, monospace">
          {ticks.map((p) => <text key={p} x={padL + plotW + 6} y={y(p) + 4}>{fmtPrice(p, ref)}</text>)}
          {timeTicks.map((i) => bars[i] && (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle">{(() => { const p = nyParts(bars[i].t); return compact ? `${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}` : `${p.mo}/${p.d} ${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}`; })()}</text>
          ))}
          {bars[lastShown] && (
            <g>
              <rect x={padL + plotW + 1} y={y(bars[lastShown].c) - 9} width={padR - 2} height={18} rx="3" fill={bars[lastShown].c >= bars[lastShown].o ? C('bull') : C('bear')} />
              <text x={padL + plotW + 6} y={y(bars[lastShown].c) + 4} fill="#fff">{fmtPrice(bars[lastShown].c, ref)}</text>
            </g>
          )}
        </g>
      )}
      {sourceLabel && <text x={padL + 6} y={padT + 14} fill={C('text')} fontSize={compact ? 9 : 11} opacity=".85">{sourceLabel}</text>}
      {!compact && bars[a] && axis && <text x={padL + plotW - 4} y={padT + 14} textAnchor="end" fill={C('text')} fontSize="11" opacity=".7">{formatBarTime(bars[a].t)} → {formatBarTime(bars[lastShown].t, false)}</text>}
    </svg>
  );
}
