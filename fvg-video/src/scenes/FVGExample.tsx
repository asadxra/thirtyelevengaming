import React from "react";
import { CHART_RECT, COLORS, EASE_IN_OUT, anim, useTime } from "../theme";
import { Chart, View, lerpView } from "../components/Chart";
import { CandleSeries } from "../components/Candle";
import { FVGZone, Kind } from "../components/FVGZone";
import { Arrow, Badge, Bracket, ChartText, PriceLine } from "../components/Annotations";
import { Card, SceneFrame } from "../components/SceneFrame";
import { buildTiming, k, mirror } from "../candles";

export const FVG_EXAMPLE_DURATION = 36;

/** Bullish sequence. The bearish chapter mirrors it around MIRROR_AXIS. */
const BULL = [
  k(100, 101.2, 99.4, 100.8),
  k(100.8, 101.5, 99.9, 100.2),
  k(100.2, 101.0, 99.6, 100.9),
  k(100.9, 102.0, 100.5, 101.7), // 3 Candle 1
  k(101.7, 108.6, 101.4, 108.2), // 4 Candle 2
  k(108.2, 110.4, 104.6, 109.8), // 5 Candle 3
  k(109.8, 111.6, 109.0, 111.0),
  k(111.0, 112.2, 110.1, 110.6),
  k(110.6, 111.0, 108.4, 108.9),
  k(108.9, 109.3, 106.6, 107.0),
  k(107.0, 107.6, 104.9, 105.3),
  k(105.3, 105.8, 103.0, 103.6), // 11 enters the FVG
  k(103.6, 106.4, 103.2, 106.0), // reaction
  k(106.0, 109.5, 105.6, 109.1),
  k(109.1, 112.8, 108.7, 112.4),
  k(112.4, 115.0, 111.9, 114.6),
  k(114.6, 116.2, 113.5, 115.8),
];
const MIRROR_AXIS = 215;

const TIMING = buildTiming(BULL.length, [
  { from: 0, to: 2, start: 0.4, step: 0.6, dur: 0.5 },
  { from: 3, to: 3, start: 3, dur: 1.0 },
  { from: 4, to: 4, start: 4.1, dur: 2.0 },
  { from: 5, to: 5, start: 6.3, dur: 1.0 },
  { from: 6, to: 10, start: 16.5, step: 1.2, dur: 1.0 },
  { from: 11, to: 11, start: 22.5, dur: 1.4 },
  { from: 12, to: 16, start: 25, step: 1.0, dur: 0.9 },
]);

const C1_EDGE = 102.0; // Candle 1 high
const C3_EDGE = 104.6; // Candle 3 low

export const FVGExampleScene: React.FC<{ kind: Kind }> = ({ kind }) => {
  const t = useTime();
  const bull = kind === "bull";
  // P() maps a bullish price into this chapter's price space.
  const P = (p: number) => (bull ? p : MIRROR_AXIS - p);
  const V = (v: View): View => (bull ? v : { ...v, p0: MIRROR_AXIS - v.p1, p1: MIRROR_AXIS - v.p0 });
  const data = bull ? BULL : mirror(BULL, MIRROR_AXIS);
  const color = bull ? COLORS.bull : COLORS.bear;

  const view = lerpView(
    V({ i0: -1, i1: 11, p0: 97, p1: 114 }),
    V({ i0: -1, i1: 18, p0: 97, p1: 119 }),
    anim(t, [16, 18.5], [0, 1], EASE_IN_OUT),
  );

  // Badge sits outside each candle: above highs for bullish, below lows for bearish
  const badgeP = (d: (typeof data)[number]) => (bull ? d.h + 1.2 : d.l - 1.2);

  return (
    <SceneFrame
      id={bull ? "bullish" : "bearish"}
      chapter={bull ? 2 : 3}
      title={bull ? "Bullish Fair Value Gap" : "Bearish Fair Value Gap"}
      accent={color}
    >
      <Chart {...CHART_RECT} view={view} symbol={bull ? "BULLISH EXAMPLE · 15m" : "BEARISH EXAMPLE · 15m"}>
        <FVGZone
          i0={3}
          i1={17.5}
          top={P(C3_EDGE)}
          bottom={P(C1_EDGE)}
          kind={kind}
          at={13}
          dur={1.4}
          label={bull ? "BULLISH FVG" : "BEARISH FVG"}
          pulseAt={23.4}
        />
        <CandleSeries data={data} timing={TIMING} dim={(i) => (i < 3 ? 0.5 : 1)} />

        <Badge i={3} p={badgeP(data[3])} n="1" at={3.6} until={13} />
        <Badge i={4} p={badgeP(data[4])} n="2" at={5.5} until={13} />
        <Badge i={5} p={badgeP(data[5])} n="3" at={7.0} until={13} />
        <ChartText
          i={4}
          p={P(98.2)}
          text={bull ? "Bullish displacement" : "Bearish displacement"}
          at={5.2}
          until={13}
          color={COLORS.gold}
        />

        <PriceLine
          p={P(C1_EDGE)}
          at={8.2}
          i0={3}
          i1={8}
          color={color}
          label={bull ? "Candle 1 high" : "Candle 1 low"}
          labelAlign="end"
          labelBelow={bull}
          until={13.6}
        />
        <PriceLine
          p={P(C3_EDGE)}
          at={9.6}
          i0={5}
          i1={8}
          color={color}
          label={bull ? "Candle 3 low" : "Candle 3 high"}
          labelAlign="end"
          labelBelow={!bull}
          until={13.6}
        />
        <Bracket i={7.2} p1={P(C1_EDGE)} p2={P(C3_EDGE)} at={10.8} label="Gap" until={13.6} />

        <ChartText
          i={11}
          p={P(100.6)}
          text="Price returns to the FVG"
          at={23.6}
          until={31}
          pill
          color={COLORS.gold}
          size={26}
        />
        <Arrow
          from={[12.3, P(102.6)]}
          to={[17.2, P(113.2)]}
          at={25.5}
          dur={2.8}
          color={color}
          bend={bull ? 70 : -70}
        />
        <ChartText
          i={13.4}
          p={P(114.5)}
          text={bull ? "Support → reaction" : "Resistance → reaction"}
          at={27.5}
          color={color}
          size={28}
          anchor="end"
        />
      </Chart>

      <Card x={CHART_RECT.x + 40} y={bull ? 210 : 690} at={31.6} color={color} w={760}>
        <div style={{ fontSize: 24, color: COLORS.muted, letterSpacing: 2, fontWeight: 700 }}>
          {bull ? "BULLISH FVG" : "BEARISH FVG"}
        </div>
        <div style={{ marginTop: 6 }}>
          {bull ? "Candle 1 high → Candle 3 low" : "Candle 1 low → Candle 3 high"}
        </div>
        <div style={{ marginTop: 4, color }}>{bull ? "Expected to act as support" : "Expected to act as resistance"}</div>
      </Card>
    </SceneFrame>
  );
};

export const BullishScene: React.FC = () => <FVGExampleScene kind="bull" />;
export const BearishScene: React.FC = () => <FVGExampleScene kind="bear" />;
