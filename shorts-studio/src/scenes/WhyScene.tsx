import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { Background } from "./Background";

export const WhyScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Background>
      <Interactive.Div
        name="Brain"
        style={{
          fontSize: 200,
          marginBottom: 30,
          scale: interpolate(frame, [0, 20, 60, 75, 110, 125], [0.6, 1, 1, 1.08, 1, 1.08], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      >
        🧠
      </Interactive.Div>
      <Interactive.Div
        name="Line1"
        style={{
          fontSize: 84,
          fontWeight: 900,
          lineHeight: 1.1,
          opacity: interpolate(frame, [5, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Being right
        <br />
        <span style={{ color: COLORS.gold }}>feels like a reward.</span>
      </Interactive.Div>
      <Interactive.Div
        name="Line2"
        style={{
          fontSize: 84,
          fontWeight: 900,
          lineHeight: 1.1,
          marginTop: 60,
          opacity: interpolate(frame, [45, 60], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Taking a loss
        <br />
        <span style={{ color: COLORS.red }}>feels like defeat.</span>
      </Interactive.Div>
      <Interactive.Div
        name="Line3"
        style={{
          fontSize: 54,
          fontWeight: 600,
          color: COLORS.muted,
          marginTop: 70,
          opacity: interpolate(frame, [90, 105], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        So you protect your ego…
        <br />
        and sacrifice your account.
      </Interactive.Div>
    </Background>
  );
};
