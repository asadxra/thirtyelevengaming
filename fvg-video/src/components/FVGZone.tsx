import React from "react";
import { COLORS, anim, useTime } from "../theme";
import { useChart } from "./Chart";

export type Kind = "bull" | "bear";

export const zoneColors = (kind: Kind) =>
  kind === "bull"
    ? { line: COLORS.bull, fill: COLORS.bullZone }
    : { line: COLORS.bear, fill: COLORS.bearZone };

/**
 * Translucent Fair Value Gap rectangle. Draws in from the left edge (Candle 1)
 * towards the right edge, then optionally pulses or dims (when mitigated).
 */
export const FVGZone: React.FC<{
  i0: number;
  i1: number;
  top: number;
  bottom: number;
  kind: Kind;
  at: number;
  dur?: number;
  label?: string;
  dimAt?: number;
  pulseAt?: number;
  until?: number;
  labelPos?: "center" | "top";
}> = ({ i0, i1, top, bottom, kind, at, dur = 0.9, label, dimAt, pulseAt, until, labelPos = "center" }) => {
  const t = useTime();
  const { xOf, yOf, slot } = useChart();
  const p = anim(t, [at, at + dur]);
  if (p <= 0) return null;
  const { line, fill } = zoneColors(kind);
  const x0 = xOf(i0) - slot * 0.35;
  const x1 = x0 + (xOf(i1) - x0) * p;
  const y0 = yOf(Math.max(top, bottom));
  const y1 = yOf(Math.min(top, bottom));
  const dim = dimAt === undefined ? 1 : anim(t, [dimAt, dimAt + 0.8], [1, 0.35]);
  const out = until === undefined ? 1 : anim(t, [until, until + 0.5], [1, 0]);
  const pulse =
    pulseAt === undefined
      ? 0
      : Math.sin(Math.PI * anim(t, [pulseAt, pulseAt + 1.4], [0, 3], (n) => n)) ** 2 *
        (t < pulseAt + 1.4 && t > pulseAt ? 1 : 0);

  return (
    <g opacity={dim * out}>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={fill} />
      {pulse > 0 ? (
        <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={line} opacity={pulse * 0.25} />
      ) : null}
      <line x1={x0} x2={x1} y1={y0} y2={y0} stroke={line} strokeWidth={2} opacity={0.9} />
      <line x1={x0} x2={x1} y1={y1} y2={y1} stroke={line} strokeWidth={2} opacity={0.9} />
      <line x1={x0} x2={x0} y1={y0} y2={y1} stroke={line} strokeWidth={2} opacity={0.9} />
      {label ? (
        <text
          x={x1 - 14}
          y={labelPos === "top" ? y0 + 32 : y0 + (y1 - y0) / 2 + 9}
          fill={line}
          fontSize={26}
          fontWeight={800}
          textAnchor="end"
          letterSpacing={1}
          opacity={anim(t, [at + dur * 0.6, at + dur + 0.3]) * (dimAt === undefined ? 1 : anim(t, [dimAt, dimAt + 0.5], [1, 0]))}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

/** Plain shaded price band (e.g. the overlap between two wicks). */
export const Band: React.FC<{
  i0: number;
  i1: number;
  top: number;
  bottom: number;
  color: string;
  opacity?: number;
  at: number;
  until?: number;
  hatch?: boolean;
}> = ({ i0, i1, top, bottom, color, opacity = 0.35, at, until, hatch }) => {
  const t = useTime();
  const { xOf, yOf } = useChart();
  const p = anim(t, [at, at + 0.6]);
  const out = until === undefined ? 1 : anim(t, [until, until + 0.4], [1, 0]);
  if (p <= 0) return null;
  const x0 = xOf(i0);
  const x1 = x0 + (xOf(i1) - x0) * p;
  const y0 = yOf(Math.max(top, bottom));
  const y1 = yOf(Math.min(top, bottom));
  const id = `hatch-${Math.round(top * 100)}-${Math.round(i0 * 10)}`;
  return (
    <g opacity={out}>
      {hatch ? (
        <defs>
          <pattern id={id} width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={12} stroke={color} strokeWidth={4} opacity={0.7} />
          </pattern>
        </defs>
      ) : null}
      <rect x={x0} y={y0} width={x1 - x0} height={Math.max(3, y1 - y0)} fill={color} opacity={opacity} />
      {hatch ? <rect x={x0} y={y0} width={x1 - x0} height={Math.max(3, y1 - y0)} fill={`url(#${id})`} /> : null}
    </g>
  );
};
