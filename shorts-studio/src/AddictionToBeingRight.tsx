import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { HookScene } from "./scenes/HookScene";
import { TradeScene } from "./scenes/TradeScene";
import { EgoScene } from "./scenes/EgoScene";
import { MathScene } from "./scenes/MathScene";
import { WhyScene } from "./scenes/WhyScene";
import { FixScene } from "./scenes/FixScene";
import { OutroScene } from "./scenes/OutroScene";
import { TRANSITION_FRAMES } from "./theme";

const timing = linearTiming({ durationInFrames: TRANSITION_FRAMES });

export const AddictionToBeingRight: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence name="Hook" durationInFrames={120}>
      <HookScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence name="Trade" durationInFrames={180}>
      <TradeScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={timing} />
    <TransitionSeries.Sequence name="Ego" durationInFrames={150}>
      <EgoScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence name="Math" durationInFrames={180}>
      <MathScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
    <TransitionSeries.Sequence name="Why" durationInFrames={150}>
      <WhyScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence name="Fix" durationInFrames={180}>
      <FixScene />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence name="Outro" durationInFrames={120}>
      <OutroScene />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
