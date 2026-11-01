import React from "react";
import { Sequence } from "remotion";
import { COLORS, MONO, anim, s, useTime } from "../theme";
import { Chart } from "../components/Chart";
import { CandleSeries } from "../components/Candle";
import { Band, FVGZone } from "../components/FVGZone";
import { Badge, ChartText, PriceLine } from "../components/Annotations";
import { SceneFrame } from "../components/SceneFrame";
import { buildTiming, k } from "../candles";

export const QUIZ_DURATION = 45;
const EACH = 15;
const REVEAL = 10;
const MINI = { x: 80, y: 150, width: 900, height: 720 };

const Q1Chart: React.FC = () => {
  const data = [k(100.6, 101.2, 99.8, 100.4), k(100.4, 102.0, 99.9, 101.6), k(101.6, 108.0, 101.3, 107.6), k(107.6, 109.0, 104.4, 108.6)];
  const timing = buildTiming(4, [{ from: 0, to: 3, start: 0.3, step: 0.8, dur: 0.7 }]);
  return (
    <Chart {...MINI} view={{ i0: -0.8, i1: 4.2, p0: 98.5, p1: 111 }}>
      <FVGZone i0={1} i1={4} top={104.4} bottom={102} kind="bull" at={REVEAL + 0.2} label="FVG" />
      <CandleSeries data={data} timing={timing} />
      <Badge i={1} p={103.2} n="1" at={3.4} />
      <Badge i={2} p={109.4} n="2" at={3.6} />
      <Badge i={3} p={110.2} n="3" at={3.8} />
    </Chart>
  );
};

const Q2Chart: React.FC = () => {
  const data = [k(100.6, 101.8, 100.1, 101.4), k(101.4, 103.6, 101.0, 103.2), k(103.2, 103.9, 101.3, 101.9)];
  const timing = buildTiming(3, [{ from: 0, to: 2, start: 0.3, step: 0.8, dur: 0.7 }]);
  return (
    <Chart {...MINI} view={{ i0: -1, i1: 3.4, p0: 99.4, p1: 104.8 }} decimals={2}>
      <CandleSeries data={data} timing={timing} />
      <Badge i={0} p={102.3} n="1" at={3} />
      <Badge i={2} p={104.4} n="3" at={3.2} />
      <Band i0={-0.4} i1={3} top={101.8} bottom={101.3} color={COLORS.bear} opacity={0.45} at={REVEAL + 0.2} hatch />
      <ChartText i={1} p={100.2} text="Overlap" at={REVEAL + 0.6} pill color={COLORS.bear} size={28} />
    </Chart>
  );
};

const Q3Chart: React.FC = () => {
  const data = [
    k(98.8, 100.2, 98.3, 99.6),
    k(99.6, 102, 99.2, 101.5),
    k(101.5, 109.5, 101.2, 109),
    k(109, 111, 106, 110.4),
    k(110.4, 110.8, 107.4, 107.8),
    k(107.8, 108.1, 104.0, 105.2),
  ];
  const timing = buildTiming(data.length, [
    { from: 0, to: 4, start: 0.3, step: 0.5, dur: 0.45 },
    { from: 5, to: 5, start: 2.8, dur: 1.6 },
  ]);
  return (
    <Chart {...MINI} view={{ i0: -0.8, i1: 6.4, p0: 97, p1: 112.5 }}>
      <FVGZone i0={1} i1={6.2} top={106} bottom={102} kind="bull" at={0.3 + 1.6} />
      <CandleSeries data={data} timing={timing} />
      <ChartText i={5} p={103.2} text="?" at={4.6} until={REVEAL} pill color={COLORS.gold} size={30} />
      <PriceLine p={104} at={REVEAL + 0.2} i0={1} i1={6.2} color={COLORS.ce} label="CE · 50%" width={3} labelAlign="end" />
    </Chart>
  );
};

