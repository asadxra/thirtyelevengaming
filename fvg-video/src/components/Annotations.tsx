import React from "react";
import { COLORS, FONT, MONO, anim, fade, useTime } from "../theme";
import { useChart } from "./Chart";

/**
 * Horizontal price level that draws left -> right, with an optional caption
 * and a TradingView-style price tag on the axis.
 */
export const PriceLine: React.FC<{
  p: number;
  at: number;
  dur?: number;
  color: string;
  label?: string;
  labelBelow?: boolean;
  dashed?: boolean;
  i0?: number;
  i1?: number;
  tag?: boolean;
  until?: number;
  width?: number;
  labelSize?: number;
  /** Put the caption at the left (start) or right (end) end of the line */
  labelAlign?: "start" | "end";
}> = ({
  p,
  at,
  dur = 0.7,
  color,
  label,
  labelBelow,
  dashed = true,
  i0,
  i1,
  tag = true,
  until,
  width = 2.5,
  labelSize = 22,
  labelAlign = "start",
}) => {
  const t = useTime();
  const { xOf, yOf, plotW, decimals } = useChart();
  const prog = anim(t, [at, at + dur]);
  if (prog <= 0) return null;
  const out = until === undefined ? 1 : anim(t, [until, until + 0.4], [1, 0]);
  const x0 = i0 === undefined ? 0 : xOf(i0);
  const x1 = i1 === undefined ? plotW : xOf(i1);
  const y = yOf(p);
  return (
    <g opacity={out}>
      <line
        x1={x0}
        x2={x0 + (x1 - x0) * prog}
        y1={y}
        y2={y}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dashed ? "10 8" : undefined}
      />
      {label ? (
        <text
          x={labelAlign === "start" ? x0 + 12 : x1 - 12}
          y={labelBelow ? y + labelSize + 8 : y - 10}
          textAnchor={labelAlign}
          fill={color}
          fontSize={labelSize}
          fontWeight={700}
          opacity={anim(t, [at + dur * 0.5, at + dur + 0.2])}
          stroke={COLORS.panel}
          strokeWidth={6}
          paintOrder="stroke"
        >
          {label}
        </text>
      ) : null}
      {tag ? (
        <g opacity={anim(t, [at + dur * 0.7, at + dur + 0.1])}>
          <rect x={plotW + 4} y={y - 15} width={100} height={30} rx={5} fill={color} />
          <text x={plotW + 54} y={y + 6} fontSize={17} fontFamily={MONO} fontWeight={700} fill="#0b0e14" textAnchor="middle">
            {p.toFixed(decimals)}
          </text>
        </g>
      ) : null}
    </g>
  );
};

/** Text annotation anchored to a candle index / price. Optional pill background. */
export const ChartText: React.FC<{
  i: number;
  p: number;
  text: string;
  at: number;
  until?: number;
  color?: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  pill?: boolean;
  weight?: number;
  dy?: number;
}> = ({ i, p, text, at, until, color = COLORS.text, size = 26, anchor = "middle", pill, weight = 700, dy = 0 }) => {
  const t = useTime();
  const { xOf, yOf } = useChart();
  const o = fade(t, at, until);
  if (o <= 0) return null;
  const x = xOf(i);
  const y = yOf(p) + dy + anim(t, [at, at + 0.5], [14, 0]);
  if (pill) {
    const w = text.length * size * 0.56 + 36;
    const h = size + 22;
    const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
    return (
      <g opacity={o}>
        <rect x={left} y={y - h / 2} width={w} height={h} rx={h / 2} fill={color} />
        <text
          x={left + w / 2}
          y={y + size * 0.36}
          fill="#0b0e14"
          fontSize={size}
          fontWeight={800}
          textAnchor="middle"
          fontFamily={FONT}
        >
          {text}
        </text>
      </g>
    );
  }
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      opacity={o}
      stroke={COLORS.panel}
      strokeWidth={7}
      paintOrder="stroke"
    >
      {text}
    </text>
  );
};

