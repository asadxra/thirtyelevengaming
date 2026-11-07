import React, { createContext, useContext } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { beats, fadeUp, pop, progress, slideIn } from "./anim";
import { fit } from "./fit";
import type { Line, SceneContent, Tone } from "./types";

export const tone = (t?: Tone) => COLORS[t ?? "text"];

/** Entrance times (seconds, scene-local) from timeline.ts: when the narrator says each element. */
export const AtContext = createContext<Record<string, number>>({});
const useAt = () => {
  const at = useContext(AtContext);
  const { fps } = useVideoConfig();
  return (key: string, fallback: number) => (at[key] !== undefined ? Math.round(at[key] * fps) : fallback);
};

const Lines: React.FC<{
  lines: Line[];
  starts: number[];
  size: number;
  weight?: number;
}> = ({ lines, starts, size, weight = 900 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontSize: fit(l.text, size, 22),
            fontWeight: weight,
            lineHeight: 1.1,
            color: tone(l.color),
            textWrap: "balance",
            ...fadeUp(frame, starts[i] ?? 0),
          }}
        >
          {l.text}
        </div>
      ))}
    </>
  );
};

const TitleView: React.FC<Extract<SceneContent, { type: "title" }>> = (s) => {
  const frame = useCurrentFrame();
  const A = useAt();
  const parts =
    s.highlight && s.title.includes(s.highlight)
      ? s.title.split(s.highlight)
      : null;
  return (
    <>
      {s.icon ? (
        <div style={{ fontSize: 200, lineHeight: 1, color: COLORS.gold, ...pop(frame, A("icon", 0)) }}>
          {s.icon}
        </div>
      ) : null}
      <div
        style={{
          fontSize: fit(s.title, 112, 24),
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: -2,
          textTransform: "uppercase",
          textWrap: "balance",
          ...fadeUp(frame, A("title", 10)),
        }}
      >
        {parts ? (
          <>
            {parts[0]}
            <span style={{ color: COLORS.gold }}>{s.highlight}</span>
            {parts.slice(1).join(s.highlight)}
          </>
        ) : (
          s.title
        )}
      </div>
      {s.subtitle ? (
        <div
          style={{
            fontSize: fit(s.subtitle, 48, 60),
            fontWeight: 500,
            color: COLORS.muted,
            textWrap: "balance",
            ...fadeUp(frame, A("subtitle", 30), 30),
          }}
        >
          {s.subtitle}
        </div>
      ) : null}
    </>
  );
};

const StatementView: React.FC<Extract<SceneContent, { type: "statement" }>> = (s) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const A = useAt();
  const fb = beats(s.lines.length, durationInFrames, s.icon ? 10 : 4);
  const starts = s.lines.map((_, i) => A(`line${i}`, fb[i]));
  return (
    <>
      {s.icon ? (
        <div style={{ fontSize: 170, lineHeight: 1, ...pop(frame, A("icon", 0)) }}>{s.icon}</div>
      ) : null}
      <Lines lines={s.lines} starts={starts} size={84} />
    </>
  );
};

const CHART_W = 860;
const CHART_H = 320;

