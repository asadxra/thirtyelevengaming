import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { Background } from "./Background";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Background>
      <Interactive.Div
        name="Line1"
        style={{
          fontSize: 66,
          fontWeight: 800,
          color: COLORS.muted,
          opacity: interpolate(frame, [0, 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        The market doesn't
        <br />
        pay you for being <span style={{ textDecoration: "line-through" }}>right</span>.
      </Interactive.Div>
      <Interactive.Div
        name="Line2"
        style={{
          fontSize: 130,
          fontWeight: 900,
          lineHeight: 1.05,
          marginTop: 60,
          color: COLORS.green,
          scale: interpolate(frame, [25, 45], [0.5, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 12 }),
            output: "perceptual-scale",
          }),
          opacity: interpolate(frame, [25, 35], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        It pays you
        <br />
        for surviving.
      </Interactive.Div>
      <Interactive.Div
        name="CTA"
        style={{
          fontSize: 44,
          fontWeight: 600,
          whiteSpace: "nowrap",
          marginTop: 100,
          padding: "24px 48px",
          borderRadius: 999,
          border: `4px solid ${COLORS.gold}`,
          color: COLORS.gold,
          opacity: interpolate(frame, [65, 80], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Follow for more trading psychology
      </Interactive.Div>
    </Background>
  );
};
