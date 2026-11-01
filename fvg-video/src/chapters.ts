import React from "react";
import { IntroScene, INTRO_DURATION } from "./scenes/Intro";
import { AnatomyScene, ANATOMY_DURATION } from "./scenes/Anatomy";
import { BullishScene, BearishScene, FVG_EXAMPLE_DURATION } from "./scenes/FVGExample";
import { CompareScene, COMPARE_DURATION } from "./scenes/Compare";
import { IdentifyScene, IDENTIFY_DURATION } from "./scenes/Identify";
import { MitigationScene, MITIGATION_DURATION } from "./scenes/Mitigation";
import { ScenarioScene, SCENARIO_DURATION } from "./scenes/Scenario";
import { MistakesScene, MISTAKES_DURATION } from "./scenes/Mistakes";
import { QuizScene, QUIZ_DURATION } from "./scenes/Quiz";
import { OutroScene, OUTRO_DURATION } from "./scenes/Outro";
import { FPS, TRANSITION_FRAMES } from "./theme";

/** Ordered list of chapters. Each is also registered as its own composition. */
export const CHAPTER_LIST: { id: string; component: React.FC; seconds: number }[] = [
  { id: "Ch00-Intro", component: IntroScene, seconds: INTRO_DURATION },
  { id: "Ch01-Anatomy", component: AnatomyScene, seconds: ANATOMY_DURATION },
  { id: "Ch02-BullishFVG", component: BullishScene, seconds: FVG_EXAMPLE_DURATION },
  { id: "Ch03-BearishFVG", component: BearishScene, seconds: FVG_EXAMPLE_DURATION },
  { id: "Ch04-Comparison", component: CompareScene, seconds: COMPARE_DURATION },
  { id: "Ch05-Identification", component: IdentifyScene, seconds: IDENTIFY_DURATION },
  { id: "Ch06-Mitigation", component: MitigationScene, seconds: MITIGATION_DURATION },
  { id: "Ch07-TradingExample", component: ScenarioScene, seconds: SCENARIO_DURATION },
  { id: "Ch08-CommonMistakes", component: MistakesScene, seconds: MISTAKES_DURATION },
  { id: "Ch09-KnowledgeTest", component: QuizScene, seconds: QUIZ_DURATION },
  { id: "Ch10-Outro", component: OutroScene, seconds: OUTRO_DURATION },
];

export const chapterFrames = (seconds: number) => Math.round(seconds * FPS);

export const LESSON_FRAMES =
  CHAPTER_LIST.reduce((sum, c) => sum + chapterFrames(c.seconds), 0) - TRANSITION_FRAMES * (CHAPTER_LIST.length - 1);
