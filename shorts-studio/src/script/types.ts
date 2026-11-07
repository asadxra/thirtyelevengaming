import type { Caption } from "@remotion/captions";

/** Colour names a script may use. Mapped to the palette in theme.ts. */
export type Tone = "text" | "muted" | "red" | "green" | "gold";

export type Line = { text: string; color?: Tone };

export type SceneContent =
  | {
      type: "title";
      title: string;
      /** Word or phrase inside `title` to paint in the accent colour */
      highlight?: string;
      subtitle?: string;
      icon?: string;
    }
  | { type: "statement"; lines: Line[]; icon?: string }
  | {
      type: "chart";
      headline: Line[];
      trend: "down" | "up";
      /** Label for the horizontal level line, e.g. "STOP LOSS" or "TARGET" */
      levelLabel?: string;
      /** Big result shown under the chart, e.g. "-38%" */
      result?: string;
      resultNote?: string;
    }
  | {
      type: "versus";
      a: { label: string; quote: string; color?: Tone };
      b: { label: string; quote: string; color?: Tone };
      footer?: Line[];
    }
  | {
      type: "bars";
      headline: string;
      leftLabel: string;
      rightLabel: string;
      rows: { left: number; right: number }[];
      leftPrefix?: string;
      rightPrefix?: string;
      suffix?: string;
      footer?: string;
    }
  | { type: "list"; headline: string; items: string[] }
  | { type: "outro"; lead: string; punch: string; cta?: string };

export type Scene = SceneContent & {
  id: string;
  /** What the narrator says during this scene */
  voiceover: string;
  /** Fallback length when there is no voiceover audio yet */
  durationSec?: number;
};

export type ShortScript = {
  title: string;
  scenes: Scene[];
};

export type ShortProps = {
  script: ShortScript;
  /** Seconds per scene, measured from the voiceover by the pipeline */
  sceneDurations?: number[] | null;
  /** Paths relative to public/ */
  voiceSrc?: string | null;
  brollSrc?: string | null;
  brollOpacity?: number;
  captions?: Caption[] | null;
  /** Sound effects on cues from timeline.ts (default on) */
  sfx?: boolean;
  sfxVolume?: number;
};
