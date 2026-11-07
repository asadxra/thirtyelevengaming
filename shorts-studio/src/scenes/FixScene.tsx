import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { Background } from "./Background";

const RULES = [
  "Set your stop before you enter",
  "Never move it further away",
  "A small loss is a good trade",
];

export const FixScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Background>
      <Interactive.Div
        name="Headline"
        style={{
          fontSize: 96,
          fontWeight: 900,
          marginBottom: 80,
          color: COLORS.green,
          opacity: interpolate(frame, [0, 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        The fix
      </Interactive.Div>
      {RULES.map((rule, i) => {
        const start = 20 + i * 35;
        return (
          <Interactive.Div
            key={rule}
            name={`Rule ${i + 1}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 40,
              width: "100%",
              textAlign: "left",
              marginBottom: 60,
              opacity: interpolate(frame, [start, start + 15], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(frame, [start, start + 20], ["0px 80px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: COLORS.green,
                color: COLORS.bg,
                fontSize: 64,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.15 }}>
              {rule}
            </div>
          </Interactive.Div>
        );
      })}
    </Background>
  );
};
