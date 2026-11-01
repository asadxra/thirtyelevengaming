/**
 * Generates one MP3 per narration cue with ElevenLabs text-to-speech.
 *
 *   ELEVENLABS_API_KEY=... npm run voiceover
 *   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=<id> npm run voiceover
 *
 * Files are written to public/voiceover/<chapter>/<cueIndex>.mp3 and are
 * picked up automatically by <SceneFrame> the next time you preview or render.
 * Existing files are skipped, so you can re-run it safely (use --force to redo).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { NARRATION } from "../src/narration.ts";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("Set ELEVENLABS_API_KEY first.");
  process.exit(1);
}
// Default: "Adam" (a clear male narrator). Override with ELEVENLABS_VOICE_ID.
const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB";
const force = process.argv.includes("--force");

for (const [chapter, cues] of Object.entries(NARRATION)) {
  mkdirSync(`public/voiceover/${chapter}`, { recursive: true });
  for (const [idx, cue] of cues.entries()) {
    const file = `public/voiceover/${chapter}/${idx}.mp3`;
    if (existsSync(file) && !force) continue;
    const text = cue.text.replace(/\*\*/g, "");
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.2 },
      }),
    });
    if (!res.ok) {
      console.error(`Failed ${file}: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    const window = (cue.to - cue.from).toFixed(1);
    console.log(`✓ ${file}  (${window}s window) ${text}`);
  }
}
console.log("Done. Check that each clip fits its window; adjust times in src/narration.ts if needed.");
