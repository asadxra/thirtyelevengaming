import { AbsoluteFill } from "remotion";
import { COLORS, FONT } from "../theme";

export const Background: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 50% 30%, ${COLORS.bgSoft} 0%, ${COLORS.bg} 70%)`,
      fontFamily: FONT,
      color: COLORS.text,
      padding: "160px 90px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);
