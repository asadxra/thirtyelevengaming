import React from "react";
import { COLORS, MONO, anim, useTime } from "../theme";
import { Chart } from "../components/Chart";
import { CandleSeries } from "../components/Candle";
import { FVGZone } from "../components/FVGZone";
import { ChartText, PriceLine } from "../components/Annotations";
import { SceneFrame } from "../components/SceneFrame";
import { buildTiming, extremeSoFar, k } from "../candles";

export const MITIGATION_DURATION = 40;

const TOP = 106; // Candle 3 low
const BOTTOM = 102; // Candle 1 high
const CE = (TOP + BOTTOM) / 2;

const DATA = [
  k(98, 99.2, 97.4, 98.8),
  k(98.8, 100.2, 98.3, 99.6),
  k(99.6, 102.0, 99.2, 101.5), // 2 C1
  k(101.5, 109.5, 101.2, 109.0), // 3 C2
  k(109.0, 111.0, 106.0, 110.4), // 4 C3
  k(110.4, 112.6, 109.8, 112.0),
  k(112.0, 112.4, 108.6, 109.0),
  k(109.0, 109.4, 105.2, 106.8), // 7 partial
  k(106.8, 110.6, 106.4, 110.1),
  k(110.1, 111.2, 107.0, 107.4),
  k(107.4, 107.8, 104.0, 105.6), // 10 CE
  k(105.6, 109.8, 105.2, 109.3),
  k(109.3, 110.0, 106.2, 106.6),
  k(106.6, 107.0, 101.6, 102.4), // 13 full
  k(102.4, 103.0, 99.8, 100.5),
];
const TIMING = buildTiming(DATA.length, [
  { from: 0, to: 5, start: 0.3, step: 0.7, dur: 0.6 },
  { from: 6, to: 6, start: 9, dur: 1 },
  { from: 7, to: 7, start: 10.2, dur: 2.2 },
  { from: 8, to: 9, start: 16.5, step: 1.1, dur: 0.9 },
  { from: 10, to: 10, start: 18.8, dur: 2.2 },
  { from: 11, to: 11, start: 23.5, dur: 1 },
  { from: 12, to: 12, start: 26.3, dur: 0.9 },
  { from: 13, to: 13, start: 27.4, dur: 2.8 },
  { from: 14, to: 14, start: 31.5, dur: 1 },
]);

/** Live gauge showing how much of the FVG has been filled. */
const MitigationGauge: React.FC<{ fill: number }> = ({ fill }) => {
  const t = useTime();
  const pct = Math.round(fill * 100);
  const status =
    fill >= 0.999 ? "Fully mitigated" : fill >= 0.5 ? "CE reached" : fill > 0 ? "Partially mitigated" : "Untested";
  const statusColor = fill >= 0.999 ? COLORS.bear : fill >= 0.5 ? COLORS.ce : fill > 0 ? COLORS.gold : COLORS.muted;
  const H = 440;
  return (
    <div
      style={{
        position: "absolute",
        left: 1580,
        top: 150,
        width: 260,
        height: 720,
        borderRadius: 18,
        background: "rgba(19,23,34,0.95)",
        border: `1px solid ${COLORS.border}`,
        opacity: anim(t, [4.4, 5]),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 28,
      }}
    >
      <div style={{ fontSize: 22, letterSpacing: 3, color: COLORS.muted, fontWeight: 700 }}>FVG FILLED</div>
      <div style={{ fontFamily: MONO, fontSize: 64, fontWeight: 700, color: statusColor, marginTop: 6 }}>{pct}%</div>
      <div style={{ position: "relative", width: 110, height: H, marginTop: 14, borderRadius: 12, background: COLORS.bullZone, border: `2px solid ${COLORS.bull}`, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: H * fill, background: "rgba(246,180,1,0.55)" }} />
        <div style={{ position: "absolute", left: -2, right: -2, top: H / 2, borderTop: `3px dashed ${COLORS.ce}` }} />
      </div>
      <div style={{ position: "absolute", top: 156 + H / 2 - 14, right: 14, fontSize: 18, color: COLORS.ce, fontWeight: 800 }}>CE</div>
      <div style={{ marginTop: 18, fontSize: 25, fontWeight: 800, color: statusColor, textAlign: "center" }}>{status}</div>
    </div>
  );
};

export const MitigationScene: React.FC = () => {
  const t = useTime();
  const low = extremeSoFar(DATA, TIMING, t, 5, DATA.length - 1, "low");
  const fill = low === null ? 0 : Math.max(0, Math.min(1, (TOP - low) / (TOP - BOTTOM)));

  return (
    <SceneFrame id="mitigation" chapter={6} title="Mitigation & Consequent Encroachment">
      <Chart x={80} y={150} width={1470} height={720} view={{ i0: -0.8, i1: 15.6, p0: 96.5, p1: 114 }} symbol="BULLISH FVG · 15m">
        <FVGZone i0={2} i1={15.4} top={TOP} bottom={BOTTOM} kind="bull" at={4.4} label="FVG" dimAt={30.4} labelPos="top" />
        <PriceLine p={CE} at={5.5} i0={2} i1={15.4} color={COLORS.ce} label="CE · 50%" width={3} labelAlign="end" />
        <CandleSeries data={DATA} timing={TIMING} />

        <ChartText i={7} p={100.6} text="Partial mitigation" at={12.6} until={16} pill color={COLORS.gold} size={26} />
        <ChartText i={10} p={100.6} text="Consequent Encroachment (50%)" at={21} until={26} pill color={COLORS.ce} size={26} />
        <ChartText i={10.6} p={98.3} text="Fully mitigated: imbalance rebalanced" at={30.6} pill color={COLORS.bear} size={26} />
      </Chart>
      <MitigationGauge fill={fill} />
    </SceneFrame>
  );
};