/** Animated arrow (optionally curved) that draws itself, then shows its head. */
export const Arrow: React.FC<{
  from: [number, number];
  to: [number, number];
  at: number;
  dur?: number;
  color?: string;
  bend?: number;
  width?: number;
  until?: number;
}> = ({ from, to, at, dur = 0.8, color = COLORS.gold, bend = 0, width = 5, until }) => {
  const t = useTime();
  const { xOf, yOf } = useChart();
  const p = anim(t, [at, at + dur]);
  if (p <= 0) return null;
  const out = until === undefined ? 1 : anim(t, [until, until + 0.4], [1, 0]);
  const x0 = xOf(from[0]);
  const y0 = yOf(from[1]);
  const x1 = xOf(to[0]);
  const y1 = yOf(to[1]);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  const angle = Math.atan2(y1 - cy, x1 - cx);
  const head = 20;
  const headOpacity = anim(t, [at + dur * 0.8, at + dur]);
  return (
    <g opacity={out}>
      <path
        d={`M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`}
        stroke={color}
        strokeWidth={width}
        fill="none"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
      />
      <polygon
        opacity={headOpacity}
        fill={color}
        points={`${x1},${y1} ${x1 - head * Math.cos(angle - 0.45)},${y1 - head * Math.sin(angle - 0.45)} ${
          x1 - head * Math.cos(angle + 0.45)
        },${y1 - head * Math.sin(angle + 0.45)}`}
      />
    </g>
  );
};

