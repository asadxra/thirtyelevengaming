import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

export const log = (step, msg) => console.log(`\x1b[36m[${step}]\x1b[0m ${msg}`);

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: opts.capture ? "pipe" : "inherit", encoding: "utf8", cwd: opts.cwd ?? ROOT, env: process.env });
  if (r.error) throw new Error(`${cmd} could not start: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(" ")}… exited with ${r.status}\n${r.stderr ?? ""}`);
  return r.stdout ?? "";
}

export const has = (cmd) => spawnSync(cmd, ["--version"], { stdio: "ignore" }).status === 0
  || spawnSync(cmd, ["-version"], { stdio: "ignore" }).status === 0;

export function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export const duration = (file) =>
  Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { capture: true }).trim());
