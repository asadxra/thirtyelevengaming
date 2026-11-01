import React, { createContext, useContext } from "react";
import { COLORS, MONO, FONT } from "../theme";

export type View = { i0: number; i1: number; p0: number; p1: number };

type ChartCtx = {
  xOf: (i: number) => number;
  yOf: (p: number) => number;
  /** Pixels per candle slot */
  slot: number;
  plotW: number;
  plotH: number;
  view: View;
  decimals: number;
};

const Ctx = createContext<ChartCtx | null>(null);

export const useChart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("Chart components must be rendered inside <Chart>");
  return c;
};

export const AXIS_W = 110;

const niceStep = (range: number, target = 6) => {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return step * mag;
};

/** Linear blend between two views – used for smooth camera moves. */
export const lerpView = (a: View, b: View, p: number): View => ({
  i0: a.i0 + (b.i0 - a.i0) * p,
  i1: a.i1 + (b.i1 - a.i1) * p,
  p0: a.p0 + (b.p0 - a.p0) * p,
  p1: a.p1 + (b.p1 - a.p1) * p,
});

/**
 * A TradingView-style chart panel. Children are SVG elements that use `useChart()`
 * to convert candle index / price into pixels, so the camera (view) can be animated.
 */
export const Chart: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  view: View;
  decimals?: number;
  showAxis?: boolean;
  gridEvery?: number;
  symbol?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({
  x,
  y,
  width,
  height,
  view,
  decimals = 1,
  showAxis = true,
  gridEvery = 5,
  symbol,
  style,
  children,
}) => {
  const plotW = showAxis ? width - AXIS_W : width;
  const plotH = height;
  const xOf = (i: number) => ((i - view.i0) / (view.i1 - view.i0)) * plotW;
  const yOf = (p: number) => ((view.p1 - p) / (view.p1 - view.p0)) * plotH;
  const slot = plotW / (view.i1 - view.i0);

  const step = niceStep(view.p1 - view.p0);
  const ticks: number[] = [];
  for (let p = Math.ceil(view.p0 / step) * step; p <= view.p1; p += step) {
    const py = ((view.p1 - p) / (view.p1 - view.p0)) * plotH;
    if (py > 16 && py < plotH - 16) ticks.push(p);
  }
  const vlines: number[] = [];
  for (let i = Math.ceil(view.i0 / gridEvery) * gridEvery; i <= view.i1; i += gridEvery) vlines.push(i);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        borderRadius: 18,
        overflow: "hidden",
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        ...style,
      }}
    >
      <svg width={width} height={height} style={{ display: "block", fontFamily: FONT }}>
        {ticks.map((p) => (
          <line key={`h${p}`} x1={0} x2={plotW} y1={yOf(p)} y2={yOf(p)} stroke={COLORS.grid} strokeWidth={1} />
        ))}
        {vlines.map((i) => (
          <line key={`v${i}`} x1={xOf(i)} x2={xOf(i)} y1={0} y2={plotH} stroke={COLORS.grid} strokeWidth={1} />
        ))}
        {showAxis ? (
          <>
            <rect x={plotW} y={0} width={AXIS_W} height={plotH} fill={COLORS.axisBg} />
            <line x1={plotW} x2={plotW} y1={0} y2={plotH} stroke={COLORS.border} />
            {ticks.map((p) => (
              <text
                key={`t${p}`}
                x={plotW + AXIS_W / 2}
                y={yOf(p) + 6}
                fill={COLORS.muted}
                fontSize={17}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {p.toFixed(decimals)}
              </text>
            ))}
          </>
        ) : null}
        {symbol ? (
          <text x={22} y={38} fill={COLORS.muted} fontSize={20} fontWeight={600} opacity={0.8}>
            {symbol}
          </text>
        ) : null}
        <Ctx.Provider value={{ xOf, yOf, slot, plotW, plotH, view, decimals }}>{children}</Ctx.Provider>
      </svg>
    </div>
  );
};
