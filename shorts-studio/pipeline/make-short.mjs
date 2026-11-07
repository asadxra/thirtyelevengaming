#!/usr/bin/env node
// Turns a job JSON (from the Shorts Studio dashboard) into a finished YouTube Short.
//   npm run make -- jobs/my-short.json [--engine=remotion|hyperframes] [--no-tts] [--no-whisper] [--no-sources]
import fs from "node:fs";
import path from "node:path";
const estimateSeconds = (t) => Math.max(3, t.trim().split(/\s+/).filter(Boolean).length / 2.6 + 1.2);
import { loadEnv, log, ROOT, run } from "./lib.mjs";
import { master } from "./steps/master.mjs";
import { fetchSources } from "./steps/sources.mjs";
import { makeVoice } from "./steps/voice.mjs";

loadEnv();
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const jobFile = args.find((a) => !a.startsWith("--"));
if (!jobFile) {
  console.error("Usage: npm run make -- jobs/<id>.json [--engine=remotion|hyperframes] [--no-tts] [--no-whisper] [--no-sources]");
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(path.resolve(jobFile), "utf8"));
const p = job.pipeline ?? {};
const engine = opt("engine") ?? p.engine ?? "remotion";
const pub = path.join(ROOT, "public", "jobs", job.id); // Remotion serves public/ via staticFile()
fs.mkdirSync(pub, { recursive: true });
fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
const rel = (f) => (f ? path.relative(path.join(ROOT, "public"), f) : null);

const sources = flag("no-sources") ? {} : fetchSources(job, pub);

let voice = null;
let sceneDurations = null;
if (p.tts !== false && !flag("no-tts")) ({ voice, sceneDurations } = await makeVoice(job, pub));
else log("voice", "skipped, using estimated scene lengths");

let captions = null;
if (voice && p.whisper !== false && p.captions !== false && !flag("no-whisper")) {
  const { makeCaptions } = await import("./steps/whisper.mjs");
  captions = await makeCaptions(voice, pub);
  fs.writeFileSync(path.join(pub, "captions.json"), JSON.stringify(captions, null, 1));
}

const raw = path.join(ROOT, "out", `${job.id}.raw.mp4`);
if (engine === "hyperframes") {
  const durs = sceneDurations ?? job.script.scenes.map((s) => s.durationSec ?? estimateSeconds(s.voiceover));
  const { renderHyperframes } = await import("./steps/hyperframes.mjs");
  renderHyperframes({ job, sceneDurations: durs, voice, broll: sources.broll, captions, out: raw });
} else {
  const props = { script: job.script, sceneDurations, voiceSrc: rel(voice), brollSrc: rel(sources.broll), brollOpacity: p.broll?.opacity, captions };
  const propsFile = path.join(pub, "props.json");
  fs.writeFileSync(propsFile, JSON.stringify(props));
  log("remotion", "rendering ScriptShort");
  const browser = process.env.REMOTION_BROWSER_EXECUTABLE ? [`--browser-executable=${process.env.REMOTION_BROWSER_EXECUTABLE}`] : [];
  run("npx", ["remotion", "render", "ScriptShort", raw, `--props=${propsFile}`, "--muted", ...browser]);
}

const out = path.join(ROOT, "out", `${job.id}.mp4`);
master({ video: raw, voice, music: sources.music, musicVolume: p.music?.volume, loudnorm: p.loudnorm !== false, out, thumb: out.replace(/\.mp4$/, ".jpg") });
log("done", path.relative(process.cwd(), out));
