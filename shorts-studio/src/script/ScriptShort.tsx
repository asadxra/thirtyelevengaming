import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
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
import { SceneView } from "./SceneViews";
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

const SceneFrame: React.FC<{ scene: Scene; withCaptions: boolean }> = ({ scene, withCaptions }) => {
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
      <SceneView scene={scene} />
    </AbsoluteFill>
  );
};

export const ScriptShort: React.FC<ShortProps> = (props) => {
  const { fps } = useVideoConfig();
  const secs = sceneSeconds(props);
  const withCaptions = Boolean(props.captions?.length);
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
            <SceneFrame scene={scene} withCaptions={withCaptions} />
          </Series.Sequence>
        ))}
      </Series>
      {props.voiceSrc ? <Audio src={staticFile(props.voiceSrc)} /> : null}
      {withCaptions ? <Captions captions={props.captions!} /> : null}
    </AbsoluteFill>
  );
};
