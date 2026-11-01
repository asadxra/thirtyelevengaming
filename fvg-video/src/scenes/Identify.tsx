import React from "react";
import { COLORS, EASE_IN_OUT, MONO, anim, useTime } from "../theme";
import { Chart, useChart } from "../components/Chart";
import { CandleSeries } from "../components/Candle";
import { Band, FVGZone } from "../components/FVGZone";
import { ChartText, PriceLine } from "../components/Annotations";
import { SceneFrame } from "../components/SceneFrame";
import { buildTiming, k } from "../candles";

export const IDENTIFY_DURATION = 36;

const DATA = [
  k(100, 100.8, 99.2, 99.6),
  k(99.6, 100.4, 98.8, 100.1),
  k(100.1, 100.9, 99.5, 100.6),
  k(100.6, 101.8, 100.1, 101.4), // 3 C1 (fake)
  k(101.4, 103.6, 101.0, 103.2), // 4 C2 (medium)
  k(103.2, 103.9, 101.3, 101.9), // 5 C3 – low overlaps C1 high
  k(101.9, 102.4, 100.6, 101.0),
  k(101.0, 101.6, 100.2, 101.2),
  k(101.2, 102.2, 100.8, 102.0), // 8 C1
  k(102.0, 107.4, 101.8, 107.0), // 9 C2
  k(107.0, 108.3, 104.1, 107.9), // 10 C3
  k(107.9, 108.8, 106.6, 108.4),
  k(108.4, 109.6, 107.8, 109.2),
];
const TIMING = buildTiming(DATA.length, [{ from: 0, to: 12, start: 0.3, step: 0.32, dur: 0.3 }]);

const STEPS = [
  { title: "Find displacement", body: "A candle with a large, aggressive body", at: 5 },
  { title: "Mark the wicks", body: "Candle 1's wick and Candle 3's wick", at: 10 },
  { title: "Check for overlap", body: "No overlap = valid FVG", at: 16 },
  { title: "Draw the zone", body: "Wick to wick, extended right", at: 28 },
];

/** Sliding 3-candle scanner window. */
const Scanner: React.FC = () => {
  const t = useTime();
  const { xOf, slot, plotH } = useChart();
  const o = Math.min(anim(t, [10, 10.5]), anim(t, [29, 29.5], [1, 0]));
  if (o <= 0) return null;
  const start = 3 + 5 * anim(t, [22, 23.4], [0, 1], EASE_IN_OUT);
  const x0 = xOf(start) - slot * 0.5;
  const w = slot * 3;
  return (
    <g opacity={o}>
      <rect x={x0} y={12} width={w} height={plotH - 24} rx={16} fill="rgba(59,130,246,0.07)" stroke={COLORS.accent} strokeWidth={2.5} strokeDasharray="12 8" />
      {[0, 1, 2].map((n) => (
        <text key={n} x={xOf(start + n)} y={50} fill={COLORS.accent} fontSize={24} fontWeight={800} textAnchor="middle">
          {`C${n + 1}`}
        </text>
      ))}
    </g>
  );
};

export const IdentifyScene: React.FC = () => {
  const t = useTime();
  const glowFor = (i: number) => (t > 6 && t < 10 && (i === 4 || i === 9) ? COLORS.gold : undefined);

  return (
    <SceneFrame id="identify" chapter={5} title="Step-by-Step Identification">
      {/* Checklist */}
      <div style={{ position: "absolute", left: 80, top: 150, width: 560, display: "flex", flexDirection: "column", gap: 20 }}>
        {STEPS.map((st, idx) => {
          const next = STEPS[idx + 1]?.at ?? 999;
          const active = t >= st.at && t < next;
          const done = t >= next;
          const lit = anim(t, [st.at, st.at + 0.4]);
          return (
            <div
              key={st.title}
              style={{
                padding: "24px 26px",
                borderRadius: 18,
                background: active ? "rgba(59,130,246,0.14)" : "rgba(19,23,34,0.92)",
                border: `2px solid ${active ? COLORS.accent : done ? "rgba(46,189,133,0.5)" : COLORS.border}`,
                opacity: 0.45 + 0.55 * lit,
                display: "flex",
                gap: 22,
                alignItems: "center",
                scale: String(active ? anim(t, [st.at, st.at + 0.4], [0.96, 1.02]) : 1),
              }}
            >
              <div
                style={{
                  width: 62,
                  height: 62,
                  flexShrink: 0,
                  borderRadius: 31,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: 30,
                  fontWeight: 700,
                  background: done ? COLORS.bull : active ? COLORS.accent : "#262b3a",
                  color: done || active ? "#0b0e14" : COLORS.muted,
                }}
              >
                {done ? "✓" : idx + 1}
              </div>
              <div>
                <div style={{ fontSize: 34, fontWeight: 800 }}>{st.title}</div>
                <div style={{ fontSize: 25, color: COLORS.muted, marginTop: 4 }}>{st.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Chart x={680} y={150} width={1160} height={720} view={{ i0: -0.8, i1: 13.6, p0: 97.5, p1: 111 }} symbol="LIVE CHART · 5m">
        <FVGZone i0={8} i1={13.4} top={104.1} bottom={102.2} kind="bull" at={29} dur={1.4} label="FVG" />
        <CandleSeries data={DATA} timing={TIMING} glow={glowFor} />
        <Scanner />

        {/* First candidate: wicks overlap */}
        <PriceLine p={101.8} at={11.5} i0={2.6} i1={6.6} color={COLORS.accent} label="C1 high" until={22} tag={false} />
        <PriceLine p={101.3} at={12.8} i0={4.6} i1={6.6} color={COLORS.ce} label="C3 low" labelBelow until={22} tag={false} />
        <Band i0={2.6} i1={6.6} top={101.8} bottom={101.3} color={COLORS.bear} opacity={0.4} at={16.5} until={22} hatch />
        <ChartText i={4} p={106.2} text="✗  Wicks overlap: no FVG" at={18} until={22} pill color={COLORS.bear} size={26} />

        {/* Second candidate: valid */}
        <PriceLine p={102.2} at={23.5} i0={7.6} i1={11.6} color={COLORS.accent} label="C1 high" labelBelow until={29.5} tag={false} />
        <PriceLine p={104.1} at={24.5} i0={9.6} i1={11.6} color={COLORS.ce} label="C3 low" until={29.5} tag={false} />
        <ChartText i={9} p={99} text="✓  Clear gap: valid FVG" at={26} until={35} pill color={COLORS.bull} size={26} />
      </Chart>
    </SceneFrame>
  );
};
