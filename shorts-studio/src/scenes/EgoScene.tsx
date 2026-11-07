import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";
import { Background } from "./Background";

const Bubble: React.FC<{
  label: string;
  quote: string;
  color: string;
  start: number;
  fromLeft: boolean;
}> = ({ label, quote, color, start, fromLeft }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name={label}
      style={{
        width: "100%",
        padding: "50px 60px",
        borderRadius: 40,
        border: `6px solid ${color}`,
        backgroundColor: `${color}1a`,
        marginBottom: 60,
        textAlign: fromLeft ? "left" : "right",
        opacity: interpolate(frame, [start, start + 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(
          frame,
          [start, start + 20],
          [fromLeft ? "-200px 0px" : "200px 0px", "0px 0px"],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        ),
      }}
    >
      <div style={{ fontSize: 44, fontWeight: 800, color, marginBottom: 16 }}>
        {label}
      </div>
      <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.1 }}>
        {quote}
      </div>
    </Interactive.Div>
  );
};

export const EgoScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Background>
      <Bubble
        label="YOUR STOP SAYS"
        quote="“Get out.”"
        color={COLORS.red}
        start={5}
        fromLeft
      />
      <Bubble
        label="YOUR EGO SAYS"
        quote="“It'll come back.”"
        color={COLORS.gold}
        start={35}
        fromLeft={false}
      />
      <Interactive.Div
        name="Consequence"
        style={{
          fontSize: 64,
          fontWeight: 800,
          marginTop: 40,
          lineHeight: 1.2,
          opacity: interpolate(frame, [75, 95], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        So you move the stop.
        <br />
        <span style={{ color: COLORS.muted }}>Average down.</span>
        <br />
        <span style={{ color: COLORS.red }}>And hope.</span>
      </Interactive.Div>
    </Background>
  );
};
