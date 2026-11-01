import React from "react";
import { Composition, Folder } from "remotion";
import { FVGLesson } from "./FVGLesson";
import { CHAPTER_LIST, LESSON_FRAMES, chapterFrames } from "./chapters";
import { FPS, HEIGHT, WIDTH } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="FVGLesson" component={FVGLesson} durationInFrames={LESSON_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Folder name="Chapters">
      {CHAPTER_LIST.map((c) => (
        <Composition
          key={c.id}
          id={c.id}
          component={c.component}
          durationInFrames={chapterFrames(c.seconds)}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
    </Folder>
  </>
);
