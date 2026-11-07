import { Easing, interpolate } from "remotion";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const fadeUp = (frame: number, start: number, dist = 60) => ({
  opacity: interpolate(frame, [start, start + 14], [0, 1], clamp),
  translate: interpolate(frame, [start, start + 20], [`0px ${dist}px`, "0px 0px"], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  }),
});

export const slideIn = (frame: number, start: number, fromLeft: boolean) => ({
  opacity: interpolate(frame, [start, start + 14], [0, 1], clamp),
  translate: interpolate(
    frame,
    [start, start + 20],
    [fromLeft ? "-160px 0px" : "160px 0px", "0px 0px"],
    { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) },
  ),
});

export const pop = (frame: number, start: number) => ({
  opacity: interpolate(frame, [start, start + 8], [0, 1], clamp),
  scale: interpolate(frame, [start, start + 20], [0.4, 1], {
    ...clamp,
    easing: Easing.spring({ damping: 12 }),
    output: "perceptual-scale",
  }),
});

export const progress = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

/** Spreads n entrance beats across the first ~55% of a scene. */
export const beats = (n: number, durationInFrames: number, first = 4) => {
  const span = Math.max(20, durationInFrames * 0.55 - first);
  return Array.from({ length: n }, (_, i) =>
    Math.round(first + (n === 1 ? 0 : (span * i) / (n - 1))),
  );
};
