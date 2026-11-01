import React from "react";
import { CHART_RECT, COLORS, EASE_IN_OUT, anim, useTime } from "../theme";
import { Chart, lerpView } from "../components/Chart";
import { CandleSeries } from "../components/Candle";
import { FVGZone } from "../components/FVGZone";
import { Arrow, ChartText, PositionBox, PriceLine } from "../components/Annotations";
import { SceneFrame } from "../components/SceneFrame";
import { buildTiming, k } from "../candles";

export const SCENARIO_DURATION = 48;

const DATA = [
  k(114.2, 115.0, 112.8, 113.1), // 0 old high = buy-side liquidity
  k(113.1, 113.4, 110.6, 111.0),
  k(111.0, 111.4, 108.4, 108.8),
  k(108.8, 109.0, 105.0, 105.6), // 3 low #1
  k(105.6, 108.8, 105.3, 108.3), // 4 swing high
  k(108.3, 108.6, 106.9, 107.2),
  k(107.2, 107.5, 105.05, 105.6), // 6 low #2 (equal lows)
  k(105.6, 106.9, 105.3, 106.6),
  k(106.6, 107.3, 105.9, 106.2),
  k(106.2, 106.4, 104.4, 105.8), // 9 liquidity sweep
  k(105.8, 107.0, 105.4, 106.8), // 10 C1
  k(106.8, 111.2, 106.5, 110.8), // 11 C2 displacement + MSS
  k(110.8, 112.0, 108.4, 111.5), // 12 C3
  k(111.5, 112.4, 110.6, 111.0),
  k(111.0, 111.3, 109.3, 109.6),
  k(109.6, 109.9, 107.65, 108.1), // 15 retrace into FVG CE
  k(108.1, 110.6, 107.9, 110.3),
  k(110.3, 112.6, 109.9, 112.3),
  k(112.3, 114.2, 111.8, 113.9),
  k(113.9, 115.6, 113.4, 115.2), // 19 target
];
const TIMING = buildTiming(DATA.length, [
  { from: 0, to: 8, start: 0.3, step: 0.55, dur: 0.5 },
  { from: 9, to: 9, start: 11, dur: 2.4 },
  { from: 10, to: 10, start: 17, dur: 0.8 },
  { from: 11, to: 11, start: 18, dur: 2.4 },
  { from: 12, to: 12, start: 21, dur: 1 },
  { from: 13, to: 14, start: 27, step: 1.2, dur: 1 },
  { from: 15, to: 15, start: 29.4, dur: 2 },
  { from: 16, to: 19, start: 39, step: 1.1, dur: 1 },
]);

const FVG_TOP = 108.4;
const FVG_BOTTOM = 107.0;
const ENTRY = 107.7;
const SL = 104.1;
const TP = 115.0;

export const ScenarioScene: React.FC = () => {
  const t = useTime();
  const view = lerpView(
    { i0: -1, i1: 13, p0: 102.5, p1: 117 },
    { i0: -1, i1: 24.5, p0: 102, p1: 117.5 },
    anim(t, [14.5, 17], [0, 1], EASE_IN_OUT),
  );

  return (
    <SceneFrame id="scenario" chapter={7} title="Realistic Trading Example">
      <Chart {...CHART_RECT} view={view} symbol="SETUP · 5m">
        <PositionBox i0={15.5} i1={24} entry={ENTRY} sl={SL} tp={TP} at={33.2} />
        <FVGZone i0={10} i1={24} top={FVG_TOP} bottom={FVG_BOTTOM} kind="bull" at={23} dur={1.2} label="BULLISH FVG" dimAt={33.2} />
        <PriceLine p={ENTRY} at={24.2} i0={10} i1={24} color={COLORS.ce} label="CE 50%" until={33} labelBelow labelAlign="end" tag={false} />

        <PriceLine p={TP} at={8} i0={0} i1={24} color={COLORS.accent} label="Buy-side liquidity (old high)" until={33} />
        <PriceLine p={105.0} at={6} i0={2.6} i1={12} color={COLORS.gold} label="Sell-side liquidity (equal lows)" labelBelow until={14.5} />
        <ChartText i={4.5} p={103.4} text="$  $  $" at={7} until={14.5} color={COLORS.gold} size={30} />

        <CandleSeries data={DATA} timing={TIMING} glow={(i) => (i === 11 && t > 20 && t < 27 ? COLORS.gold : undefined)} />

        <Arrow from={[11.4, 103.2]} to={[9.25, 104.3]} at={13.4} dur={0.8} until={17} color={COLORS.gold} bend={-30} />
        <ChartText i={11.6} p={103.1} text="Liquidity sweep" anchor="start" at={13.4} until={17} color={COLORS.gold} size={28} />

        <PriceLine p={108.8} at={15.4} i0={4} i1={13} color={COLORS.text} label="Swing high" until={27} tag={false} />
        <ChartText i={8.5} p={110.3} text="MSS" at={20.3} until={27} pill color={COLORS.gold} size={28} />
        <ChartText i={11} p={112.9} text="Displacement" at={20.6} until={27} color={COLORS.gold} size={26} />

        <ChartText i={15} p={105.8} text="Wait for the retrace…" at={27.4} until={33} color={COLORS.muted} size={26} />
        <ChartText i={19} p={116.6} text="Target reached ✓" at={43.6} pill color={COLORS.bull} size={28} />
      </Chart>
    </SceneFrame>
  );
};
