// FFmpeg master: voice + SFX cues + ducked music, loudness to -14 LUFS (YouTube), H.264 for Shorts, thumbnail.
import path from "node:path";
import { log, ROOT, run } from "../lib.mjs";

export function master({ video, voice, music, musicVolume = 0.12, cues = [], loudnorm = true, out, thumb }) {
  const inputs = ["-i", video];
  const parts = [];
  const bus = []; // voice + sfx, the foreground
  let n = 1;
  let voiceKey = null;
  if (voice) {
    inputs.push("-i", voice);
    parts.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[vo][vkey]`);
    bus.push("[vo]");
    voiceKey = "[vkey]";
    n++;
  }
  for (const c of cues) {
    inputs.push("-i", path.join(ROOT, "public", "sfx", `${c.sfx}.wav`));
    const ms = Math.max(0, Math.round(c.t * 1000));
    parts.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${c.volume.toFixed(3)},adelay=${ms}|${ms}[x${n}]`);
    bus.push(`[x${n}]`);
    n++;
  }
  if (music) {
    inputs.push("-stream_loop", "-1", "-i", music);
    parts.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${musicVolume}[m]`);
    if (voiceKey) parts.push(`[m]${voiceKey}sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[duck]`);
    else parts.push(`[m]anull[duck]`);
    bus.push("[duck]");
  } else if (voiceKey) parts.push(`${voiceKey}anullsink`);
  let filter = null;
  if (bus.length) {
    parts.push(`${bus.join("")}amix=inputs=${bus.length}:duration=longest:normalize=0${loudnorm ? ",loudnorm=I=-14:TP=-1.5:LRA=11" : ""},aresample=48000[mix]`);
    filter = parts.join(";");
  }
  log("ffmpeg", `mastering (${cues.length} sound effects${music ? ", music ducked under voice" : ""})`);
  run("ffmpeg", [
    "-y", "-v", "error", ...inputs,
    ...(filter ? ["-filter_complex", filter, "-map", "0:v", "-map", "[mix]", "-c:a", "aac", "-b:a", "192k", "-shortest"] : ["-map", "0:v", "-an"]),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
    "-movflags", "+faststart", out,
  ]);
  run("ffmpeg", ["-y", "-v", "error", "-ss", "1.2", "-i", out, "-frames:v", "1", "-q:v", "3", thumb]);
}
