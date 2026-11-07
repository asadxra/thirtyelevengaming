# Shorts Studio

Script → ElevenLabs voice → Whisper captions → Remotion or HyperFrames render → FFmpeg master.

Dashboard: https://claude.ai/artifact/ERh5zj2roJRnLwBNxEALNZ (source: `dashboard/shorts-studio.html`)

## Setup (your machine)

```bash
npm install
cp .env.example .env   # add ELEVENLABS_API_KEY
brew install ffmpeg yt-dlp   # or apt / pipx
npm run doctor
```

## Make a short

1. In the dashboard: write the script (Claude), pick a voice, set the pipeline, press **Download job file**.
2. Save it to `jobs/<id>.json`, then:

```bash
npm run make -- jobs/<id>.json
```

Animations are script-driven: `src/script/timeline.ts` matches each on-screen element to the moment the narrator says it (Whisper word timestamps) and places a sound effect on that cue. SFX live in `public/sfx/` (synthesized; drop in your own files with the same names to replace them).

Output: `out/<id>.mp4` + `out/<id>.jpg`. Flags: `--engine=hyperframes`, `--no-tts`, `--no-whisper`, `--no-sources`, `--no-sfx`.
Or ask Claude Code: "Render the queued shorts from my Shorts Studio dashboard".

## Pieces

- `src/script/` — data-driven Remotion template (`ScriptShort`), scene types: title, statement, chart, versus, bars, list, outro.
- `pipeline/steps/` — `sources` (yt-dlp), `voice` (ElevenLabs), `whisper`, `hyperframes`, `master` (FFmpeg).
- `src/AddictionToBeingRight.tsx` — the original hand-built video.

Only use music and b-roll you have the rights to.
