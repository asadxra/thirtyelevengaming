import React from "react";
import { Sequence } from "remotion";
import { COLORS, MONO, anim, s, useTime } from "../theme";
import { Chart } from "../components/Chart";
import { CandleSeries } from "../components/Candle";
import { Band, FVGZone } from "../components/FVGZone";
import { ChartText, PriceLine } from "../components/Annotations";
import { SceneFrame } from "../components/SceneFrame";
import { buildTiming, k } from "../candles";

export const MISTAKES_DURATION = 40;
const EACH = 10;

const MINI = { x: 80, y: 150, width: 900, height: 720 };

/** Mistake 1 – wicks overlap */
const OverlapChart: React.FC = () => {
  const data = [k(100.6, 101.8, 100.1, 101.4), k(101.4, 103.6, 101.0, 103.2), k(103.2, 103.9, 101.3, 101.9)];
  const timing = buildTiming(3, [
    { from: 0, to: 0, start: 0.3, dur: 0.5 },
    { from: 1, to: 1, start: 0.9, dur: 1 },
    { from: 2, to: 2, start: 2.0, dur: 0.8 },
  ]);
  return (
    <Chart {...MINI} view={{ i0: -1, i1: 3.6, p0: 99.4, p1: 104.8 }} decimals={2}>
      <CandleSeries data={data} timing={timing} />
      <PriceLine p={101.8} at={3} i0={-0.4} i1={3.2} color={COLORS.accent} label="C1 high" />
      <PriceLine p={101.3} at={3.6} i0={1.6} i1={3.2} color={COLORS.ce} label="C3 low" labelBelow />
      <Band i0={-0.4} i1={3.2} top={101.8} bottom={101.3} color={COLORS.bear} opacity={0.4} at={4.5} hatch />
      <ChartText i={1} p={104.3} text="✗  Overlap: not an FVG" at={5.5} pill color={COLORS.bear} size={28} />
    </Chart>
  );
};

/** Mistake 2 – counter-trend FVG */
const ContextChart: React.FC = () => {
  const data = [
    k(112, 112.4, 110.6, 110.9),
    k(110.9, 111.2, 108.8, 109.1),
    k(109.1, 109.4, 107.6, 107.9),
    k(107.9, 108.3, 107.2, 108.0),
    k(108.0, 110.2, 107.8, 110.0),
    k(110.0, 110.6, 109.0, 109.3),
    k(109.3, 109.6, 106.4, 106.8),
    k(106.8, 107.1, 104.2, 104.5),
    k(104.5, 104.9, 102.6, 103.0),
  ];
  const timing = buildTiming(data.length, [
    { from: 0, to: 5, start: 0.2, step: 0.5, dur: 0.45 },
    { from: 6, to: 8, start: 4.5, step: 0.9, dur: 0.8 },
  ]);
  return (
    <Chart {...MINI} view={{ i0: -1, i1: 9.4, p0: 101.5, p1: 113.5 }}>
      <FVGZone i0={3} i1={9} top={109} bottom={108.3} kind="bull" at={3.3} label="FVG" dimAt={5.2} />
      <CandleSeries data={data} timing={timing} />
      <ChartText i={2} p={103} text="Strong downtrend" at={1} color={COLORS.bear} size={28} />
      <ChartText i={6} p={112.4} text="✗  Counter-trend FVG fails" at={6.8} pill color={COLORS.bear} size={28} />
    </Chart>
  );
};

/** Mistake 3 – stop inside the zone */
const StopChart: React.FC = () => {
  const data = [
    k(100, 101, 99.4, 100.6),
    k(100.6, 102, 100.2, 101.6),
    k(101.6, 107.6, 101.3, 107.2),
    k(107.2, 108.2, 105, 107.8),
    k(107.8, 108.1, 105.6, 106),
    k(106, 106.3, 102.6, 104.8),
    k(104.8, 108.4, 104.5, 108),
    k(108, 111, 107.6, 110.6),
  ];
  const timing = buildTiming(data.length, [
    { from: 0, to: 3, start: 0.2, step: 0.55, dur: 0.5 },
    { from: 4, to: 4, start: 4.2, dur: 0.7 },
    { from: 5, to: 5, start: 5.0, dur: 1.6 },
    { from: 6, to: 7, start: 7.0, step: 0.8, dur: 0.7 },
  ]);
  return (
    <Chart {...MINI} view={{ i0: -1, i1: 8.6, p0: 98.5, p1: 112.5 }}>
      <FVGZone i0={1} i1={8.4} top={105} bottom={102} kind="bull" at={2.4} />
      <CandleSeries data={data} timing={timing} />
      <PriceLine p={105} at={3} i0={3} i1={8.4} color={COLORS.text} label="Entry" />
      <PriceLine p={103.5} at={3.5} i0={3} i1={8.4} color={COLORS.bear} label="Stop inside zone" labelBelow />
      <ChartText i={5} p={100.6} text="✗  Stopped out" at={6.4} pill color={COLORS.bear} size={28} />
      <ChartText i={3.5} p={111.2} text="…then price rallies without you" at={8.4} color={COLORS.muted} size={26} />
    </Chart>
  );
};

