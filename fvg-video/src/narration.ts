// Narration script for every chapter – the single source of truth for both
// the on-screen captions and the (optional) generated voiceover.
// Times are in seconds, relative to the start of each chapter.
// **double asterisks** highlight key words in the captions.
// This file has no imports so scripts/generate-voiceover.ts can load it with Node directly.

export type Cue = { from: number; to: number; text: string };

export const NARRATION: Record<string, Cue[]> = {
  intro: [
    { from: 0.4, to: 5, text: "Price doesn't always move efficiently." },
    { from: 5, to: 10.5, text: "When one side overpowers the other, price leaves a gap behind: an **imbalance**." },
    { from: 10.5, to: 15, text: "Traders call this a **Fair Value Gap**, or FVG." },
    { from: 15, to: 23.6, text: "In this lesson you'll learn to spot, trade and manage FVGs, step by step." },
  ],
  anatomy: [
    { from: 0.3, to: 4, text: "Every Fair Value Gap is built from **three consecutive candles**." },
    { from: 4, to: 7, text: "**Candle 1** sets the starting point. We care about its wick." },
    { from: 7, to: 11, text: "**Candle 2** is the displacement candle: a large, aggressive body." },
    { from: 11, to: 14, text: "**Candle 3** continues in the same direction." },
    { from: 14, to: 20.3, text: "Compare Candle 1's wick with Candle 3's wick. If they don't overlap, there is a **gap**." },
    { from: 20.3, to: 25, text: "That untouched space is the **Fair Value Gap**." },
    { from: 25, to: 29.7, text: "Price was delivered in only one direction here: **inefficient** price." },
  ],
  bullish: [
    { from: 0.3, to: 3, text: "A **bullish FVG** forms during an aggressive move up." },
    { from: 3, to: 8, text: "Buyers overwhelm sellers: Candle 2 displaces higher, and Candle 3 keeps going." },
    { from: 8, to: 13, text: "Candle 1's **high** and Candle 3's **low** never touch. That space is the gap." },
    { from: 13, to: 16, text: "Mark the zone from Candle 1's high to Candle 3's low." },
    { from: 16, to: 22.5, text: "Later, price often comes back to rebalance this inefficiency..." },
    { from: 22.5, to: 25, text: "...and retraces into the FVG." },
    { from: 25, to: 31.5, text: "Buyers defend the zone and price reacts higher: the FVG acts as **support**." },
    { from: 31.5, to: 35.7, text: "Bullish FVG: Candle 1 high to Candle 3 low, expected to act as support." },
  ],
  bearish: [
    { from: 0.3, to: 3, text: "A **bearish FVG** forms during an aggressive move down." },
    { from: 3, to: 8, text: "Sellers overwhelm buyers: Candle 2 displaces lower, and Candle 3 keeps falling." },
    { from: 8, to: 13, text: "Candle 1's **low** and Candle 3's **high** never touch. That space is the gap." },
    { from: 13, to: 16, text: "Mark the zone from Candle 1's low to Candle 3's high." },
    { from: 16, to: 22.5, text: "Later, price often retraces upward to rebalance the inefficiency..." },
    { from: 22.5, to: 25, text: "...and trades back into the FVG." },
    { from: 25, to: 31.5, text: "Sellers defend the zone and price reacts lower: the FVG acts as **resistance**." },
    { from: 31.5, to: 35.7, text: "Bearish FVG: Candle 1 low to Candle 3 high, expected to act as resistance." },
  ],
  compare: [
    { from: 0.3, to: 6, text: "Side by side, bullish and bearish FVGs are **mirror images**." },
    { from: 6, to: 9, text: "Same three-candle structure, opposite direction." },
    { from: 9, to: 12, text: "Bullish displacement moves up. Bearish displacement moves down." },
    { from: 12, to: 15, text: "Bullish: Candle 1 high to Candle 3 low. Bearish: Candle 1 low to Candle 3 high." },
    { from: 15, to: 18, text: "A bullish FVG tends to act as **support**, a bearish FVG as **resistance**." },
    { from: 18, to: 23.7, text: "On a retrace: buy reactions in bullish gaps, sell reactions in bearish gaps." },
  ],
  identify: [
    { from: 0.3, to: 5, text: "Let's identify FVGs step by step on a live chart." },
    { from: 5, to: 10, text: "**Step 1:** find displacement, candles with large, aggressive bodies." },
    { from: 10, to: 16, text: "**Step 2:** take the three candles around it and mark Candle 1's and Candle 3's wicks." },
    { from: 16, to: 22, text: "**Step 3:** check for overlap. Here the wicks overlap, so there is **no FVG**." },
    { from: 22, to: 28, text: "Next displacement: Candle 1's high and Candle 3's low leave clear space. **Valid.**" },
    { from: 28, to: 35.7, text: "**Step 4:** draw the zone from wick to wick and extend it right until price returns." },
  ],
  mitigation: [
    { from: 0.3, to: 5, text: "Once an FVG forms, the key question is: how much of it has price filled?" },
    { from: 5, to: 9, text: "The midpoint of the gap is the **Consequent Encroachment**, or CE: the 50% level." },
    { from: 9, to: 16, text: "When price only wicks into the top of the zone, the FVG is **partially mitigated**." },
    { from: 16, to: 23.5, text: "Price reaching the **50% CE** level is a key reaction point for the zone." },
    { from: 23.5, to: 26, text: "Here, buyers react from CE." },
    { from: 26, to: 33, text: "When price trades through the entire gap, it is **fully mitigated**. The imbalance is rebalanced." },
    { from: 33, to: 39.7, text: "A fully mitigated FVG has done its job and loses its significance." },
  ],
  scenario: [
    { from: 0.3, to: 6, text: "Now let's put everything together in a realistic bullish setup." },
    { from: 6, to: 11, text: "Price falls into a range. Equal lows below hold **sell-side liquidity**: resting stop-losses." },
    { from: 11, to: 15, text: "Price dips below the lows, **sweeps the liquidity**, and snaps back." },
    { from: 15, to: 20.5, text: "Then a strong displacement candle breaks the swing high: a **market structure shift**." },
    { from: 20.5, to: 27, text: "That displacement leaves a **bullish FVG** behind. This is our area of interest." },
    { from: 27, to: 33, text: "We don't chase. We wait for price to retrace into the FVG." },
    { from: 33, to: 39, text: "Entry at the FVG's 50% level, **stop-loss** below the sweep low, **target** the buy-side liquidity." },
    { from: 39, to: 44, text: "Price respects the FVG and delivers into the target." },
    { from: 44, to: 47.7, text: "Sweep, shift, displacement, FVG, entry: that's the full sequence." },
  ],
  mistakes: [
    { from: 0.3, to: 5, text: "**Mistake 1:** marking a gap where the wicks overlap." },
    { from: 5, to: 9.8, text: "If Candle 1 and Candle 3 wicks overlap, there is no imbalance and no FVG." },
    { from: 10.3, to: 15, text: "**Mistake 2:** trading every FVG and ignoring market context." },
    { from: 15, to: 19.8, text: "A bullish FVG inside a strong downtrend often fails. Trade with structure." },
    { from: 20.3, to: 25, text: "**Mistake 3:** placing your stop-loss inside the zone." },
    { from: 25, to: 29.8, text: "Price can wick deep into an FVG. Put stops beyond the sweep or swing low." },
    { from: 30.3, to: 35, text: "**Mistake 4:** trading FVGs that are already fully mitigated." },
    { from: 35, to: 39.8, text: "Once price has traded through the gap, the imbalance is gone." },
  ],
  quiz: [
    { from: 0.3, to: 5, text: "**Question 1:** where does this bullish FVG begin and end?" },
    { from: 5, to: 10, text: "Pause the video and choose your answer." },
    { from: 10, to: 14.8, text: "Answer **B**: from Candle 1's high to Candle 3's low." },
    { from: 15.3, to: 20, text: "**Question 2:** is this a valid Fair Value Gap?" },
    { from: 20, to: 25, text: "Look closely at the wicks of Candle 1 and Candle 3." },
    { from: 25, to: 29.8, text: "Answer **B**: the wicks overlap, so there is no gap." },
    { from: 30.3, to: 35, text: "**Question 3:** price just tagged the exact middle of the gap. What is that level?" },
    { from: 35, to: 40, text: "Pause and choose." },
    { from: 40, to: 44.8, text: "Answer **B**: Consequent Encroachment, the 50% level." },
  ],
  outro: [
    { from: 0.3, to: 4, text: "Let's recap." },
    { from: 4, to: 9, text: "Three candles, wick-to-wick gap. Bullish acts as support, bearish as resistance." },
    { from: 9, to: 13.8, text: "Watch the 50% level, respect mitigation, and always trade with context." },
  ],
};
