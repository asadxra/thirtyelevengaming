import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { blinkAt, mascotSvg, moodFor, mouthAt } from "./mascot";
import type { Timeline, Word } from "./timeline";
import type { Scene } from "./types";

export const MASCOT_BOX = { left: 50, top: 1078, size: 210 };

/** Wick, lip-synced to the narration and reacting to each scene. */
export const Mascot: React.FC<{ scenes: Scene[]; timeline: Timeline; words: Word[] }> = ({ scenes, timeline, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const idx = Math.max(0, timeline.scenes.findIndex((s) => t >= s.start && t < s.start + s.dur));
  const scene = timeline.scenes[idx] ?? timeline.scenes[0];
  const mood = moodFor(scenes[idx] ?? scenes[0]);
  const local = t - scene.start;
  const impacts = useMemo(() => timeline.cues.filter((c) => c.sfx === "impact").map((c) => c.t), [timeline]);
  const lastHit = impacts.filter((x) => x <= t).pop();
  const sinceHit = lastHit === undefined ? 99 : t - lastHit;

  const svg = mascotSvg({ mood, mouth: mouthAt(t, words), blink: blinkAt(t), wave: mood === "wave" ? t * 1.6 : 0 }, MASCOT_BOX.size);
  const enter = interpolate(local, [0, 0.25], [0.86, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const jump = sinceHit < 0.45 ? Math.sin((sinceHit / 0.45) * Math.PI) * 34 : 0;
  const bob = Math.sin(t * 2.4) * 6;
  const tilt = Math.sin(t * 1.3) * 3 + (mood === "thinking" ? 4 : mood === "shocked" ? -3 : 0);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: MASCOT_BOX.left,
          top: MASCOT_BOX.top,
          translate: `0px ${(bob - jump).toFixed(1)}px`,
          rotate: `${tilt.toFixed(2)}deg`,
          scale: String(enter),
          transformOrigin: "50% 100%",
          filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.45))",
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </AbsoluteFill>
  );
};
