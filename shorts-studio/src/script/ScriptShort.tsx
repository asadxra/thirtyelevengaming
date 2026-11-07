import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Sequence,
  CalculateMetadataFunction,
  interpolate,
  Series,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";
import { Captions } from "./Captions";
import { estimateSeconds } from "./fit";
import { AtContext, SceneView } from "./SceneViews";
import { buildTimeline, estimateWords, type Word } from "./timeline";
import { Mascot } from "./Mascot";
import { useMemo } from "react";
import type { Scene, ShortProps } from "./types";

export const sceneSeconds = (props: ShortProps) =>
  props.script.scenes.map(
    (s, i) => props.sceneDurations?.[i] ?? s.durationSec ?? estimateSeconds(s.voiceover),
  );

export const calculateShortMetadata: CalculateMetadataFunction<ShortProps> = ({ props }) => {
  const fps = 30;
  const total = sceneSeconds(props).reduce((a, b) => a + Math.round(b * fps), 0);
  return { durationInFrames: Math.max(1, total), fps };
};

const SceneFrame: React.FC<{ scene: Scene; withCaptions: boolean; at: Record<string, number> }> = ({ scene, withCaptions, at }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        // Content stays in the Shorts safe band: below the top bar, above the caption/handle area
        padding: `200px 90px ${withCaptions ? 830 : 600}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 44,
        textAlign: "center",
        opacity: interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <AtContext.Provider value={at}>
        <SceneView scene={scene} />
      </AtContext.Provider>
    </AbsoluteFill>
  );
};

export const ScriptShort: React.FC<ShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const secs = sceneSeconds(props);
  const withCaptions = Boolean(props.captions?.length);
  const timeline = useMemo(
    () => buildTimeline(props.script.scenes, secs, props.captions, props.sfxVolume ?? 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.script, props.captions, props.sceneDurations, props.sfxVolume],
  );
  // Spoken words (global seconds): Whisper when available, else evenly spaced per scene
  const words: Word[] = useMemo(
    () =>
      props.captions?.length
        ? props.captions.map((c) => ({ text: c.text, start: c.startMs / 1000, end: c.endMs / 1000 }))
        : timeline.scenes.flatMap((ts, i) =>
            estimateWords(props.script.scenes[i].voiceover, ts.dur).map((w) => ({ ...w, start: w.start + ts.start, end: w.end + ts.start })),
          ),
    [props.captions, props.script, timeline],
  );
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 30%, ${COLORS.bgSoft} 0%, ${COLORS.bg} 70%)`,
        fontFamily: FONT,
        color: COLORS.text,
      }}
    >
      {props.brollSrc ? (
        <Video
          src={staticFile(props.brollSrc)}
          muted
          loop
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: props.brollOpacity ?? 0.22 }}
        />
      ) : null}
      <Series>
        {props.script.scenes.map((scene, i) => (
          <Series.Sequence key={scene.id} name={scene.id} durationInFrames={Math.max(1, Math.round(secs[i] * fps))}>
            <SceneFrame scene={scene} withCaptions={withCaptions} at={timeline.scenes[i].at} />
          </Series.Sequence>
        ))}
      </Series>
      {props.voiceSrc ? <Audio src={staticFile(props.voiceSrc)} /> : null}
      {props.sfx !== false
        ? timeline.cues.map((c, i) => (
            <Sequence key={i} from={Math.round(c.t * fps)} durationInFrames={Math.round(1.4 * fps)} layout="none" name={`sfx ${c.sfx}`}>
              <Audio src={staticFile(`sfx/${c.sfx}.wav`)} volume={c.volume} />
            </Sequence>
          ))
        : null}
      {props.mascot !== false ? <Mascot scenes={props.script.scenes} timeline={timeline} words={words} /> : null}
      {withCaptions ? <Captions captions={props.captions!} withMascot={props.mascot !== false} /> : null}
    </AbsoluteFill>
  );
};
