// ElevenLabs TTS, one clip per scene, joined with FFmpeg so scene timing follows the voice.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { duration, log, run } from "../lib.mjs";

const PAD = 0.35; // breath after each scene

async function tts(text, voice, file) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set. Add it to shorts-studio/.env or run with --no-tts.");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: voice.model || "eleven_multilingual_v2" }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

export async function makeVoice(job, dir) {
  const scenes = job.script.scenes;
  const clips = [];
  for (const [i, s] of scenes.entries()) {
    const hash = crypto.createHash("sha1").update(`${job.voice.id}|${job.voice.model}|${s.voiceover}`).digest("hex").slice(0, 10);
    const file = path.join(dir, `vo-${String(i).padStart(2, "0")}-${hash}.mp3`);
    if (!fs.existsSync(file)) {
      log("elevenlabs", `scene ${i + 1}/${scenes.length}: “${s.voiceover.slice(0, 50)}…”`);
      await tts(s.voiceover, job.voice, file);
    }
    clips.push(file);
  }
  const lengths = clips.map((c) => duration(c) + PAD);
  const voice = path.join(dir, "voice.wav");
  const inputs = clips.flatMap((c) => ["-i", c]);
  const pads = clips.map((_, i) => `[${i}:a]aresample=48000,apad=whole_dur=${lengths[i].toFixed(3)}[a${i}]`).join(";");
  const cat = clips.map((_, i) => `[a${i}]`).join("") + `concat=n=${clips.length}:v=0:a=1[out]`;
  log("ffmpeg", "joining voiceover");
  run("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", `${pads};${cat}`, "-map", "[out]", voice]);
  return { voice, sceneDurations: lengths };
}
