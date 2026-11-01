import React from "react";
import { COLORS, anim, useTime } from "../theme";
import { Chart } from "../components/Chart";
import { CandleSeries } from "../components/Candle";
import { FVGZone, Kind } from "../components/FVGZone";
import { Arrow, Badge, ChartText } from "../components/Annotations";
import { SceneFrame } from "../components/SceneFrame";
import { buildTiming, k, mirror } from "../candles";

export const COMPARE_DURATION = 24;

const BULL = [
  k(100.6, 101.2, 99.8, 100.4),
  k(100.4, 102.0, 99.9, 101.6), // C1
  k(101.6, 108.0, 101.3, 107.6), // C2
  k(107.6, 109.0, 104.4, 108.6), // C3
  k(108.6, 110.0, 108.0, 109.6),
];
const AXIS = 209;
const TIMING = buildTiming(BULL.length, [
  { from: 0, to: 0, start: 0.3, dur: 0.5 },
  { from: 1, to: 1, start: 1.0, dur: 0.8 },
  { from: 2, to: 2, start: 2.0, dur: 1.6 },
  { from: 3, to: 3, start: 3.8, dur: 0.8 },
  { from: 4, to: 4, start: 4.8, dur: 0.6 },
]);

const MiniFVG: React.FC<{ kind: Kind; x: number }> = ({ kind, x }) => {
  const bull = kind === "bull";
  const P = (p: number) => (bull ? p : AXIS - p);
  const data = bull ? BULL : mirror(BULL, AXIS);
  const color = bull ? COLORS.bull : COLORS.bear;
  return (
    <Chart
      x={x}
      y={150}
      width={860}
      height={470}
      view={bull ? { i0: -0.8, i1: 5.6, p0: 98, p1: 112 } : { i0: -0.8, i1: 5.6, p0: AXIS - 112, p1: AXIS - 98 }}
    >
      <FVGZone i0={1} i1={5.3} top={P(104.4)} bottom={P(102)} kind={kind} at={6} label={bull ? "BULLISH FVG" : "BEARISH FVG"} />
      <CandleSeries data={data} timing={TIMING} />
      <Badge i={1} p={bull ? 103.2 : P(103.2)} n="1" at={1.5} until={6} />
      <Badge i={2} p={bull ? 109.4 : P(109.4)} n="2" at={3.4} until={6} />
      <Badge i={3} p={bull ? 110.4 : P(110.4)} n="3" at={4.4} until={6} />
      <Arrow from={[0, P(103.2)]} to={[0, P(109.4)]} at={9.2} dur={1} color={color} />
      <ChartText i={-0.55} p={P(111.2)} text={bull ? "BULLISH" : "BEARISH"} anchor="start" at={0.2} color={color} size={30} weight={800} />
    </Chart>
  );
};

const ROWS: { label: string; bull: string; bear: string; at: number }[] = [
  { label: "Displacement", bull: "Up ↑", bear: "Down ↓", at: 9 },
  { label: "Gap boundaries", bull: "C1 high → C3 low", bear: "C1 low → C3 high", at: 12 },
  { label: "Acts as", bull: "Support", bear: "Resistance", at: 15 },
  { label: "On a retrace", bull: "Look for buys", bear: "Look for sells", at: 18 },
];

export const CompareScene: React.FC = () => {
  const t = useTime();
  return (
    <SceneFrame id="compare" chapter={4} title="Bullish vs Bearish">
      <MiniFVG kind="bull" x={80} />
      <MiniFVG kind="bear" x={980} />
      <div style={{ position: "absolute", left: 80, top: 640, width: 1760 }}>
        {ROWS.map((r) => {
          const o = anim(t, [r.at, r.at + 0.5]);
          return (
            <div
              key={r.label}
              style={{
                opacity: o,
                translate: `0px ${anim(t, [r.at, r.at + 0.6], [20, 0])}px`,
                display: "grid",
                gridTemplateColumns: "1fr 340px 1fr",
                alignItems: "center",
                height: 56,
                marginBottom: 6,
                borderRadius: 12,
                background: "rgba(19,23,34,0.9)",
                border: `1px solid ${COLORS.border}`,
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              <div style={{ textAlign: "center", color: COLORS.bull }}>{r.bull}</div>
              <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 24, letterSpacing: 2 }}>
                {r.label.toUpperCase()}
              </div>
              <div style={{ textAlign: "center", color: COLORS.bear }}>{r.bear}</div>
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};
