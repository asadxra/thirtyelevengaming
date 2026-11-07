// FFmpeg master: voice + ducked music, loudness to -14 LUFS (YouTube), H.264 for Shorts, thumbnail.
import { log, run } from "../lib.mjs";

export function master({ video, voice, music, musicVolume = 0.12, loudnorm = true, out, thumb }) {
  const inputs = ["-i", video];
  let filter;
  if (voice && music) {
    inputs.push("-i", voice, "-stream_loop", "-1", "-i", music);
    filter =
      `[1:a]aresample=48000,asplit=2[v1][vkey];[2:a]aresample=48000,volume=${musicVolume}[m];` +
      `[m][vkey]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[duck];` +
      `[v1][duck]amix=inputs=2:duration=first:normalize=0[mix]`;
  } else if (voice) {
    inputs.push("-i", voice);
    filter = `[1:a]aresample=48000[mix]`;
  } else if (music) {
    inputs.push("-stream_loop", "-1", "-i", music);
    filter = `[1:a]aresample=48000,volume=${musicVolume}[mix]`;
  }
  if (filter && loudnorm) filter = filter.replace(/\[mix\]$/, "[pre];[pre]loudnorm=I=-14:TP=-1.5:LRA=11[mix]");
  log("ffmpeg", "mastering");
  run("ffmpeg", [
    "-y", "-v", "error", ...inputs,
    ...(filter ? ["-filter_complex", filter, "-map", "0:v", "-map", "[mix]", "-c:a", "aac", "-b:a", "192k", "-shortest"] : ["-map", "0:v", "-an"]),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
    "-movflags", "+faststart", out,
  ]);
  run("ffmpeg", ["-y", "-v", "error", "-ss", "1.2", "-i", out, "-frames:v", "1", "-q:v", "3", thumb]);
}
