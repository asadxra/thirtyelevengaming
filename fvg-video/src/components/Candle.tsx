import React from "react";
import { CandleData, Timing, candleAt } from "../candles";
import { COLORS, EASE_IN_OUT, anim, useTime } from "../theme";
import { useChart } from "./Chart";

/**
 * One candlestick that "forms" live between `at` and `at + dur` seconds:
 * wicks stretch as price visits the high/low and the body follows the current price.
 */
export const Candle: React.FC<{
  i: number;
  data: CandleData;
  at: number;
  dur?: number;
  /** 0..1 opacity multiplier */
  dim?: number;
  /** Glow colour (used for highlighting a candle) */
  glow?: string;
}> = ({ i, data, at, dur = 0.6, dim = 1, glow }) => {
  const t = useTime();
  const { xOf, yOf, slot } = useChart();
  if (t < at) return null;
  const progress = anim(t, [at, at + dur], [0, 1], EASE_IN_OUT);
  const { cur, hi, lo } = candleAt(data, progress);
  const bull = progress < 0.04 ? data.c >= data.o : cur >= data.o;
  const color = bull ? COLORS.bull : COLORS.bear;
  const x = xOf(i);
  const bodyW = Math.max(4, slot * 0.62);
  const yTop = yOf(Math.max(data.o, cur));
  const yBot = yOf(Math.min(data.o, cur));
  const opacity = anim(t, [at, at + Math.min(0.25, dur)]) * dim;

  return (
    <g opacity={opacity} style={glow ? { filter: `drop-shadow(0 0 14px ${glow})` } : undefined}>
      <line
        x1={x}
        x2={x}
        y1={yOf(hi)}
        y2={yOf(lo)}
        stroke={color}
        strokeWidth={Math.max(2, slot * 0.06)}
        strokeLinecap="round"
      />
      <rect
        x={x - bodyW / 2}
        y={yTop}
        width={bodyW}
        height={Math.max(2, yBot - yTop)}
        fill={color}
        rx={Math.min(4, bodyW * 0.08)}
      />
    </g>
  );
};

/** A list of candles placed at consecutive indices with their own timings. */
export const CandleSeries: React.FC<{
  data: CandleData[];
  timing: Timing[];
  offset?: number;
  dim?: (i: number) => number;
  glow?: (i: number) => string | undefined;
}> = ({ data, timing, offset = 0, dim, glow }) => (
  <>
    {data.map((d, idx) => (
      <Candle
        key={idx}
        i={idx + offset}
        data={d}
        at={timing[idx][0]}
        dur={timing[idx][1]}
        dim={dim ? dim(idx) : 1}
        glow={glow ? glow(idx) : undefined}
      />
    ))}
  </>
);
