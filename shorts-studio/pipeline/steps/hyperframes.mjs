// HyperFrames engine: writes an HTML + GSAP composition from the same script, then renders it.
import fs from "node:fs";
import path from "node:path";
import { log, ROOT, run } from "../lib.mjs";

const C = { bg: "#0b0f1a", soft: "#151b2c", text: "#f5f7fb", muted: "#8b93a7", red: "#ff4d5e", green: "#22c55e", gold: "#facc15" };
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const col = (t) => C[t] ?? C.text;
const line = (l, size, k) => `<div class="b" data-k="${k}" style="font-size:${size}px;color:${col(l.color)}">${esc(l.text)}</div>`;

// data-k names match the element keys in src/script/timeline.ts
function sceneHtml(s) {
  switch (s.type) {
    case "title": {
      const t = s.highlight && s.title.includes(s.highlight)
        ? esc(s.title).replace(esc(s.highlight), `<span style="color:${C.gold}">${esc(s.highlight)}</span>`)
        : esc(s.title);
      return `${s.icon ? `<div class="b" data-k="icon" style="font-size:190px;color:${C.gold}">${esc(s.icon)}</div>` : ""}
        <div class="b" data-k="title" style="font-size:108px;text-transform:uppercase;line-height:1.05">${t}</div>
        ${s.subtitle ? `<div class="b" data-k="subtitle" style="font-size:46px;font-weight:500;color:${C.muted}">${esc(s.subtitle)}</div>` : ""}`;
    }
    case "statement":
      return `${s.icon ? `<div class="b" data-k="icon" style="font-size:160px">${esc(s.icon)}</div>` : ""}${s.lines.map((l, i) => line(l, 84, `line${i}`)).join("")}`;
    case "chart": {
      const down = s.trend === "down";
      const pts = (down ? [50,54,58,55,60,56,51,47,43,45,39,34,37,29,24,20] : [50,47,44,48,45,50,54,52,58,62,59,66,70,68,75,80])
        .map((p, i) => `${(i / 15) * 860},${320 - (p / 90) * 320}`).join(" ");
      const c = down ? C.red : C.green;
      return `${s.headline.map((l, i) => line(l, 68, `head${i}`)).join("")}
        <svg class="chart" width="860" height="320" style="overflow:visible"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>
        <div class="b" data-k="result" style="display:flex;flex-direction:column;gap:20px">
        ${s.result ? `<div style="font-size:96px;color:${c};line-height:1">${esc(s.result)}</div>` : ""}
        ${s.resultNote ? `<div style="font-size:46px;color:${c}">${esc(s.resultNote)}</div>` : ""}</div>`;
    }
    case "versus": {
      const bub = (x, d, al, k) => `<div class="b bubble" data-k="${k}" style="border-color:${col(x.color ?? d)};background:${col(x.color ?? d)}1a;text-align:${al}">
        <div style="font-size:40px;color:${col(x.color ?? d)};text-transform:uppercase">${esc(x.label)}</div>
        <div style="font-size:70px">“${esc(x.quote)}”</div></div>`;
      return bub(s.a, "red", "left", "a") + bub(s.b, "gold", "right", "b") + (s.footer ?? []).map((l, i) => line(l, 60, `foot${i}`)).join("");
    }
    case "bars":
      return `<div class="b" data-k="head" style="font-size:78px">${esc(s.headline)}
        <div class="row" style="font-size:40px;margin-top:40px"><span style="color:${C.red}">${esc(s.leftLabel)}</span><span style="color:${C.green}">${esc(s.rightLabel)}</span></div></div>
        ${s.rows.map((r, i) => `<div class="b row" data-k="row${i}" style="font-size:76px"><span style="color:${C.red}">${esc(s.leftPrefix ?? "-")}${r.left}${esc(s.suffix ?? "%")}</span><span style="color:${C.muted}">→</span><span style="color:${C.green}">${esc(s.rightPrefix ?? "+")}${r.right}${esc(s.suffix ?? "%")}</span></div>`).join("")}
        ${s.footer ? `<div class="b" data-k="foot" style="font-size:50px">${esc(s.footer)}</div>` : ""}`;
    case "list":
      return `<div class="b" data-k="head" style="font-size:92px;color:${C.green}">${esc(s.headline)}</div>
        ${s.items.map((it, i) => `<div class="b item" data-k="item${i}"><span class="num">${i + 1}</span><span>${esc(it)}</span></div>`).join("")}`;
    case "outro":
      return `<div class="b" data-k="lead" style="font-size:64px;color:${C.muted}">${esc(s.lead)}</div>
        <div class="b" data-k="punch" style="font-size:118px;color:${C.green};line-height:1.05">${esc(s.punch)}</div>
        ${s.cta ? `<div class="b cta" data-k="cta">${esc(s.cta)}</div>` : ""}`;
  }
  return "";
}

function captionPages(captions = []) {
  const pages = [];
  let cur = null;
  for (const c of captions) {
    if (!cur || c.startMs - cur.start > 900 && c.text.startsWith(" ")) {
      cur = { start: c.startMs, end: c.endMs, words: [] };
      pages.push(cur);
    }
    cur.words.push(c);
    cur.end = c.endMs;
  }
  return pages;
}

