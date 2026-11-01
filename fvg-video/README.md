# Fair Value Gaps — animated lesson (Remotion)

A complete, fully animated educational video about **Fair Value Gaps (FVGs)**, built with
[Remotion](https://remotion.dev). Every visual is code: candles form live, FVG zones draw
themselves, the camera pans and zooms, and captions are synchronised with the animation.

**Output:** 1920×1080, 30 fps, about 6 minutes 8 seconds (11 chapters with cross-fades).

## Chapters

| # | Composition id | What it animates |
|---|---|---|
| 00 | `Ch00-Intro` | Title, panning market, first 3-candle FVG, lesson agenda |
| 01 | `Ch01-Anatomy` | Candle 1 → 2 → 3 forming, displacement arrow, wick-to-wick gap bracket, zoom into the gap |
| 02 | `Ch02-BullishFVG` | Bullish displacement, C1 high / C3 low levels, green zone, retrace into zone, bullish reaction |
| 03 | `Ch03-BearishFVG` | Mirror image: C1 low / C3 high, red zone, retrace up, bearish reaction |
| 04 | `Ch04-Comparison` | Bullish and bearish FVGs forming side by side + comparison table |
| 05 | `Ch05-Identification` | 4-step checklist, scanner window, rejected (overlapping wicks) vs valid gap |
| 06 | `Ch06-Mitigation` | Partial mitigation, Consequent Encroachment (50%), full mitigation, live "% filled" gauge |
| 07 | `Ch07-TradingExample` | Equal lows → liquidity sweep → MSS → displacement → FVG → retrace → entry / SL / TP → target hit |
| 08 | `Ch08-CommonMistakes` | 4 mistakes, each with its own animated mini-chart |
| 09 | `Ch09-KnowledgeTest` | 3 quiz questions with countdown and animated answer reveal |
| 10 | `Ch10-Outro` | Key takeaways |

`FVGLesson` is the full video, built from the chapters with `<TransitionSeries>`.

## Quick start

```bash
cd fvg-video
npm i
npm run dev          # open Remotion Studio to preview and scrub every chapter
```

## Render

```bash
npm run render                                           # full lesson -> out/fvg-lesson.mp4
npx remotion render Ch06-Mitigation out/mitigation.mp4   # a single chapter
npx remotion still Ch07-TradingExample out/thumb.png --frame=1350   # a still / thumbnail
```

Useful flags: `--concurrency=8` (faster on more cores), `--crf=18` (higher quality),
`--scale=0.5` (720p/540p draft). If Remotion cannot download its headless Chrome
(for example on an offline machine), point it at a local Chromium with
`--browser-executable=/path/to/chrome`.

## Narration / voiceover

All narration lives in **`src/narration.ts`**: one list of timed cues per chapter
(`from`/`to` in seconds, `**word**` is highlighted). The same cues drive:

1. **On-screen captions** (always rendered), and
2. **Optional AI voiceover**: run

   ```bash
   ELEVENLABS_API_KEY=sk_... npm run voiceover
   # optional: ELEVENLABS_VOICE_ID=<voice id> to pick another voice
   ```

   This writes `public/voiceover/<chapter>/<cue>.mp3`. Each clip starts at its cue's `from`
   time; `SceneFrame` adds the audio automatically when the files exist, so just render again.
   If a clip runs longer than its window, widen the cue in `src/narration.ts` and shift the
   matching animation times in the chapter file. Needs Node 22.6 or newer.

## Project structure

```
src/
  Root.tsx              compositions: FVGLesson + one per chapter (Studio "Chapters" folder)
  FVGLesson.tsx         full video (TransitionSeries with fades)
  chapters.ts           chapter order and durations
  narration.ts          caption + voiceover script (single source of truth)
  theme.ts              colours, fonts, sizes, anim() / fade() helpers
  candles.ts            OHLC data helpers: k(), mirror(), candleAt() live-forming maths, timings
  components/
    Chart.tsx           TradingView-style panel, grid, price axis, animatable camera (view)
    Candle.tsx          <Candle>, <CandleSeries>: candles that form tick by tick
    FVGZone.tsx         <FVGZone> (green/red translucent gap), <Band> (overlap shading)
    Annotations.tsx     <PriceLine>, <ChartText>, <Arrow>, <Bracket>, <CandleHighlight>, <Badge>, <PositionBox>
    SceneFrame.tsx      background, chapter header, synced captions, voiceover, <Card>
  scenes/               one file per chapter
scripts/generate-voiceover.ts
public/fonts/           Inter + JetBrains Mono (bundled so rendering works offline)
```

### How the animation works

* Everything is driven by `useCurrentFrame()` → seconds (`useTime()`) and the clamped
  `interpolate()` wrapper `anim()`. No CSS animations, so every frame renders the same way.
* Chart elements take an `at` time in seconds. Candles also take a `dur`, and `candleAt()`
  moves price open → low → high → close (or open → high → low → close for bearish candles),
  so wicks and bodies grow like a live candle.
* `Chart` maps candle index/price → pixels from a `view` (`i0,i1,p0,p1`). Interpolating the
  view with `lerpView()` gives smooth camera pans and zooms.
* Animation times in each scene line up with the cue times in `narration.ts`.

Educational content only, not financial advice.
