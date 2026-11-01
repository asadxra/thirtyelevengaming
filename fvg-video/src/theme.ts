import { Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";

// Fonts are bundled in public/fonts so rendering works offline.
for (const w of ["400", "500", "600", "700", "800"]) {
  loadFont({ family: "Inter", url: staticFile(`fonts/inter-latin-${w}-normal.woff2`), weight: w });
}
for (const w of ["500", "700"]) {
  loadFont({ family: "JetBrains Mono", url: staticFile(`fonts/jetbrains-mono-latin-${w}-normal.woff2`), weight: w });
}

export const FONT = "Inter, 'DejaVu Sans', sans-serif";
export const MONO = "'JetBrains Mono', 'DejaVu Sans Mono', monospace";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Cross-fade length between chapters, in frames. */
export const TRANSITION_FRAMES = 15;

export const COLORS = {
  bg: "#0b0e14",
  panel: "#131722",
  axisBg: "#171b26",
  grid: "rgba(255,255,255,0.055)",
  border: "rgba(255,255,255,0.08)",
  text: "#e6e9f0",
  muted: "#8b93a7",
  bull: "#2ebd85",
  bear: "#f6465d",
  bullZone: "rgba(46,189,133,0.17)",
  bearZone: "rgba(246,70,93,0.17)",
  accent: "#3b82f6",
  gold: "#f5b301",
  ce: "#a78bfa",
};

/** Standard chart rectangle used by most chapters. */
export const CHART_RECT = { x: 80, y: 150, width: 1760, height: 720 };

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

/** Clamped interpolate helper working in seconds. */
export const anim = (
  t: number,
  range: [number, number],
  out: [number, number] = [0, 1],
  easing: (n: number) => number = EASE,
): number => {
  const [a, b] = range;
  if (b <= a) return t >= a ? out[1] : out[0];
  return interpolate(t, [a, b], out, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
};

/** Fade in at `at`, optionally fade out at `until`. */
export const fade = (t: number, at: number, until?: number, d = 0.4) => {
  const inn = anim(t, [at, at + d]);
  const out = until === undefined ? 1 : anim(t, [until, until + d], [1, 0]);
  return Math.min(inn, out);
};

/** Current time inside the nearest Sequence, in seconds. */
export const useTime = () => useCurrentFrame() / FPS;

export const s = (seconds: number) => Math.round(seconds * FPS);