const ChartView: React.FC<Extract<SceneContent, { type: "chart" }>> = (s) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const down = s.trend === "down";
  // A fixed, readable shape: small move in your favour, then the trend takes over
  const shape = down
    ? [50, 54, 58, 55, 60, 56, 51, 47, 43, 45, 39, 34, 37, 29, 24, 20]
    : [50, 47, 44, 48, 45, 50, 54, 52, 58, 62, 59, 66, 70, 68, 75, 80];
  const level = down ? 40 : 66;
  const toY = (p: number) => CHART_H - (p / 90) * CHART_H;
  const toX = (i: number) => (i / (shape.length - 1)) * CHART_W;
  const A = useAt();
  const end = A("result", Math.round(durationInFrames * 0.7));
  const t = progress(frame, A("draw", 12), end) * (shape.length - 1);
  const whole = Math.floor(t);
  const pts = shape.slice(0, whole + 1).map((p, i) => [toX(i), toY(p)]);
  if (whole < shape.length - 1) {
    const a = shape[whole];
    const b = shape[whole + 1];
    pts.push([toX(t), toY(a + (b - a) * (t - whole))]);
  }
  const last = pts[pts.length - 1];
  const lineColor = down ? COLORS.red : COLORS.green;
  const crossed = frame >= end + 4;
  return (
    <>
      <Lines lines={s.headline} starts={s.headline.map((_, i) => A(`head${i}`, i * 8))} size={68} weight={800} />
      <svg width={CHART_W} height={CHART_H} style={{ overflow: "visible", maxWidth: "100%" }}>
        <line x1={0} x2={CHART_W} y1={toY(50)} y2={toY(50)} stroke={COLORS.muted} strokeWidth={3} strokeDasharray="12 12" />
        <text x={0} y={toY(50) - 14} fill={COLORS.muted} fontSize={30}>ENTRY</text>
        <line x1={0} x2={CHART_W} y1={toY(level)} y2={toY(level)} stroke={lineColor} strokeWidth={4} strokeDasharray="12 12" />
        <text x={0} y={toY(level) + (down ? 44 : -14)} fill={lineColor} fontSize={30}>
          {s.levelLabel ?? (down ? "STOP LOSS" : "TARGET")}
        </text>
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={lineColor} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r={14} fill={COLORS.text} />
      </svg>
      {s.result ? (
        <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, color: lineColor, ...pop(frame, end) }}>
          {s.result}
        </div>
      ) : null}
      {s.resultNote ? (
        <div style={{ fontSize: 48, fontWeight: 800, color: lineColor, opacity: crossed ? 1 : 0 }}>
          {s.resultNote}
        </div>
      ) : null}
    </>
  );
};

const Bubble: React.FC<{ label: string; quote: string; color: string; start: number; fromLeft: boolean }> = ({
  label,
  quote,
  color,
  start,
  fromLeft,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: "100%",
        padding: "40px 52px",
        borderRadius: 36,
        border: `6px solid ${color}`,
        backgroundColor: `${color}1a`,
        textAlign: fromLeft ? "left" : "right",
        ...slideIn(frame, start, fromLeft),
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 800, color, marginBottom: 12, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: fit(quote, 72, 20), fontWeight: 900, lineHeight: 1.1 }}>“{quote}”</div>
    </div>
  );
};

const VersusView: React.FC<Extract<SceneContent, { type: "versus" }>> = (s) => {
  const { durationInFrames } = useVideoConfig();
  const A = useAt();
  const fb = beats(3, durationInFrames);
  const a = A("a", fb[0]);
  const b = A("b", fb[1]);
  return (
    <>
      <Bubble label={s.a.label} quote={s.a.quote} color={tone(s.a.color ?? "red")} start={a} fromLeft />
      <Bubble label={s.b.label} quote={s.b.quote} color={tone(s.b.color ?? "gold")} start={b} fromLeft={false} />
      {s.footer ? (
        <Lines lines={s.footer} starts={s.footer.map((_, i) => A(`foot${i}`, fb[2] + i * 8))} size={60} weight={800} />
      ) : null}
    </>
  );
};

