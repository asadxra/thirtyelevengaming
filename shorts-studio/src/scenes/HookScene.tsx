import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { Background } from "./Background";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <Background>
      <Interactive.Div
        name="Checkmark"
        style={{
          fontSize: 260,
          lineHeight: 1,
          color: COLORS.gold,
          marginBottom: 40,
          scale: interpolate(frame, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 12 }),
            output: "perceptual-scale",
          }),
          rotate: interpolate(frame, [0, 20], ["-30deg", "0deg"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 12 }),
          }),
        }}
      >
        ✔
      </Interactive.Div>
      <Interactive.Div
        name="Title"
        style={{
          fontSize: 120,
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: -2,
          opacity: interpolate(frame, [12, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: interpolate(frame, [12, 30], ["0px 60px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        THE ADDICTION
        <br />
        TO BEING <span style={{ color: COLORS.gold }}>RIGHT</span>
      </Interactive.Div>
      <Interactive.Div
        name="Subtitle"
        style={{
          fontSize: 52,
          fontWeight: 500,
          color: COLORS.muted,
          marginTop: 60,
          opacity: interpolate(frame, [40, 60], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Why traders would rather be right
        <br />
        than protect their capital
      </Interactive.Div>
    </Background>
  );
};
