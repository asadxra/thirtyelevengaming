import React from "react";
import { AbsoluteFill, Sequence, getStaticFiles, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { COLORS, FONT, FPS, MONO, anim, useTime } from "../theme";
import { Cue, NARRATION } from "../narration";

/** Renders "**word**" segments in the accent colour. */
const RichText: React.FC<{ text: string; accent: string }> = ({ text, accent }) => (
  <>
    {text.split("**").map((part, idx) =>
      idx % 2 === 1 ? (
        <span key={idx} style={{ color: accent, fontWeight: 700 }}>
          {part}
        </span>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      ),
    )}
  </>
);

/** Caption bar synchronised with the narration cues. */
export const Narration: React.FC<{ cues: Cue[]; accent?: string }> = ({ cues, accent = COLORS.gold }) => {
  const t = useTime();
  const cue = cues.find((c) => t >= c.from && t < c.to);
  if (!cue) return null;
  const o = Math.min(anim(t, [cue.from, cue.from + 0.3]), anim(t, [cue.to - 0.3, cue.to], [1, 0]));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 42,
        display: "flex",
        justifyContent: "center",
        opacity: o,
        translate: `0px ${anim(t, [cue.from, cue.from + 0.4], [16, 0])}px`,
      }}
    >
      <div
        style={{
          maxWidth: 1640,
          padding: "18px 34px",
          borderRadius: 16,
          background: "rgba(8,10,16,0.86)",
          borderLeft: `6px solid ${accent}`,
          color: COLORS.text,
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 500,
          lineHeight: 1.3,
          textAlign: "center",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        }}
      >
        <RichText text={cue.text} accent={accent} />
      </div>
    </div>
  );
};

/** Chapter number + title in the top-left corner. */
export const ChapterHeader: React.FC<{ chapter: number; title: string; accent?: string }> = ({
  chapter,
  title,
  accent = COLORS.accent,
}) => {
  const t = useTime();
  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        top: 38,
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity: anim(t, [0, 0.6]),
        translate: `${anim(t, [0, 0.8], [-40, 0])}px 0px`,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 24,
          color: "#0b0e14",
          background: accent,
          borderRadius: 10,
          padding: "8px 14px",
          letterSpacing: 2,
        }}
      >
        {`CH ${String(chapter).padStart(2, "0")}`}
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 52, color: COLORS.text, letterSpacing: -0.5 }}>
        {title}
      </div>
    </div>
  );
};

/**
 * Plays voiceover clips if they exist in public/voiceover/<id>/<cueIndex>.<mp3|wav|m4a|...>.
 * Generate them with `npm run voiceover` (needs ELEVENLABS_API_KEY). Without the
 * files the video renders silently with captions only.
 */
const Voiceover: React.FC<{ id: string; cues: Cue[] }> = ({ id, cues }) => {
  const files = getStaticFiles().map((f) => f.name);
  return (
    <>
      {cues.map((c, idx) => {
        // Any audio format works: 0.mp3, 0.wav, 0.m4a, ...
        const name = files.find((f) => f.startsWith(`voiceover/${id}/${idx}.`) && /\.(mp3|wav|m4a|aac|ogg|webm)$/i.test(f));
        if (!name) return null;
        return (
          <Sequence key={idx} from={Math.round(c.from * FPS)} layout="none" name={`VO ${id} ${idx}`}>
            <Audio src={staticFile(name)} />
          </Sequence>
        );
      })}
    </>
  );
};

/** Shared background, header, captions and voiceover for every chapter. */
export const SceneFrame: React.FC<{
  id: string;
  chapter?: number;
  title?: string;
  accent?: string;
  children?: React.ReactNode;
}> = ({ id, chapter, title, accent, children }) => {
  const cues = NARRATION[id] ?? [];
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1400px 800px at 70% 20%, #151b2b 0%, ${COLORS.bg} 60%)`,
        fontFamily: FONT,
        color: COLORS.text,
      }}
    >
      {children}
      {chapter !== undefined && title ? <ChapterHeader chapter={chapter} title={title} accent={accent} /> : null}
      <Narration cues={cues} />
      <Voiceover id={id} cues={cues} />
    </AbsoluteFill>
  );
};

/** Small HTML card helper for on-screen summaries. */
export const Card: React.FC<{
  x: number;
  y: number;
  w?: number;
  at: number;
  until?: number;
  color?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, w, at, until, color = COLORS.accent, children, style }) => {
  const t = useTime();
  const o = Math.min(anim(t, [at, at + 0.5]), until === undefined ? 1 : anim(t, [until, until + 0.4], [1, 0]));
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        opacity: o,
        translate: `0px ${anim(t, [at, at + 0.6], [20, 0])}px`,
        background: "rgba(13,16,24,0.92)",
        border: `2px solid ${color}`,
        borderRadius: 16,
        padding: "18px 26px",
        fontSize: 30,
        fontWeight: 600,
        color: COLORS.text,
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
