import React from "react";
import { CHART_RECT, COLORS, EASE_IN_OUT, anim, useTime } from "../theme";
import { Chart, lerpView } from "../components/Chart";
import { CandleSeries } from "../components/Candle";
import { FVGZone } from "../components/FVGZone";
import { Arrow, Bracket, CandleHighlight, ChartText, PriceLine } from "../components/Annotations";
import { SceneFrame } from "../components/SceneFrame";
import { buildTiming, k } from "../candles";

export const ANATOMY_DURATION = 30;

const DATA = [
  k(100.6, 101.4, 99.6, 100.2),
  k(100.2, 101.0, 99.4, 100.8),
  k(100.8, 101.6, 100.0, 101.0),
  k(101.0, 103.5, 100.4, 102.8), // Candle 1
  k(102.8, 111.0, 102.4, 110.5), // Candle 2 – displacement
  k(110.5, 112.0, 106.5, 111.4), // Candle 3
];
const TIMING = buildTiming(DATA.length, [
  { from: 0, to: 2, start: 0.4, step: 0.6, dur: 0.5 },
  { from: 3, to: 3, start: 4, dur: 1.5 },
  { from: 4, to: 4, start: 7, dur: 2.8 },
  { from: 5, to: 5, start: 11, dur: 1.6 },
]);

const WIDE = { i0: -1, i1: 9, p0: 97, p1: 114 };
const ZOOM = { i0: 1.2, i1: 7.6, p0: 99, p1: 113.5 };

export const AnatomyScene: React.FC = () => {
  const t = useTime();
  const view = lerpView(WIDE, ZOOM, anim(t, [14, 16], [0, 1], EASE_IN_OUT));

  return (
    <SceneFrame id="anatomy" chapter={1} title="Anatomy of an FVG">
      <Chart {...CHART_RECT} view={view} symbol="EXAMPLE · 15m">
        <FVGZone i0={3} i1={7.4} top={106.5} bottom={103.5} kind="bull" at={20.5} dur={1.2} label="FAIR VALUE GAP" labelPos="top" />
        <CandleSeries data={DATA} timing={TIMING} dim={(i) => (i < 3 ? 0.45 : 1)} />

        <CandleHighlight i={3} hi={103.5} lo={100.4} at={5} until={14} label="Candle 1" labelPos="bottom" />
        <CandleHighlight i={4} hi={111} lo={102.4} at={9.6} until={14} label="Candle 2" />
        <CandleHighlight i={5} hi={112} lo={106.5} at={12.4} until={14} label="Candle 3" labelPos="bottom" />
        <Arrow from={[5.6, 102.8]} to={[5.6, 110.2]} at={8} dur={1.4} until={14} />
        <ChartText i={5.85} p={106.2} text="Displacement" anchor="start" at={8.6} until={14} color={COLORS.gold} />

        <PriceLine p={103.5} at={15} i0={3} i1={7.4} color={COLORS.accent} label="Candle 1 high" labelBelow labelAlign="end" />
        <PriceLine p={106.5} at={16.5} i0={5} i1={7.4} color={COLORS.accent} label="Candle 3 low" labelAlign="end" />
        <Bracket i={6.4} p1={103.5} p2={106.5} at={18} label="Gap" until={24.5} />
        <ChartText i={2.4} p={109.5} text="Inefficient price" at={25} pill color={COLORS.gold} size={28} />
        <ChartText i={4} p={100} text="Only buyers traded here" at={26} size={26} color={COLORS.muted} />
        <ChartText i={2.2} p={112.5} text="Wick-to-wick" at={18.5} until={24.5} color={COLORS.accent} size={28} />
      </Chart>
    </SceneFrame>
  );
};
