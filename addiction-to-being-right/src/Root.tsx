import { Composition, Folder } from "remotion";
import { AddictionToBeingRight } from "./AddictionToBeingRight";
import { HookScene } from "./scenes/HookScene";
import { TradeScene } from "./scenes/TradeScene";
import { EgoScene } from "./scenes/EgoScene";
import { MathScene } from "./scenes/MathScene";
import { WhyScene } from "./scenes/WhyScene";
import { FixScene } from "./scenes/FixScene";
import { OutroScene } from "./scenes/OutroScene";
import { SCENE_DURATIONS, TRANSITION_FRAMES, VIDEO } from "./theme";

const SCENES = [
  { id: "Hook", component: HookScene, duration: SCENE_DURATIONS.hook },
  { id: "Trade", component: TradeScene, duration: SCENE_DURATIONS.trade },
  { id: "Ego", component: EgoScene, duration: SCENE_DURATIONS.ego },
  { id: "Math", component: MathScene, duration: SCENE_DURATIONS.math },
  { id: "Why", component: WhyScene, duration: SCENE_DURATIONS.why },
  { id: "Fix", component: FixScene, duration: SCENE_DURATIONS.fix },
  { id: "Outro", component: OutroScene, duration: SCENE_DURATIONS.outro },
];

const TOTAL =
  SCENES.reduce((sum, s) => sum + s.duration, 0) -
  (SCENES.length - 1) * TRANSITION_FRAMES;

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Scenes">
      {SCENES.map((s) => (
        <Composition
          key={s.id}
          id={s.id}
          component={s.component}
          durationInFrames={s.duration}
          {...VIDEO}
        />
      ))}
    </Folder>
    <Composition
      id="AddictionToBeingRight"
      component={AddictionToBeingRight}
      durationInFrames={TOTAL}
      {...VIDEO}
    />
  </>
);
