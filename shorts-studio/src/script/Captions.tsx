import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

/** Word-by-word captions in the Shorts safe band (above y=1330). */
export const Captions: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const { pages } = useMemo(
    () => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 900 }),
    [captions],
  );
  const page = pages.find((p) => ms >= p.startMs && ms < p.startMs + p.durationMs);
  if (!page) return null;
  return (
    <AbsoluteFill style={{ top: 1110, height: 220, bottom: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 90px" }}>
      <div style={{ fontSize: 66, fontWeight: 900, textAlign: "center", lineHeight: 1.15, whiteSpace: "pre-wrap", textShadow: "0 4px 18px rgba(0,0,0,0.8)" }}>
        {page.tokens.map((t) => {
          const active = ms >= t.fromMs && ms < t.toMs;
          return (
            <span key={t.fromMs} style={{ color: active ? COLORS.gold : COLORS.text }}>
              {t.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
