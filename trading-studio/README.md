# Thirty Eleven — Trading Motivation Video Studio

A dark, neon production dashboard for planning motivational trading videos for YouTube: one consistent animated character, scripts, scene timelines, ElevenLabs voiceover, captions and code-animation visuals.

**Nothing renders on its own.** No video is generated when a script is completed, a character is uploaded, a voiceover is generated, captions change or a project is saved. The **Generate Video** button asks you to confirm, then records your approval. No rendering engine is connected yet, so nothing is rendered.

## Run it

```bash
cd trading-studio
npm install
npm run dev        # API on :8787 + Vite UI on http://localhost:5173
```

Production:

```bash
npm run build
npm start          # serves UI + API on http://localhost:8787
```

Tests: `npm test`

## Integrations (server-side only)

| Integration | How to connect | Notes |
|---|---|---|
| ElevenLabs | Settings → Integrations, or `ELEVENLABS_API_KEY` env var | The default voice is **Quentin**. Clips are generated one scene at a time. |
| Claude (script writer, optional) | Settings → Integrations, or `ANTHROPIC_API_KEY` env var | Uses `claude-opus-5-5` by default (`ANTHROPIC_MODEL` overrides it). Without it, the built-in local writer is used. |
| Video renderer | Not connected yet | The generation pipeline UI is there but switched off. |

API keys are never put in the frontend bundle and no API route returns them. Keys you enter in the UI are checked first, then saved to `data/secrets.json` (mode 600, git-ignored). Environment variables take priority over saved keys.

## Data

Everything is saved to `data/db.json`. Uploads and voiceover MP3s go in `data/uploads/`. The `STUDIO_DATA_DIR` env var changes where this lives. On first run the app seeds a draft character, **The Shadow Trader**, made from the reference image, plus sample projects marked **Sample**. You can export a backup or reset the data in Settings → Project storage.

## Features

- **Dashboard**: counts, recent projects with thumbnails, activity feed and quick links.
- **Character Design**: edit the head, hair, eyes, expressions, body proportions, height and width, arms, legs, hands, feet, clothing, shoes, accessories, colors, material and texture. There are 8 styles and 10 animations. You can upload a reference image and overlay it on the character to compare. Clothing and animation presets are included. Changes only apply when you save. Approving a design locks it, and every project renders the saved character, so it can't change between scenes.
- **Script Studio**: a brief form with 14 themes, and a Hook → Problem → Story → Realization → Conclusion editor. You can generate, make another version, expand, shorten, change tone, regenerate the hook or ending, or rewrite a selected passage. You can also edit sentence by sentence. Versions are kept and edits autosave.
- **Scene builder**: splits the script into timed scenes. Each scene has an action, pose, expression, environment, animation, camera, background, code-animation notes, sound effects and caption. Timestamps are editable. You can add, delete, reorder (drag or arrows) and duplicate scenes, and preview the timeline.
- **Voice Studio**: connect ElevenLabs, browse and preview voices, and set stability, similarity, style, speed and speaker boost. You can generate per scene, regenerate only the scenes whose text changed, download each clip or the whole voiceover, view an audio timeline, and match scene timestamps to the audio length.
- **Captions**: generated from scenes as sentences or word bursts, with editable text and times, split and merge, and word timings. You can set font, size, weight, colors, outline, shadow, position and alignment, and choose from 6 animation presets with a live preview. Editing captions never changes the script.
- **Visuals**: a library of 12 code and market storytelling elements. Each scene has layers with editable speed, color, opacity, blur, glow, position, scale, duration and order, and you can save presets.
- **Formats**: YouTube Shorts (1080×1920) and YouTube Landscape (1920×1080) only. The layout adapts to the format you pick.
- **Settings**: theme (colors, transparency, glow, radius, font, density, motion, light and dark mode), integrations, defaults, presets and storage.