const BarsView: React.FC<Extract<SceneContent, { type: "bars" }>> = (s) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const max = Math.max(...s.rows.flatMap((r) => [r.left, r.right]), 1);
  const A = useAt();
  const fb = beats(s.rows.length + 1, durationInFrames, 14);
  const head = A("head", 0);
  const starts = [...s.rows.map((_, i) => A(`row${i}`, fb[i])), A("foot", fb[s.rows.length])];
  const suffix = s.suffix ?? "%";
  return (
    <>
      <div style={{ fontSize: fit(s.headline, 80, 34), fontWeight: 900, lineHeight: 1.1, textWrap: "balance", ...fadeUp(frame, head) }}>
        {s.headline}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 40, fontWeight: 800, ...fadeUp(frame, head + 8, 20) }}>
        <span style={{ color: COLORS.red }}>{s.leftLabel}</span>
        <span style={{ color: COLORS.green }}>{s.rightLabel}</span>
      </div>
      {s.rows.map((r, i) => {
        const g = progress(frame, starts[i], starts[i] + 24);
        return (
          <div key={i} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", opacity: g > 0 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
              <div style={{ fontSize: 76, fontWeight: 900, color: COLORS.red }}>
                {s.leftPrefix ?? "-"}{Math.round(r.left * g)}{suffix}
              </div>
              <div style={{ height: 32, width: (r.left / max) * 400 * g, backgroundColor: COLORS.red, borderRadius: 16 }} />
            </div>
            <div style={{ fontSize: 64, color: COLORS.muted }}>→</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={{ fontSize: 76, fontWeight: 900, color: COLORS.green }}>
                {s.rightPrefix ?? "+"}{Math.round(r.right * g)}{suffix}
              </div>
              <div style={{ height: 32, width: (r.right / max) * 400 * g, backgroundColor: COLORS.green, borderRadius: 16 }} />
            </div>
          </div>
        );
      })}
      {s.footer ? (
        <div style={{ fontSize: fit(s.footer, 52, 40), fontWeight: 800, textWrap: "balance", ...fadeUp(frame, starts[s.rows.length]) }}>
          {s.footer}
        </div>
      ) : null}
    </>
  );
};

const ListView: React.FC<Extract<SceneContent, { type: "list" }>> = (s) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const A = useAt();
  const fb = beats(s.items.length, durationInFrames, 16);
  const starts = s.items.map((_, i) => A(`item${i}`, fb[i]));
  return (
    <>
      <div style={{ fontSize: fit(s.headline, 92, 20), fontWeight: 900, color: COLORS.green, ...fadeUp(frame, A("head", 0)) }}>
        {s.headline}
      </div>
      {s.items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 36, width: "100%", textAlign: "left", ...fadeUp(frame, starts[i]) }}>
          <div
            style={{
              flexShrink: 0,
              width: 104,
              height: 104,
              borderRadius: 52,
              backgroundColor: COLORS.green,
              color: COLORS.bg,
              fontSize: 56,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {i + 1}
          </div>
          <div style={{ fontSize: fit(item, 58, 32), fontWeight: 800, lineHeight: 1.15 }}>{item}</div>
        </div>
      ))}
    </>
  );
};

const OutroView: React.FC<Extract<SceneContent, { type: "outro" }>> = (s) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const A = useAt();
  const fb = beats(3, durationInFrames);
  const [a, b, c] = [A("lead", fb[0]), A("punch", fb[1]), A("cta", fb[2])];
  return (
    <>
      <div style={{ fontSize: fit(s.lead, 64, 40), fontWeight: 800, color: COLORS.muted, textWrap: "balance", ...fadeUp(frame, a) }}>
        {s.lead}
      </div>
      <div style={{ fontSize: fit(s.punch, 120, 22), fontWeight: 900, lineHeight: 1.05, color: COLORS.green, textWrap: "balance", ...pop(frame, b) }}>
        {s.punch}
      </div>
      {s.cta ? (
        <div
          style={{
            fontSize: 42,
            fontWeight: 600,
            padding: "22px 44px",
            borderRadius: 999,
            border: `4px solid ${COLORS.gold}`,
            color: COLORS.gold,
            opacity: interpolate(frame, [c, c + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {s.cta}
        </div>
      ) : null}
    </>
  );
};

export const SceneView: React.FC<{ scene: SceneContent }> = ({ scene }) => {
  switch (scene.type) {
    case "title":
      return <TitleView {...scene} />;
    case "statement":
      return <StatementView {...scene} />;
    case "chart":
      return <ChartView {...scene} />;
    case "versus":
      return <VersusView {...scene} />;
    case "bars":
      return <BarsView {...scene} />;
    case "list":
      return <ListView {...scene} />;
    case "outro":
      return <OutroView {...scene} />;
  }
};
