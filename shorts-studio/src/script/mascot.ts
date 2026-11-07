// Wick — the channel mascot. A candlestick whose colour is his mood.
// Pure string SVG so Remotion, HyperFrames and the dashboard draw the exact same character.
// Import-free so Node can run it directly (type stripping).

export type Mood = "happy" | "worried" | "shocked" | "thinking" | "smug" | "wave";

export type Pose = {
  mood: Mood;
  /** 0 = closed, 1 = wide open (talking) */
  mouth?: number;
  /** 0 = open eyes, 1 = closed */
  blink?: number;
  /** -1..1, where the pupils look horizontally */
  look?: number;
  /** wave arm angle phase, 0..1 */
  wave?: number;
};

const BODY: Record<Mood, string> = {
  happy: "#22c55e",
  wave: "#22c55e",
  worried: "#ff4d5e",
  shocked: "#ff4d5e",
  thinking: "#7aa2ff",
  smug: "#facc15",
};
const SHADE: Record<Mood, string> = {
  happy: "#16a34a",
  wave: "#16a34a",
  worried: "#d63447",
  shocked: "#d63447",
  thinking: "#5b84e8",
  smug: "#e0b20c",
};
const INK = "#0b0f1a";
const WICK = "#c9d1e0";

/** Which mood a scene puts Wick in. */
export function moodFor(scene: { type: string; trend?: string }): Mood {
  switch (scene.type) {
    case "title":
      return "wave";
    case "chart":
      return scene.trend === "up" ? "happy" : "shocked";
    case "versus":
      return "thinking";
    case "bars":
      return "worried";
    case "list":
      return "happy";
    case "outro":
      return "smug";
    default:
      return "thinking";
  }
}

