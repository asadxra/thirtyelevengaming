# Motion Studio: scene animation & motion design studio

A browser studio for building the **individual animation building blocks** of YouTube explainer videos, scene by scene, in **16:9 (1920×1080)** and **9:16 Shorts (1080×1920)**. Every animation can be exported with a **Claude replication package** (prompt, reference video, assets, keyframes and a Remotion project) so Claude Code can rebuild it exactly.

## Run

```bash
cd motion-studio
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/ (relative paths, host anywhere)
```

Use a Chromium-based browser (Chrome or Edge) for frame-exact MP4 and transparent WebM export (WebCodecs).
Everything is saved automatically in the browser (IndexedDB). Use **Settings → Backup** regularly.

## Modules

| Sidebar | What it does |
|---|---|
| Dashboard | Stats, quick actions, recent projects, style presets |
| Scene Builder | Multi-scene editor: canvas with drag, scale and rotate handles, layers, inspector, multi-layer timeline, keyframes, easing curves, camera, transitions, sequence preview |
| Character Studio | Parametric characters (stickman, minimal, cartoon, educational, or your own uploaded art). Proportions, colors, hair, outfit, accessories, expressions, a pose editor, a movement builder and reference uploads |
| Illustration Studio | Layer-based vector illustrations (28 built-in: finance, charts, education, objects, environments), per-part animation and loops, SVG import, SVG/PNG/animated export |
| Motion Design Studio | Standalone motion clips: kinetic type, counters, charts, connectors, infographics, camera moves, background FX |
| Animation Library | Searchable: characters, movements, animations, illustrations, motion graphics, transitions, backgrounds, effects, complete scenes. Preview, duplicate, rename, edit, delete, reuse |
| Project Library | Projects with title, description, format, preset, scenes, custom compositions, export history, JSON import/export |
| Export Center | Export projects, sequences, scenes, clips, illustrations and characters, with export history |
| Settings | Accent color and glow, defaults, **animation style preset editor**, backup/restore |

## Editor shortcuts

`Space` play/pause · `,` / `.` previous/next frame · `Home`/`End` · `K` auto-key · arrow keys nudge (`Shift` = ×10) · `Ctrl+D` duplicate · `Del` delete layer or keyframe · `Ctrl+Z` / `Ctrl+Shift+Z` undo/redo · `Ctrl+wheel` zoom · double-click a keyframe to delete it.

## Dual-format model (no stretching)

Every layer stores a **separate resting layout per composition** (`x, y, scale, rotation, motionScale`). Keyframed x/y values are **offsets** from that resting point, so timing and motion are shared across formats while each composition stays independently editable. New formats are derived automatically (positions remapped, uniform scale kept and only reduced to fit). A layer stays linked (`auto`) until you edit it in that format.

## Architecture

```
src/engine/   pure React + SVG renderer, no app dependencies (also shipped in exports)
  schema.ts       JSON animation schema (scenes, elements, keyframes, characters, illustrations)
  evaluate.ts     state of any element at time t (layout → keyframes → entrance → exit → loop)
  easing.ts       named easings + exact cubic-bezier equivalents
  render.tsx      SceneSVG: text, shapes, arrows, charts, counters, images, FX, camera
  character.tsx   parametric character rig + faces
  poses.ts        poses, movement loops
  illustrations.ts built-in vector illustrations
  sequence.tsx    multi-scene playback with transitions
src/export/   frames → MP4 (WebCodecs H.264), GIF, PNG sequence, transparent WebM (VP9 + alpha),
              Claude prompt generator, ZIP package builder (includes a Remotion project)
src/store/    zustand + immer, undo/redo, IndexedDB persistence, demo seed
src/pages/    the 9 modules; src/pages/editor/ = stage, timeline, inspector, insert panel
```

## Claude export package (ZIP)

```
prompts/claude-prompt-16x9.md|.txt, claude-prompt-9x16.md|.txt
reference/*.mp4, *.gif, *-transparent.webm
frames/<format>/frame_0000.png …        (optional)
snapshots/<format>/frame_XXXXX.svg       exact vector frames at key moments
assets/illustrations/*.svg + .json
characters/*.json, *-sheet.svg, references/*
data/scene.json, keyframes.json, timing.json, layers.json, metadata.json, style-preset.json
remotion/  ready-to-run Remotion project (original engine source + scene.json, both formats registered)
```

Each prompt contains strict no-reinterpretation rules, the composition spec, style preset, camera, a layer stack, per-layer appearance (including full character proportions and joint angles, and illustration part tables), entrance and exit formulas, exact easing curves, keyframe tables, **computed per-frame motion samples**, Remotion implementation notes and verification checkpoints. Prompts are editable in the export dialog before download.
