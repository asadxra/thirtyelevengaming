// yt-dlp + FFmpeg: fetch music and b-roll you have the rights to use.
import fs from "node:fs";
import path from "node:path";
import { log, run } from "../lib.mjs";

const section = (s) => (s?.end ? ["--download-sections", `*${s.start ?? 0}-${s.end}`] : []);

export function fetchSources(job, dir) {
  const out = {};
  const music = job.pipeline?.music;
  if (music?.file) out.music = path.resolve(music.file);
  else if (music?.url) {
    const target = path.join(dir, "music.mp3");
    if (!fs.existsSync(target)) {
      log("yt-dlp", `music ← ${music.url}`);
      run("yt-dlp", ["-x", "--audio-format", "mp3", ...section(music), "-o", path.join(dir, "music.%(ext)s"), music.url]);
    }
    out.music = target;
  }
  const broll = job.pipeline?.broll;
  let raw = broll?.file ? path.resolve(broll.file) : null;
  if (!raw && broll?.url) {
    raw = path.join(dir, "broll-src.mp4");
    if (!fs.existsSync(raw)) {
      log("yt-dlp", `b-roll ← ${broll.url}`);
      run("yt-dlp", ["-f", "bv*[ext=mp4]/bv*", "--remux-video", "mp4", ...section(broll), "-o", raw, broll.url]);
    }
  }
  if (raw) {
    const target = path.join(dir, "broll.mp4");
    if (!fs.existsSync(target)) {
      log("ffmpeg", "reframing b-roll to 1080×1920");
      run("ffmpeg", ["-y", "-i", raw, "-an", "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30", "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", target]);
    }
    out.broll = target;
  }
  return out;
}
