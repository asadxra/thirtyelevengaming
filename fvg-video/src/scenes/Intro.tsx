import React from "react";
import { CHART_RECT, COLORS, MONO, WIDTH, anim, fade, useTime } from "../theme";
import { Chart } from "../components/Chart";
import { CandleSeries } from "../components/Candle";
import { FVGZone } from "../components/FVGZone";
import { Bracket, ChartText } from "../components/Annotations";
import { SceneFrame } from "../components/SceneFrame";
import { buildTiming, k, randomWalk } from "../candles";

export const INTRO_DURATION = 24;

const BG = randomWalk(90, 100, 7, 0.08);
const BG_TIMING = buildTiming(BG.length, [{ from: 0, to: BG.length - 1, start: -10, step: 0 }]);

const THREE = [k(100, 102, 99.2, 101.6), k(101.6, 108.4, 101.3, 108), k(108, 109.6, 104.5, 109.2)];
const THREE_TIMING = buildTiming(3, [
  { from: 0, to: 0, start: 3.5, dur: 0.9 },
  { from: 1, to: 1, start: 4.6, dur: 1.6 },
  { from: 2, to: 2, start: 6.4, dur: 0.9 },
]);

export const CHAPTERS = [
  "Anatomy of an FVG",
  "Bullish FVG",
  "Bearish FVG",
  "Bullish vs Bearish",
  "Step-by-step identification",
  "Mitigation & CE",
  "Realistic trading example",
  "Common mistakes",
  "Knowledge test",
];

export const IntroScene: React.FC = () => {
  const t = useTime();
  const pan = t * 0.7;
  const titleUp = anim(t, [14, 15.2]);
  const chartO = fade(t, 2.8, 14);

  return (
    <SceneFrame id="intro">
      {/* Slowly panning background market */}
      <Chart
        x={0}
        y={0}
        width={WIDTH}
        height={1080}
        showAxis={false}
        view={{ i0: 10 + pan, i1: 70 + pan, p0: 85, p1: 140 }}
        style={{ opacity: 0.18, borderRadius: 0, border: "none", background: "transparent", boxShadow: "none" }}
      >
        <CandleSeries data={BG} timing={BG_TIMING} />
      </Chart>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 120 - titleUp * 50,
          textAlign: "center",
          scale: String(anim(t, [0, 1.2], [0.9, 1]) * (1 - titleUp * 0.25)),
          opacity: anim(t, [0, 1]),
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 26,
            letterSpacing: 8,
            color: COLORS.gold,
            fontWeight: 700,
            opacity: anim(t, [0.6, 1.4]),
          }}
        >
          SMART MONEY CONCEPTS · LESSON
        </div>
        <div
          style={{
            fontSize: 130,
            fontWeight: 800,
            letterSpacing: anim(t, [0, 1.6], [24, -2]),
            lineHeight: 1.05,
            background: `linear-gradient(90deg, ${COLORS.bull}, #e6e9f0 50%, ${COLORS.bear})`,
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Fair Value Gaps
        </div>
        <div style={{ fontSize: 36, color: COLORS.muted, fontWeight: 500, opacity: anim(t, [1.2, 2]) }}>
          The complete animated guide to FVGs
        </div>
      </div>

      {/* Three-candle preview */}
      <div style={{ opacity: chartO }}>
        <Chart
          x={CHART_RECT.x + 480}
          y={420}
          width={800}
          height={420}
          view={{ i0: -1, i1: 3.2, p0: 97.5, p1: 111 }}
        >
          <FVGZone i0={0} i1={2.9} top={104.5} bottom={102} kind="bull" at={8.5} />
          <CandleSeries data={THREE} timing={THREE_TIMING} />
          <Bracket i={2.65} p1={102} p2={104.5} at={9.2} label="Gap" />
          <ChartText i={0.6} p={110} text="Fair Value Gap" at={11} pill color={COLORS.bull} size={30} />
        </Chart>
      </div>

      {/* Agenda */}
      <div
        style={{
          position: "absolute",
          left: 160,
          right: 160,
          top: 360,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 26,
        }}
      >
        {CHAPTERS.map((c, idx) => {
          const at = 15.3 + idx * 0.28;
          return (
            <div
              key={c}
              style={{
                opacity: anim(t, [at, at + 0.5]),
                translate: `0px ${anim(t, [at, at + 0.6], [30, 0])}px`,
                background: "rgba(19,23,34,0.92)",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 18,
                padding: "26px 30px",
                display: "flex",
                alignItems: "center",
                gap: 22,
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: COLORS.gold }}>
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div style={{ fontSize: 34, fontWeight: 700 }}>{c}</div>
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};