/** Vertical measuring bracket between two prices (used to show the wick-to-wick gap). */
export const Bracket: React.FC<{
  i: number;
  p1: number;
  p2: number;
  at: number;
  color?: string;
  label?: string;
  until?: number;
}> = ({ i, p1, p2, at, color = COLORS.gold, label, until }) => {
  const t = useTime();
  const { xOf, yOf } = useChart();
  const p = anim(t, [at, at + 0.7]);
  if (p <= 0) return null;
  const out = until === undefined ? 1 : anim(t, [until, until + 0.4], [1, 0]);
  const x = xOf(i);
  const ya = yOf(Math.max(p1, p2));
  const yb = yOf(Math.min(p1, p2));
  const mid = (ya + yb) / 2;
  const h = ((yb - ya) / 2) * p;
  return (
    <g opacity={out}>
      <line x1={x} x2={x} y1={mid - h} y2={mid + h} stroke={color} strokeWidth={3} />
      <line x1={x - 12} x2={x + 12} y1={mid - h} y2={mid - h} stroke={color} strokeWidth={3} />
      <line x1={x - 12} x2={x + 12} y1={mid + h} y2={mid + h} stroke={color} strokeWidth={3} />
      {label ? (
        <text
          x={x + 22}
          y={mid + 9}
          fill={color}
          fontSize={26}
          fontWeight={800}
          opacity={anim(t, [at + 0.5, at + 0.9])}
          stroke={COLORS.panel}
          strokeWidth={6}
          paintOrder="stroke"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

/** Rounded outline around a candle, with a caption above or below. */
export const CandleHighlight: React.FC<{
  i: number;
  hi: number;
  lo: number;
  at: number;
  until?: number;
  label?: string;
  color?: string;
  labelPos?: "top" | "bottom";
}> = ({ i, hi, lo, at, until, label, color = COLORS.gold, labelPos = "top" }) => {
  const t = useTime();
  const { xOf, yOf, slot } = useChart();
  const o = fade(t, at, until);
  if (o <= 0) return null;
  const w = slot * 0.95;
  const pad = 14;
  const x = xOf(i) - w / 2;
  const y0 = yOf(hi) - pad;
  const y1 = yOf(lo) + pad;
  const sc = anim(t, [at, at + 0.45], [1.25, 1]);
  return (
    <g opacity={o}>
      <rect
        x={x}
        y={y0}
        width={w}
        height={y1 - y0}
        rx={12}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeDasharray="8 6"
        style={{ transformBox: "fill-box", transformOrigin: "center", scale: String(sc) }}
      />
      {label ? (
        <text
          x={xOf(i)}
          y={labelPos === "top" ? y0 - 14 : y1 + 34}
          textAnchor="middle"
          fill={color}
          fontSize={26}
          fontWeight={800}
          stroke={COLORS.panel}
          strokeWidth={7}
          paintOrder="stroke"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

/** Numbered badge (1, 2, 3) above / below a candle. */
export const Badge: React.FC<{ i: number; p: number; n: string; at: number; until?: number; color?: string }> = ({
  i,
  p,
  n,
  at,
  until,
  color = COLORS.gold,
}) => {
  const t = useTime();
  const { xOf, yOf } = useChart();
  const o = fade(t, at, until);
  if (o <= 0) return null;
  const r = 20 * anim(t, [at, at + 0.4], [0.4, 1]);
  return (
    <g opacity={o}>
      <circle cx={xOf(i)} cy={yOf(p)} r={r} fill={color} />
      <text x={xOf(i)} y={yOf(p) + 8} textAnchor="middle" fontSize={22} fontWeight={800} fill="#0b0e14">
        {n}
      </text>
    </g>
  );
};

/** Long position tool: green (target) and red (stop) boxes from the entry. */
export const PositionBox: React.FC<{
  i0: number;
  i1: number;
  entry: number;
  sl: number;
  tp: number;
  at: number;
}> = ({ i0, i1, entry, sl, tp, at }) => {
  const t = useTime();
  const { xOf, yOf, decimals } = useChart();
  const p = anim(t, [at, at + 1]);
  if (p <= 0) return null;
  const x0 = xOf(i0);
  const x1 = x0 + (xOf(i1) - x0) * p;
  const yE = yOf(entry);
  const yT = yOf(tp);
  const yS = yOf(sl);
  const rr = Math.abs(tp - entry) / Math.abs(entry - sl);
  const txt = (d: number) => anim(t, [at + 0.6 + d, at + 1.1 + d]);
  const label = (y: number, s: string, c: string, d: number) => (
    <text x={x1 - 16} y={y} textAnchor="end" fill={c} fontSize={24} fontWeight={800} opacity={txt(d)} stroke={COLORS.panel} strokeWidth={6} paintOrder="stroke">
      {s}
    </text>
  );
  return (
    <g>
      <rect x={x0} y={yT} width={x1 - x0} height={yE - yT} fill={COLORS.bull} opacity={0.16} />
      <rect x={x0} y={yE} width={x1 - x0} height={yS - yE} fill={COLORS.bear} opacity={0.16} />
      <line x1={x0} x2={x1} y1={yE} y2={yE} stroke={COLORS.text} strokeWidth={2.5} />
      <line x1={x0} x2={x1} y1={yT} y2={yT} stroke={COLORS.bull} strokeWidth={2.5} />
      <line x1={x0} x2={x1} y1={yS} y2={yS} stroke={COLORS.bear} strokeWidth={2.5} />
      {label(yT + 34, `TP ${tp.toFixed(decimals)}`, COLORS.bull, 0.6)}
      {label(yE - 12, `Entry ${entry.toFixed(decimals)}`, COLORS.text, 0)}
      {label(yS - 14, `SL ${sl.toFixed(decimals)}`, COLORS.bear, 0.3)}
      <g opacity={txt(1)}>
        <rect x={x1 - 186} y={(yT + yE) / 2 - 26} width={170} height={52} rx={12} fill={COLORS.gold} />
        <text x={x1 - 101} y={(yT + yE) / 2 + 9} textAnchor="middle" fontSize={26} fontWeight={800} fill="#0b0e14">
          {`R:R ≈ ${rr.toFixed(1)}`}
        </text>
      </g>
    </g>
  );
};
