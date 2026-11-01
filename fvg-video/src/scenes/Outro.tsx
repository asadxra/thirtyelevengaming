import React from "react";
import { COLORS, MONO, anim, useTime } from "../theme";
import { SceneFrame } from "../components/SceneFrame";

export const OUTRO_DURATION = 14;

const POINTS = [
  { icon: "3", text: "Three candles: the gap sits between Candle 1's and Candle 3's wicks", color: COLORS.gold },
  { icon: "▲▼", text: "Bullish FVG acts as support, bearish FVG as resistance", color: COLORS.bull },
  { icon: "50%", text: "Watch Consequent Encroachment and track mitigation", color: COLORS.ce },
  { icon: "→", text: "Context first: sweep → MSS → displacement → FVG → entry", color: COLORS.accent },
];

export const OutroScene: React.FC = () => {
  const t = useTime();
  return (
    <SceneFrame id="outro">
      <div style={{ position: "absolute", left: 200, right: 200, top: 70 }}>
        <div style={{ fontFamily: MONO, color: COLORS.gold, fontSize: 28, letterSpacing: 6, fontWeight: 700, opacity: anim(t, [0, 0.6]) }}>
          KEY TAKEAWAYS
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, marginTop: 4, opacity: anim(t, [0.2, 0.9]) }}>Fair Value Gaps, in one minute</div>
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 16 }}>
          {POINTS.map((p, idx) => {
            const at = 1 + idx * 1.6;
            return (
              <div
                key={p.text}
                style={{
                  opacity: anim(t, [at, at + 0.5]),
                  translate: `${anim(t, [at, at + 0.6], [-40, 0])}px 0px`,
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  padding: "18px 30px",
                  borderRadius: 18,
                  background: "rgba(19,23,34,0.92)",
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    minWidth: 96,
                    height: 72,
                    borderRadius: 14,
                    background: p.color,
                    color: "#0b0e14",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: 30,
                  }}
                >
                  {p.icon}
                </div>
                <div style={{ fontSize: 38, fontWeight: 600 }}>{p.text}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 28, fontSize: 44, fontWeight: 800, color: COLORS.bull, opacity: anim(t, [8.5, 9.3]) }}>
          Now go find them on your charts.
        </div>
      </div>
    </SceneFrame>
  );
};
