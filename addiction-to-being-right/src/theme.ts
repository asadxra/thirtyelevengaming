import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const FONT = "Inter";

for (const weight of ["500", "600", "800", "900"]) {
  loadFont({
    family: FONT,
    url: staticFile(`fonts/inter-latin-${weight}-normal.woff2`),
    weight,
  });
}
export const COLORS = {
  bg: "#0b0f1a",
  bgSoft: "#151b2c",
  text: "#f5f7fb",
  muted: "#8b93a7",
  red: "#ff4d5e",
  green: "#22c55e",
  gold: "#facc15",
};

export const VIDEO = { width: 1080, height: 1920, fps: 30 };

export const SCENE_DURATIONS = {
  hook: 120,
  trade: 180,
  ego: 150,
  math: 180,
  why: 150,
  fix: 180,
  outro: 120,
};

export const TRANSITION_FRAMES = 15;
