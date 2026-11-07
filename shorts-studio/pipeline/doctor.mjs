#!/usr/bin/env node
// Checks that every tool the pipeline uses is installed and configured.
import fs from "node:fs";
import path from "node:path";
import { has, loadEnv, ROOT } from "./lib.mjs";

loadEnv();
const rows = [
  ["Node.js ≥ 22", Number(process.versions.node.split(".")[0]) >= 22, "Install from nodejs.org"],
  ["FFmpeg", has("ffmpeg"), "brew install ffmpeg  /  apt install ffmpeg"],
  ["ffprobe", has("ffprobe"), "Comes with FFmpeg"],
  ["yt-dlp", has("yt-dlp"), "brew install yt-dlp  /  pipx install yt-dlp"],
  ["ElevenLabs key", Boolean(process.env.ELEVENLABS_API_KEY), "Add ELEVENLABS_API_KEY=... to shorts-studio/.env"],
  ["Whisper (whisper.cpp)", fs.existsSync(path.join(ROOT, ".whisper")), "Installs itself on the first run with captions"],
  ["Remotion", fs.existsSync(path.join(ROOT, "node_modules/remotion")), "npm install"],
  ["HyperFrames", fs.existsSync(path.join(ROOT, "node_modules/hyperframes")), "npm install"],
];
for (const [name, ok, fix] of rows) console.log(`${ok ? "\x1b[32m✔" : "\x1b[33m✘"}\x1b[0m ${name.padEnd(24)} ${ok ? "" : fix}`);