/** Mistake 4 – fully mitigated zone */
const UsedZoneChart: React.FC = () => {
  const data = [
    k(101, 102, 100.6, 101.8),
    k(101.8, 104, 101.5, 103.6),
    k(103.6, 109, 103.3, 108.6),
    k(108.6, 109.6, 106, 109.2),
    k(109.2, 109.5, 105.2, 105.6),
    k(105.6, 105.9, 102.6, 103.0),
    k(103, 107.4, 102.8, 107.0),
    k(107, 107.3, 104.6, 104.9),
    k(104.9, 105.2, 101.4, 101.7),
  ];
  const timing = buildTiming(data.length, [
    { from: 0, to: 3, start: 0.2, step: 0.5, dur: 0.45 },
    { from: 4, to: 5, start: 3.4, step: 0.8, dur: 0.8 },
    { from: 6, to: 8, start: 6.2, step: 0.8, dur: 0.7 },
  ]);
  return (
    <Chart {...MINI} view={{ i0: -1, i1: 9.4, p0: 99.5, p1: 111 }}>
      <FVGZone i0={1} i1={9} top={106} bottom={104} kind="bull" at={2.2} dimAt={5} />
      <CandleSeries data={data} timing={timing} />
      <ChartText i={5.5} p={110} text="Fully mitigated" at={5.4} color={COLORS.gold} size={28} />
      <ChartText i={6} p={100.4} text="✗  Buying a used-up zone" at={8.6} pill color={COLORS.bear} size={28} />
    </Chart>
  );
};

const MISTAKES = [
  { title: "Marking overlapping wicks", wrong: "Candle 1 and Candle 3 wicks touch, so no imbalance exists.", fix: "Only true wick-to-wick space counts.", Chart: OverlapChart },
  { title: "Ignoring market context", wrong: "Buying a small bullish FVG inside a strong downtrend.", fix: "Trade FVGs with structure, ideally after a liquidity sweep and MSS.", Chart: ContextChart },
  { title: "Stop-loss inside the zone", wrong: "Price often wicks deep into the FVG and takes the stop.", fix: "Place the stop beyond the sweep or protective swing low.", Chart: StopChart },
  { title: "Trading mitigated FVGs", wrong: "The gap was already filled: there is no imbalance left.", fix: "Favour fresh, unmitigated FVGs.", Chart: UsedZoneChart },
];

const MistakePanel: React.FC<{ n: number; title: string; wrong: string; fix: string }> = ({ n, title, wrong, fix }) => {
  const t = useTime();
  const o = Math.min(anim(t, [0, 0.5]), anim(t, [EACH - 0.5, EACH], [1, 0]));
  const item = (at: number): React.CSSProperties => ({
    opacity: anim(t, [at, at + 0.5]),
    translate: `${anim(t, [at, at + 0.6], [30, 0])}px 0px`,
  });
  return (
    <div style={{ position: "absolute", left: 1040, top: 170, width: 800, opacity: o }}>
      <div style={{ ...item(0.1), fontFamily: MONO, color: COLORS.bear, fontSize: 28, fontWeight: 700, letterSpacing: 4 }}>
        {`MISTAKE ${n} / 4`}
      </div>
      <div style={{ ...item(0.3), fontSize: 60, fontWeight: 800, lineHeight: 1.1, marginTop: 10 }}>{title}</div>
      <div
        style={{
          ...item(1.5),
          marginTop: 40,
          padding: "22px 26px",
          borderRadius: 16,
          background: "rgba(246,70,93,0.1)",
          border: `2px solid ${COLORS.bear}`,
          fontSize: 32,
          lineHeight: 1.35,
        }}
      >
        <span style={{ color: COLORS.bear, fontWeight: 800 }}>✗ </span>
        {wrong}
      </div>
      <div
        style={{
          ...item(5),
          marginTop: 22,
          padding: "22px 26px",
          borderRadius: 16,
          background: "rgba(46,189,133,0.1)",
          border: `2px solid ${COLORS.bull}`,
          fontSize: 32,
          lineHeight: 1.35,
        }}
      >
        <span style={{ color: COLORS.bull, fontWeight: 800 }}>✓ Fix: </span>
        {fix}
      </div>
    </div>
  );
};

const MistakeFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useTime();
  return <div style={{ opacity: Math.min(anim(t, [0, 0.5]), anim(t, [EACH - 0.5, EACH], [1, 0])) }}>{children}</div>;
};

export const MistakesScene: React.FC = () => (
  <SceneFrame id="mistakes" chapter={8} title="Common Mistakes" accent={COLORS.bear}>
    {MISTAKES.map((m, idx) => (
      <Sequence key={m.title} from={s(idx * EACH)} durationInFrames={s(EACH)} name={`Mistake ${idx + 1}`}>
        <MistakeFade>
          <m.Chart />
        </MistakeFade>
        <MistakePanel n={idx + 1} title={m.title} wrong={m.wrong} fix={m.fix} />
      </Sequence>
    ))}
  </SceneFrame>
);