const QUESTIONS = [
  {
    q: "Where does this bullish FVG begin and end?",
    options: ["Candle 1 low → Candle 3 high", "Candle 1 high → Candle 3 low", "Candle 2 open → Candle 2 close"],
    correct: 1,
    why: "A bullish FVG spans from Candle 1's high to Candle 3's low.",
    Chart: Q1Chart,
  },
  {
    q: "Is this a valid Fair Value Gap?",
    options: ["Yes: Candle 2 is a big bullish candle", "No: Candle 1 and Candle 3 wicks overlap"],
    correct: 1,
    why: "No gap between the wicks means no imbalance, and no FVG.",
    Chart: Q2Chart,
  },
  {
    q: "Price just tagged the exact middle of the gap. What is this level called?",
    options: ["Full mitigation", "Consequent Encroachment (50%)", "Liquidity sweep"],
    correct: 1,
    why: "The 50% midpoint of an FVG is its Consequent Encroachment.",
    Chart: Q3Chart,
  },
];

const Question: React.FC<{ n: number; q: string; options: string[]; correct: number; why: string }> = ({ n, q, options, correct, why }) => {
  const t = useTime();
  const o = Math.min(anim(t, [0, 0.5]), anim(t, [EACH - 0.5, EACH], [1, 0]));
  const revealed = t >= REVEAL;
  const countdown = anim(t, [5, REVEAL], [1, 0], (x) => x);
  const secondsLeft = Math.ceil(countdown * 5);
  const R = 46;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ position: "absolute", left: 1040, top: 160, width: 800, opacity: o }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: MONO, color: COLORS.gold, fontSize: 28, fontWeight: 700, letterSpacing: 4 }}>{`QUESTION ${n} / 3`}</div>
        <div style={{ position: "relative", width: 110, height: 110, opacity: anim(t, [4.6, 5]) * (revealed ? anim(t, [REVEAL, REVEAL + 0.4], [1, 0]) : 1) }}>
          <svg width={110} height={110}>
            <circle cx={55} cy={55} r={R} stroke="#262b3a" strokeWidth={8} fill="none" />
            <circle
              cx={55}
              cy={55}
              r={R}
              stroke={COLORS.gold}
              strokeWidth={8}
              fill="none"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - countdown)}
              transform="rotate(-90 55 55)"
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 40, fontWeight: 700 }}>
            {secondsLeft}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.15, marginTop: 8, opacity: anim(t, [0.2, 0.8]) }}>{q}</div>
      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 18 }}>
        {options.map((opt, idx) => {
          const at = 2 + idx * 0.5;
          const isCorrect = idx === correct;
          const rv = anim(t, [REVEAL, REVEAL + 0.5]);
          const border = revealed ? (isCorrect ? COLORS.bull : COLORS.border) : COLORS.border;
          return (
            <div
              key={opt}
              style={{
                opacity: anim(t, [at, at + 0.4]) * (revealed && !isCorrect ? 1 - 0.55 * rv : 1),
                translate: `${anim(t, [at, at + 0.5], [30, 0])}px 0px`,
                scale: String(revealed && isCorrect ? 1 + 0.03 * rv : 1),
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "20px 24px",
                borderRadius: 16,
                background: revealed && isCorrect ? "rgba(46,189,133,0.16)" : "rgba(19,23,34,0.92)",
                border: `2px solid ${border}`,
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontWeight: 700,
                  background: revealed && isCorrect ? COLORS.bull : "#262b3a",
                  color: revealed && isCorrect ? "#0b0e14" : COLORS.text,
                }}
              >
                {revealed && isCorrect ? "✓" : String.fromCharCode(65 + idx)}
              </div>
              {opt}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 28, fontSize: 30, color: COLORS.bull, fontWeight: 600, opacity: anim(t, [REVEAL + 0.8, REVEAL + 1.3]) }}>{why}</div>
    </div>
  );
};

const Fade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useTime();
  return <div style={{ opacity: Math.min(anim(t, [0, 0.5]), anim(t, [EACH - 0.5, EACH], [1, 0])) }}>{children}</div>;
};

export const QuizScene: React.FC = () => (
  <SceneFrame id="quiz" chapter={9} title="Knowledge Test" accent={COLORS.gold}>
    {QUESTIONS.map((q, idx) => (
      <Sequence key={q.q} from={s(idx * EACH)} durationInFrames={s(EACH)} name={`Question ${idx + 1}`}>
        <Fade>
          <q.Chart />
        </Fade>
        <Question n={idx + 1} q={q.q} options={q.options} correct={q.correct} why={q.why} />
      </Sequence>
    ))}
  </SceneFrame>
);
