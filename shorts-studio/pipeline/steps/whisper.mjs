// Whisper (whisper.cpp via @remotion/install-whisper-cpp): word timestamps for captions.
import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe } from "@remotion/install-whisper-cpp";
import path from "node:path";
import { log, ROOT, run } from "../lib.mjs";

const VERSION = "1.5.5";

export async function makeCaptions(voiceFile, dir) {
  const whisperPath = path.join(ROOT, ".whisper");
  const model = process.env.WHISPER_MODEL || "small.en";
  log("whisper", `model ${model} (first run downloads whisper.cpp and the model)`);
  await installWhisperCpp({ to: whisperPath, version: VERSION, printOutput: false });
  await downloadWhisperModel({ model, folder: whisperPath, printOutput: false });
  const wav16 = path.join(dir, "voice-16k.wav");
  run("ffmpeg", ["-y", "-v", "error", "-i", voiceFile, "-ar", "16000", "-ac", "1", wav16]);
  const out = await transcribe({
    inputPath: wav16,
    whisperPath,
    whisperCppVersion: VERSION,
    model,
    tokenLevelTimestamps: true,
    printOutput: false,
  });
  return toCaptions({ whisperCppOutput: out }).captions;
}
