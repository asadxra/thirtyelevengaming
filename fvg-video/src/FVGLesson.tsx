import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { CHAPTER_LIST, chapterFrames } from "./chapters";
import { TRANSITION_FRAMES } from "./theme";

/** The complete lesson: every chapter in order, cross-faded. */
export const FVGLesson: React.FC = () => (
  <TransitionSeries>
    {CHAPTER_LIST.flatMap(({ id, component: Scene, seconds }, idx) => {
      const seq = (
        <TransitionSeries.Sequence key={id} name={id} durationInFrames={chapterFrames(seconds)}>
          <Scene />
        </TransitionSeries.Sequence>
      );
      if (idx === 0) return [seq];
      return [
        <TransitionSeries.Transition
          key={`${id}-fade`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />,
        seq,
      ];
    })}
  </TransitionSeries>
);
