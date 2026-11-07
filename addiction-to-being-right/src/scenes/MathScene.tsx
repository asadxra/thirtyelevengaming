import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { Background } from "./Background";

const ROWS = [
  { loss: 10, gain: 11 },
  { loss: 25, gain: 33 },
  { loss: 50, gain: 100 },
];

const MAX_BAR = 420;

export const MathScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <Background>
      <Interactive.Div
        name="Headline"
        style={{
          fontSize: 88,
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: 30,
          opacity: interpolate(frame, [0, 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        The math doesn't
        <br />
        care about your ego
      </Interactive.Div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          fontSize: 44,
          fontWeight: 800,
          color: COLORS.muted,
          marginBottom: 30,
        }}
      >
        <span style={{ color: COLORS.red }}>YOU LOSE</span>
        <span style={{ color: COLORS.green }}>YOU NEED</span>
      </div>
      {ROWS.map((row, i) => {
        const start = 25 + i * 35;
        const grow = interpolate(frame, [start, start + 25], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        return (
          <div
            key={row.loss}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 50,
              opacity: grow > 0 ? 1 : 0,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ fontSize: 80, fontWeight: 900, color: COLORS.red }}>
                -{Math.round(row.loss * grow)}%
              </div>
              <div
                style={{
                  height: 36,
                  width: (row.loss / 100) * MAX_BAR * grow,
                  backgroundColor: COLORS.red,
                  borderRadius: 18,
                }}
              />
            </div>
            <div style={{ fontSize: 70, color: COLORS.muted }}>→</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ fontSize: 80, fontWeight: 900, color: COLORS.green }}>
                +{Math.round(row.gain * grow)}%
              </div>
              <div
                style={{
                  height: 36,
                  width: (row.gain / 100) * MAX_BAR * grow,
                  backgroundColor: COLORS.green,
                  borderRadius: 18,
                }}
              />
            </div>
          </div>
        );
      })}
      <Interactive.Div
        name="Takeaway"
        style={{
          fontSize: 56,
          fontWeight: 800,
          marginTop: 30,
          opacity: interpolate(frame, [125, 145], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Every “it'll come back”
        <br />
        makes the hole <span style={{ color: COLORS.red }}>deeper</span>.
      </Interactive.Div>
    </Background>
  );
};