export function renderHyperframes({ job, sceneDurations, timeline, voice, broll, captions, out }) {
  const dir = path.join(ROOT, "out", `hf-${job.id}`);
  fs.mkdirSync(path.join(dir, "assets", "fonts"), { recursive: true });
  for (const w of [500, 800, 900]) fs.copyFileSync(path.join(ROOT, "public/fonts", `inter-latin-${w}-normal.woff2`), path.join(dir, "assets/fonts", `inter-${w}.woff2`));
  fs.copyFileSync(path.join(ROOT, "node_modules/gsap/dist/gsap.min.js"), path.join(dir, "assets", "gsap.min.js"));
  if (voice) fs.copyFileSync(voice, path.join(dir, "assets", "voice.wav"));
  if (broll) fs.copyFileSync(broll, path.join(dir, "assets", "broll.mp4"));

  let t = 0;
  const total = sceneDurations.reduce((a, b) => a + b, 0);
  const scenes = job.script.scenes.map((s, i) => {
    const start = t;
    t += sceneDurations[i];
    return { s, start, dur: sceneDurations[i], i };
  });
  const pages = captionPages(captions ?? []);
  const withCaps = pages.length > 0;

  // Every element enters when the narrator says it (timeline.ts)
  const tweens = scenes.map(({ start, dur, i }) => {
    const at = timeline.scenes[i].at;
    const lines = Object.entries(at).filter(([k]) => k !== "draw").map(([k, t]) =>
      `tl.from('#s${i} [data-k="${k}"]', { opacity: 0, y: 50, duration: 0.45, ease: "power3.out" }, ${(start + t).toFixed(2)});`);
    if (at.draw !== undefined) lines.push(`tl.to("#s${i} .chart polyline", { strokeDashoffset: 0, duration: ${Math.max(0.6, (at.result ?? dur * 0.7) - at.draw).toFixed(2)}, ease: "power2.inOut" }, ${(start + at.draw).toFixed(2)});`);
    lines.push(`tl.to("#s${i} .inner", { opacity: 0, duration: 0.2 }, ${(start + dur - 0.2).toFixed(2)});`);
    return lines.join("\n");
  }).join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<script src="assets/gsap.min.js"></script>
<style>
${[500, 800, 900].map((w) => `@font-face{font-family:"Inter";font-weight:${w};src:url("assets/fonts/inter-${w}.woff2") format("woff2")}`).join("\n")}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:${C.bg}}
#root{width:100%;height:100%;position:relative;font-family:"Inter",sans-serif;color:${C.text};font-weight:900;background:radial-gradient(circle at 50% 30%,${C.soft} 0%,${C.bg} 70%)}
.scene{position:absolute;inset:0}
.inner{position:absolute;inset:200px 90px ${withCaps ? 830 : 600}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px;text-align:center;line-height:1.1}
.bubble{width:100%;padding:40px 52px;border-radius:36px;border:6px solid}
.row{display:flex;justify-content:space-between;width:100%}
.item{display:flex;align-items:center;gap:36px;width:100%;text-align:left;font-size:58px;font-weight:800}
.num{flex-shrink:0;width:104px;height:104px;border-radius:52px;background:${C.green};color:${C.bg};display:flex;align-items:center;justify-content:center}
.cta{font-size:42px;font-weight:600;padding:22px 44px;border-radius:999px;border:4px solid ${C.gold};color:${C.gold}}
.cap{position:absolute;left:90px;right:90px;top:1110px;height:220px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:66px;white-space:pre-wrap;text-shadow:0 4px 18px rgba(0,0,0,.8)}
#broll{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:${job.pipeline?.broll?.opacity ?? 0.22}}
</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${total.toFixed(3)}" data-width="1080" data-height="1920">
${broll ? `<video id="broll" class="clip" src="assets/broll.mp4" muted data-start="0" data-duration="${total.toFixed(3)}" data-track-index="0"></video>` : ""}
${scenes.map(({ s, start, dur, i }) => `<div id="s${i}" class="clip scene" data-start="${start.toFixed(3)}" data-duration="${dur.toFixed(3)}" data-track-index="1"><div class="inner">${sceneHtml(s)}</div></div>`).join("\n")}
${pages.map((p, i) => `<div id="c${i}" class="clip cap" data-start="${(p.start / 1000).toFixed(3)}" data-duration="${((p.end - p.start) / 1000).toFixed(3)}" data-track-index="2"><div>${p.words.map((w, j) => `<span id="c${i}w${j}">${esc(w.text)}</span>`).join("")}</div></div>`).join("\n")}
${voice ? `<audio id="voice" class="clip" src="assets/voice.wav" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="3"></audio>` : ""}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${tweens}
${pages.map((p, i) => p.words.map((w, j) => `tl.set("#c${i}w${j}", { color: "${C.gold}" }, ${(w.startMs / 1000).toFixed(3)}); tl.set("#c${i}w${j}", { color: "${C.text}" }, ${(w.endMs / 1000).toFixed(3)});`).join("\n")).join("\n")}
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
tl.seek(0);
</script></body></html>`;
  fs.writeFileSync(path.join(dir, "index.html"), html);
  log("hyperframes", `rendering ${path.relative(ROOT, dir)}`);
  run("npx", ["hyperframes", "render", "-o", out], { cwd: dir });
}
