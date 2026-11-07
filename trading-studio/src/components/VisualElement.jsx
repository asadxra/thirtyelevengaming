// Live, editable visual storytelling elements (code animations, market visuals, lighting).
import React, { useMemo } from 'react';

const CODE = [
  'def should_enter(setup, emotion):',
  '    if emotion.fomo or emotion.revenge:',
  '        return WAIT',
  '    if setup.risk_reward < 2.0:',
  '        return SKIP',
  '    size = account * 0.01 / setup.stop',
  '    return ENTER(size)',
  '',
  'for trade in journal.today():',
  '    review(trade.plan, trade.execution)',
  '    log(trade.emotion, trade.result)',
  '',
  'while market.open():',
  '    if not discipline.check():',
  '        platform.close()',
  '        break',
  'equity = sum(r.pnl for r in history)',
  'drawdown = peak - equity  # respect it',
];

function seeded(n) {
  let s = n;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function Code({ color }) {
  const lines = [...CODE, ...CODE];
  return (
    <div className="vx-code" style={{ color }}>
      <div className="vx-scroll-y">
        {lines.map((l, i) => <div key={i}><span className="ln">{String((i % CODE.length) + 1).padStart(2, '0')}</span>{l.replace(/ /g, ' ') || ' '}</div>)}
      </div>
    </div>
  );
}

function Ticker({ color }) {
  const items = useMemo(() => {
    const r = seeded(7);
    return Array.from({ length: 16 }, (_, i) => {
      const v = (r() * 6 - 2.4).toFixed(2);
      return { k: ['BTC', 'ETH', 'EURUSD', 'NAS100', 'XAU', 'SPX', 'GBPJPY', 'SOL'][i % 8], v };
    });
  }, []);
  return (
    <div className="vx-ticker">
      <div className="vx-scroll-x">
        {[...items, ...items].map((it, i) => (
          <span key={i} style={{ color: Number(it.v) >= 0 ? color : '#ef4444' }}>{it.k} {Number(it.v) >= 0 ? '▲' : '▼'} {it.v}%</span>
        ))}
      </div>
    </div>
  );
}

function Stats({ color }) {
  const stats = [['WIN RATE', '54.2%'], ['MAX DRAWDOWN', '-8.3%'], ['AVG R:R', '1 : 2.4'], ['TRADES SKIPPED', '37']];
  return (
    <div className="vx-stats">
      {stats.map(([k, v], i) => (
        <div key={k} className="vx-stat" style={{ borderColor: color, animationDelay: `${i * -1.3}s` }}>
          <small>{k}</small><b style={{ color }}>{v}</b>
        </div>
      ))}
    </div>
  );
}

function Terminal({ color }) {
  const lines = ['$ risk --per-trade 1%', '> position size: 0.42 lots', '$ check --emotion', '> state: calm ✓', '$ execute --plan only', '> order filled @ 1.0842', '$ journal --log', '> saved.'];
  return (
    <div className="vx-terminal" style={{ borderColor: color }}>
      <div className="vx-term-bar"><i /><i /><i /></div>
      <div className="vx-term-body" style={{ color }}>
        {lines.map((l, i) => <div key={i} className="vx-type" style={{ animationDelay: `calc(${i * 0.7}s * var(--vx-spd))` }}>{l}</div>)}
      </div>
    </div>
  );
}

function Candles({ color }) {
  const candles = useMemo(() => {
    const r = seeded(13);
    let p = 50;
    return Array.from({ length: 18 }, () => {
      const o = p;
      const c = p + (r() - 0.42) * 14;
      p = c;
      return { o, c, h: Math.max(o, c) + r() * 6, l: Math.min(o, c) - r() * 6 };
    });
  }, []);
  const ys = (v) => 100 - v;
  return (
    <svg viewBox="0 0 190 110" className="vx-svg">
      {candles.map((k, i) => {
        const up = k.c >= k.o;
        const col = up ? color : '#ef4444';
        return (
          <g key={i} className="vx-candle" style={{ animationDelay: `calc(${i * 0.12}s * var(--vx-spd))` }}>
            <line x1={6 + i * 10} x2={6 + i * 10} y1={ys(k.h)} y2={ys(k.l)} stroke={col} strokeWidth="1.2" />
            <rect x={2.5 + i * 10} width="7" y={ys(Math.max(k.o, k.c))} height={Math.max(1.5, Math.abs(k.c - k.o))} fill={col} />
          </g>
        );
      })}
    </svg>
  );
}

function Chart({ color }) {
  const d = useMemo(() => {
    const r = seeded(3);
    let y = 80;
    return Array.from({ length: 40 }, (_, i) => {
      y = Math.max(10, Math.min(95, y - (r() - 0.38) * 9));
      return `${i ? 'L' : 'M'}${i * 5} ${y.toFixed(1)}`;
    }).join(' ');
  }, []);
  return (
    <svg viewBox="0 0 200 100" className="vx-svg">
      {[20, 40, 60, 80].map((y) => <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="currentColor" opacity=".08" />)}
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" className="vx-draw" pathLength="1" />
    </svg>
  );
}

function Market({ color }) {
  const rows = [['EURUSD', '1.0842', '+0.12%'], ['BTCUSD', '68,420', '-1.84%'], ['NAS100', '18,233', '+0.48%'], ['XAUUSD', '2,341.5', '+0.22%'], ['USDJPY', '151.42', '-0.31%']];
  return (
    <table className="vx-market" style={{ color }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r[0]} className="vx-row" style={{ animationDelay: `calc(${i * 0.4}s * var(--vx-spd))` }}>
            <td>{r[0]}</td><td>{r[1]}</td><td style={{ color: r[2].startsWith('-') ? '#ef4444' : '#22c55e' }}>{r[2]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Screens({ color }) {
  return (
    <div className="vx-screens">
      {[0, 1, 2].map((i) => (
        <div key={i} className="vx-screen" style={{ borderColor: color, boxShadow: `0 0 calc(30px * var(--vx-glow)) ${color}` }}>
          <Chart color={i === 1 ? '#22c55e' : color} />
        </div>
      ))}
    </div>
  );
}

function GlowUI({ color }) {
  return (
    <svg viewBox="0 0 120 120" className="vx-svg vx-hud">
      <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="1" strokeDasharray="4 6" className="vx-spin" />
      <circle cx="60" cy="60" r="38" fill="none" stroke={color} strokeWidth="2" strokeDasharray="60 180" className="vx-spin-rev" />
      <circle cx="60" cy="60" r="26" fill="none" stroke={color} strokeWidth="1" opacity=".6" />
      <text x="60" y="64" textAnchor="middle" fill={color} fontSize="10" fontFamily="JetBrains Mono, monospace">FOCUS</text>
    </svg>
  );
}

function Particles({ color }) {
  const pts = useMemo(() => {
    const r = seeded(21);
    return Array.from({ length: 26 }, () => ({ x: r() * 100, d: r() * 6, s: 2 + r() * 3, t: 4 + r() * 5 }));
  }, []);
  return (
    <div className="vx-particles">
      {pts.map((p, i) => (
        <i key={i} style={{ left: `${p.x}%`, width: p.s, height: p.s, background: color, boxShadow: `0 0 8px ${color}`, animationDelay: `-${p.d}s`, animationDuration: `calc(${p.t}s * var(--vx-spd))` }} />
      ))}
    </div>
  );
}

function Lighting({ color }) {
  return <div className="vx-light" style={{ background: `radial-gradient(circle at 50% 40%, ${color} 0%, transparent 65%)` }} />;
}

function Abstract({ color }) {
  return (
    <div className="vx-abstract">
      <i style={{ background: color }} />
      <i style={{ background: 'var(--primary)' }} />
      <i style={{ background: 'var(--secondary)' }} />
    </div>
  );
}

const MAP = { code: Code, ticker: Ticker, stats: Stats, terminal: Terminal, candles: Candles, chart: Chart, market: Market, screens: Screens, 'glow-ui': GlowUI, particles: Particles, lighting: Lighting, abstract: Abstract };

const FULL = new Set(['code', 'particles', 'lighting', 'abstract', 'screens']);

export default function VisualElement({ type, props = {}, standalone = false, selected, onClick }) {
  const Comp = MAP[type];
  if (!Comp) return null;
  const p = props;
  const style = {
    '--vx-spd': 1 / (p.speed || 1),
    '--vx-glow': p.glow ?? 0.5,
    opacity: p.opacity ?? 1,
    filter: `blur(${p.blur || 0}px) drop-shadow(0 0 ${(p.glow ?? 0.5) * 12}px ${p.color})`,
    zIndex: (p.layer ?? 1) + 1,
    color: p.color,
  };
  if (!standalone) {
    Object.assign(style, FULL.has(type)
      ? { left: `${p.x - 50}%`, top: `${p.y - 50}%`, width: '100%', height: '100%', transform: `scale(${p.scale})` }
      : { left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%, -50%) scale(${p.scale})` });
  }
  return (
    <div className={`vx vx-${type} ${standalone ? 'vx-standalone' : ''} ${selected ? 'vx-selected' : ''}`} style={style} onClick={onClick}>
      <Comp color={p.color} />
    </div>
  );
}