export function mascotSvg(p: Pose, size = 260): string {
  const mood = p.mood;
  const body = BODY[mood];
  const mouth = Math.max(0, Math.min(1, p.mouth ?? 0));
  const blink = Math.max(0, Math.min(1, p.blink ?? 0));
  const look = Math.max(-1, Math.min(1, p.look ?? (mood === "thinking" ? 0.6 : 0)));
  const lookY = mood === "thinking" ? -4 : mood === "worried" ? 2 : 0;

  // Eyes
  const eyeH = 15 * (1 - blink * 0.92);
  const eye = (cx: number) =>
    `<ellipse cx="${cx}" cy="108" rx="13" ry="${Math.max(1.2, eyeH).toFixed(2)}" fill="#ffffff"/>` +
    (blink < 0.6
      ? `<circle cx="${cx + look * 5}" cy="${108 + lookY}" r="${mood === "shocked" ? 4.5 : 6.5}" fill="${INK}"/>` +
        `<circle cx="${cx + look * 5 + 2.2}" cy="${105 + lookY}" r="2" fill="#ffffff"/>`
      : "");

  // Brows
  const brows: Record<Mood, string> = {
    happy: "M64 88 Q78 82 90 88 M110 88 Q122 82 136 88",
    wave: "M64 88 Q78 82 90 88 M110 88 Q122 82 136 88",
    worried: "M66 92 Q78 84 90 84 M110 84 Q122 84 134 92",
    shocked: "M64 80 Q78 72 90 80 M110 80 Q122 72 136 80",
    thinking: "M64 90 L90 90 M110 84 Q122 78 136 86",
    smug: "M64 92 L90 88 M110 82 Q122 76 136 84",
  };

  // Mouth: closed shape per mood, opening into a talking mouth
  const closed: Record<Mood, string> = {
    happy: `<path d="M84 140 Q100 154 116 140" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    wave: `<path d="M84 140 Q100 154 116 140" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    worried: `<path d="M86 148 Q100 138 114 148" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    shocked: `<ellipse cx="100" cy="145" rx="8" ry="10" fill="${INK}"/>`,
    thinking: `<path d="M88 145 L112 142" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    smug: `<path d="M86 143 Q104 150 116 136" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  };
  const open = (o: number) => {
    const ry = 4 + o * 13;
    const rx = mood === "shocked" ? 9 + o * 3 : 13 + o * 3;
    return (
      `<ellipse cx="100" cy="${144 + o * 2}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${INK}"/>` +
      `<ellipse cx="100" cy="${144 + o * 2 + ry * 0.55}" rx="${(rx * 0.55).toFixed(1)}" ry="${(ry * 0.35).toFixed(1)}" fill="#ff7a8a"/>`
    );
  };
  const mouthSvg = mouth > 0.08 ? open(mouth) : closed[mood];

  // Arms
  const w = Math.sin((p.wave ?? 0) * Math.PI * 2) * 14;
  const arms: Record<Mood, string> = {
    happy: "M42 130 Q20 110 22 88 M158 130 Q180 110 178 88",
    wave: `M42 132 Q24 146 26 166 M158 128 Q182 ${104 + w * 0.3} ${184 + w} ${78 + Math.abs(w) * 0.2}`,
    worried: "M42 150 Q24 140 50 132 M158 150 Q176 140 150 132",
    shocked: "M42 120 Q18 96 14 70 M158 120 Q182 96 186 70",
    thinking: "M42 134 Q24 150 30 168 M158 140 Q170 156 124 150",
    smug: "M42 140 Q70 168 112 156 M158 140 Q130 168 88 158",
  };
  const hands: Record<Mood, [number, number][]> = {
    happy: [[22, 86], [178, 86]],
    wave: [[26, 168], [184 + w, 76 + Math.abs(w) * 0.2]],
    worried: [[52, 132], [148, 132]],
    shocked: [[14, 68], [186, 68]],
    thinking: [[30, 170], [122, 150]],
    smug: [[112, 156], [88, 158]],
  };

  const blush = mood === "happy" || mood === "wave" || mood === "smug"
    ? `<ellipse cx="66" cy="132" rx="9" ry="5" fill="#ff7a8a" opacity="0.45"/><ellipse cx="134" cy="132" rx="9" ry="5" fill="#ff7a8a" opacity="0.45"/>`
    : "";
  const sweat = mood === "worried" || mood === "shocked"
    ? `<path d="M150 74 Q156 86 150 92 Q144 86 150 74 Z" fill="#9fd3ff" opacity="0.9"/>`
    : "";
  const spark = mood === "smug" ? "#ffffff" : "#facc15";
  // Arms that cross the body are drawn in front, in a darker shade so they read against it
  const front = mood === "worried" || mood === "thinking" || mood === "smug";
  const armCol = front ? SHADE[mood] : body;
  const armSvg = `<path d="${arms[mood]}" stroke="${armCol}" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const handSvg = hands[mood]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${armCol}" stroke="${INK}" stroke-opacity="0.3" stroke-width="3"/>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 270" width="${size}" height="${(size * 270) / 200}">
  <ellipse cx="100" cy="258" rx="46" ry="8" fill="#000000" opacity="0.35"/>
  <line x1="100" y1="200" x2="100" y2="250" stroke="${WICK}" stroke-width="9" stroke-linecap="round"/>
  <line x1="100" y1="16" x2="100" y2="62" stroke="${WICK}" stroke-width="9" stroke-linecap="round"/>
  <circle cx="100" cy="14" r="9" fill="${spark}"/>
  ${front ? "" : armSvg}
  <rect x="40" y="56" width="120" height="150" rx="30" fill="${body}" stroke="${INK}" stroke-opacity="0.25" stroke-width="4"/>
  <rect x="52" y="68" width="16" height="120" rx="8" fill="#ffffff" opacity="0.22"/>
  ${front ? "" : handSvg}
  <path d="${brows[mood]}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${eye(78)}${eye(122)}
  ${blush}${sweat}
  ${mouthSvg}
  ${front ? armSvg + handSvg : ""}
</svg>`;
}

/** Mouth openness at time t from word timings: flaps through each spoken word. */
export function mouthAt(t: number, words: { start: number; end: number }[]): number {
  for (const w of words) {
    if (t >= w.start && t < w.end) {
      const len = Math.max(0.12, w.end - w.start);
      const syllables = Math.max(1, Math.round(len / 0.16));
      const ph = ((t - w.start) / len) * syllables;
      return 0.35 + 0.65 * Math.abs(Math.sin(ph * Math.PI));
    }
  }
  return 0;
}

/** Deterministic blink: a quick blink roughly every 3–4 seconds. */
export function blinkAt(t: number): number {
  const period = 3.4;
  const k = Math.floor(t / period);
  const offset = ((k * 7919) % 100) / 100; // stable jitter per cycle
  const at = k * period + 0.5 + offset * 1.8;
  const d = Math.abs(t - at);
  return d < 0.09 ? 1 - d / 0.09 : 0;
}
