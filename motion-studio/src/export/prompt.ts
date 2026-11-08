import { describeEasing } from '../engine/easing';
import { evaluateCamera, evaluateElement, layoutFor } from '../engine/evaluate';
import { BUILTIN_MOVEMENTS } from '../engine/poses';
import { elementSize } from '../engine/render';
import type { AnimSpec, AssetBundle, Character, FormatDef, Illustration, Scene, SceneElement } from '../engine/schema';
import type { StylePreset } from '../lib/presets';

export interface PromptInput {
  title: string;
  scenes: Scene[];
  assets: AssetBundle;
  format: FormatDef;
  fps: number;
  preset?: StylePreset;
  /** filenames of the reference media shipped alongside the prompt */
  referenceFiles?: string[];
  onlyElementIds?: string[];
  extraNotes?: string;
}

const f2 = (n: number) => (Math.round(n * 100) / 100).toString();
const f3 = (n: number) => (Math.round(n * 1000) / 1000).toString();
const pct = (v: number, of: number) => `${f2((v / of) * 100)}%`;

const ANIM_FORMULA: Record<string, string> = {
  none: 'no animation',
  fade: 'opacity *= p',
  slideUp: 'y += (1-p)·distance (element starts BELOW its resting position and rises); opacity *= clamp(p·1.6)',
  slideDown: 'y -= (1-p)·distance (starts ABOVE and falls into place); opacity *= clamp(p·1.6)',
  slideLeft: 'x += (1-p)·distance (starts to the RIGHT and moves left); opacity *= clamp(p·1.6)',
  slideRight: 'x -= (1-p)·distance (starts to the LEFT and moves right); opacity *= clamp(p·1.6)',
  pop: 'scale *= p; opacity *= clamp(p·3)',
  scale: 'scale *= lerp(0.6, 1, p); opacity *= p',
  rotate: 'rotation += (1-p)·(-90°); scale *= lerp(0.5, 1, p); opacity *= p',
  blur: 'gaussian blur stdDeviation += (1-p)·24 px; opacity *= p',
  bounce: 'scale *= p (with bounce easing); opacity *= clamp(p·4)',
  drop: 'y -= (1-p)·distance·2; opacity *= clamp(p·2)',
  flip: 'scaleX *= cos((1-p)·90°); opacity *= clamp(p·2)',
  wipe: 'left→right clip reveal: visible width = p · element width',
  draw: 'progress = p — strokes are revealed along their length (stroke-dashoffset = 1 - p with pathLength=1); fills fade in over the last 45%; charts grow; counters count from→to',
  typewriter: 'progress = p — characters appear one at a time: visibleChars = floor(p · totalChars)',
};

function animLine(a: AnimSpec, fps: number, startAt: number, kind: 'Entrance' | 'Exit') {
  if (!a || a.type === 'none') return `- **${kind}:** none`;
  const s = kind === 'Entrance' ? startAt + (a.delay ?? 0) : startAt;
  return `- **${kind}:** \`${a.type}\` — starts ${f3(s)} s (frame ${Math.round(s * fps)}), lasts ${f3(a.duration)} s (${Math.round(a.duration * fps)} frames), easing ${describeEasing(a.easing)}${['slideUp', 'slideDown', 'slideLeft', 'slideRight', 'drop'].includes(a.type) ? `, distance ${a.distance ?? 200} px` : ''}.\n  Formula (p = eased progress 0→1${kind === 'Exit' ? ', played in reverse: p goes 1→0' : ''}): ${ANIM_FORMULA[a.type] ?? a.type}`;
}

function describeCharacter(c: Character | undefined, el: Extract<SceneElement, { type: 'character' }>, assets: AssetBundle) {
  if (!c) return '- Character asset missing.';
  const pr = c.proportions, col = c.colors;
  const pose = assets.poses[el.props.pose];
  const mv = assets.movements[el.props.movement] ?? BUILTIN_MOVEMENTS.find((m) => m.id === el.props.movement);
  const lines = [
    `- **Character asset:** "${c.name}" (id \`${c.id}\`), style **${c.style}**. Reuse EXACTLY — do not alter proportions or colors.`,
    `- **Proportions (px at scale 1):** head radius ${pr.headSize}, torso length ${pr.torsoLength}, torso width ${pr.torsoWidth}, arm length ${pr.armLength} (upper ${pr.armLength / 2} + lower ${pr.armLength / 2}), leg length ${pr.legLength} (thigh ${pr.legLength / 2} + shin ${pr.legLength / 2}), limb thickness ${pr.limbWidth}, outline/line width ${pr.lineWidth}. Neck = 0.35 × head radius.`,
    `- **Colors:** skin ${col.skin}, hair ${col.hair}, shirt ${col.shirt}, pants ${col.pants}, shoes ${col.shoes}, outline ${col.outline}, accent ${col.accent}, eyes ${col.eyes}.`,
    `- **Look:** hair \`${c.hair}\`, outfit \`${c.outfit}\`, accessory \`${c.accessory}\`${el.props.flip ? ', mirrored horizontally (scaleX -1)' : ''}.`,
    `- **Pose:** \`${el.props.pose}\`${pose ? ` — joint angles (deg; limbs: 0 = pointing straight down, +90 = pointing screen-right; lower limbs are relative to upper): leftUpperArm ${pose.lUpper}, leftForearm ${pose.lLower}, rightUpperArm ${pose.rUpper}, rightForearm ${pose.rLower}, leftThigh ${pose.lThigh}, leftShin ${pose.lShin}, rightThigh ${pose.rThigh}, rightShin ${pose.rShin}, torso lean ${pose.torso}, head tilt ${pose.head}, body lift ${pose.lift}px` : ''}.`,
    `- **Expression:** \`${el.props.expression}\`${el.props.talking ? ' with talking mouth (open amount = max(0, 0.5·sin(17t) + 0.5·sin(11.3t)))' : ''}. Eyes blink for 0.15 s every 3.4 s.`,
    `- **Movement loop:** \`${el.props.movement}\` at ${el.props.movementSpeed}× speed${mv?.description ? ` — ${mv.description}` : ''}${mv?.steps ? ` Custom steps: ${mv.steps.map((s) => `${s.pose} (${s.duration}s, ${describeEasing(s.easing)})`).join(' → ')} (loops)` : ''}.`,
    `- **Rig (front view):** hip at origin; shoulders = hip + torsoLength up (rotated by torso lean); arms attach at ±0.42·torsoWidth from the shoulder centre; legs attach at ±0.24·torsoWidth from the hip; head centre = neck top + head radius. Whole figure is vertically centred on the element position.`,
  ];
  if (el.tracks.pose?.length) lines.push(`- **Pose keyframes (joint angles interpolate between named poses):** ${[...el.tracks.pose].sort((a, b) => a.time - b.time).map((k) => `${f3(k.time)}s → \`${k.value}\` (${describeEasing(k.easing)})`).join('; ')}`);
  return lines.join('\n');
}

function describeIllustration(il: Illustration | undefined, el: Extract<SceneElement, { type: 'illustration' }>) {
  if (!il) return '- Illustration asset missing.';
  const rows = il.parts.filter((p) => !p.hidden).map((p, i) => {
    const geo = Object.entries(p.attrs).map(([k, v]) => `${k}=${typeof v === 'number' ? f2(v) : JSON.stringify(v)}`).join(' ');
    const anim = p.anim.type === 'none' ? '—' : `${p.anim.type} delay ${p.anim.delay}s dur ${p.anim.duration}s ${Array.isArray(p.anim.easing) ? describeEasing(p.anim.easing) : p.anim.easing}`;
    const loop = p.loop.type === 'none' ? '' : ` + loop ${p.loop.type} ${p.loop.speed}Hz amt ${p.loop.amount}`;
    const xf = p.tx || p.ty || p.s !== 1 || p.r ? ` transform(t=${p.tx},${p.ty} s=${p.s} r=${p.r}°)` : '';
    return `| ${i + 1} | ${p.name} | ${p.kind} | \`${geo}\`${xf} | ${p.fill} | ${p.stroke}/${p.strokeWidth} | ${p.opacity} | ${anim}${loop} |`;
  });
  return [
    `- **Illustration asset:** "${il.name}" (id \`${il.id}\`, viewBox ${il.w}×${il.h}, drawn centred on the element position). Use the exported SVG \`assets/illustrations/${il.id}.svg\` verbatim.`,
    `- Part animations ${el.props.partAnimations ? 'ENABLED (timed from element start)' : 'disabled (parts static)'}:`,
    '',
    '| # | Part | Kind | Geometry | Fill | Stroke/W | Opacity | Animation |',
    '|---|---|---|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

function describeAppearance(el: SceneElement, assets: AssetBundle): string {
  switch (el.type) {
    case 'text': {
      const p = el.props;
      return [
        `- **Text:** ${JSON.stringify(p.uppercase ? p.text.toUpperCase() : p.text)} (\\n = line break)`,
        `- Font: ${p.fontFamily}, ${p.fontSize}px, weight ${p.fontWeight}${p.italic ? ', italic' : ''}, color ${p.color}, align ${p.align}, line-height ${p.lineHeight}, letter-spacing ${p.letterSpacing}px${p.stroke && p.strokeWidth ? `, outline ${p.stroke} ${p.strokeWidth}px (paint-order stroke)` : ''}.`,
        p.background ? `- Background pill: ${p.background}, padding ${p.padding ?? 24}px, radius min(h/2, 28).` : '',
        p.highlight ? `- Highlighted words: "${p.highlight}" in ${p.highlightColor}.` : '',
        p.kinetic !== 'none' ? `- **Kinetic:** split by ${p.kinetic}; each unit plays the entrance individually with ${p.stagger}s stagger (unit i starts at delay + i·${p.stagger}s). Units move by 0.35 × distance and fade in; word layout stays fixed.` : '',
      ].filter(Boolean).join('\n');
    }
    case 'shape': {
      const p = el.props;
      return `- **Shape:** ${p.shape} ${p.w}×${p.h}, fill ${p.fill}${p.fill2 ? ` → ${p.fill2} (linear gradient top-left → bottom-right)` : ''}, stroke ${p.stroke} ${p.strokeWidth}px, corner radius ${p.radius}${p.shape === 'polygon' || p.shape === 'star' ? `, ${p.sides} points/sides` : ''}${p.dashed ? ', dashed stroke' : ''}.`;
    }
    case 'arrow': {
      const p = el.props;
      return `- **Arrow:** quadratic curve from (${-p.dx / 2}, ${-p.dy / 2}) to (${p.dx / 2}, ${p.dy / 2}) relative to the element centre; control point offset perpendicular by curve ${p.curve} × length. Color ${p.color}, ${p.strokeWidth}px round caps, chevron head ${p.headSize}px (±149°)${p.doubleHead ? ' on both ends' : ''}${p.dashed ? ', dashed' : ''}${p.style === 'sketch' ? ', sketch style (second thin stroke offset (3,-2), 60% opacity)' : ''}. While drawing, the curve is split at t = progress (de Casteljau) and the head rides the tip.`;
    }
    case 'chart': {
      const p = el.props;
      const data = p.chartType === 'candlestick' ? `candles (o,h,l,c): ${p.candles.map((c) => `(${c.o},${c.h},${c.l},${c.c})`).join(' ')}` : `data ${JSON.stringify(p.data)}, labels ${JSON.stringify(p.labels)}`;
      return `- **Chart:** ${p.chartType} ${p.w}×${p.h}; ${data}; series colors ${p.colors.join(', ')}; up ${p.upColor}, down ${p.downColor}; axis ${p.axisColor}; text ${p.textColor} (${p.fontFamily}); axis ${p.showAxis ? 'on' : 'off'}, labels ${p.showLabels ? 'on' : 'off'}, values ${p.showValues ? 'on' : 'off'}; stroke ${p.strokeWidth}px; stagger ${p.stagger} (item i grows over progress window [i·s/(n-1), i·s/(n-1) + 1 - s]).`;
    }
    case 'counter': {
      const p = el.props;
      return `- **Counter:** counts ${p.from} → ${p.to} as progress goes 0 → 1 (value = from + (to - from)·progress), ${p.decimals} decimals, ${p.separator ? 'thousands separators' : 'no separators'}, prefix "${p.prefix}", suffix "${p.suffix}". Font ${p.fontFamily} ${p.fontSize}px weight ${p.fontWeight}, color ${p.color}, centred.`;
    }
    case 'character': return describeCharacter(assets.characters[el.props.characterId], el, assets);
    case 'illustration': return describeIllustration(assets.illustrations[el.props.illustrationId], el);
    case 'image': return `- **Image:** ${el.props.w}×${el.props.h}, radius ${el.props.radius}, fit ${el.props.fit}. Source file in \`assets/images/${el.id}.png\`.`;
    case 'fx': {
      const p = el.props;
      return `- **Background FX:** ${p.kind} over ${p.w}×${p.h}, colors ${p.color} / ${p.color2}, count ${p.count}, speed ${p.speed}, size ${p.size}, seed ${p.seed} (deterministic pseudo-random: rnd(seed,i) = frac(sin(seed·9301 + i·49297 + 233.3)·233280)). Clipped to its box.`;
    }
  }
}

function sampleTable(el: SceneElement, fps: number, format: FormatDef, maxRows = 36) {
  const startF = Math.ceil(el.start * fps), endF = Math.floor(el.end * fps);
  const total = Math.max(1, endF - startF);
  const step = Math.max(1, Math.ceil(total / maxRows));
  const rows: string[] = [];
  for (let f = startF; f <= endF; f += step) {
    const s = evaluateElement(el, f / fps, format.id);
    rows.push(`| ${f} | ${f3(f / fps)} | ${f2(s.x)} | ${f2(s.y)} | ${f3(s.scale * s.sx * (s.flip ?? 1))} | ${f3(s.scale * s.sy)} | ${f2(s.rotation)} | ${f3(Math.max(0, Math.min(1, s.opacity)))} | ${f3(s.progress)}${s.blur ? ` (blur ${f2(s.blur)})` : ''}${s.wipe !== undefined ? ` (wipe ${f3(s.wipe)})` : ''} |`);
  }
  if ((endF - startF) % step !== 0) {
    const s = evaluateElement(el, endF / fps, format.id);
    rows.push(`| ${endF} | ${f3(endF / fps)} | ${f2(s.x)} | ${f2(s.y)} | ${f3(s.scale * s.sx)} | ${f3(s.scale * s.sy)} | ${f2(s.rotation)} | ${f3(Math.max(0, Math.min(1, s.opacity)))} | ${f3(s.progress)} |`);
  }
  return ['| Frame | Time s | x (center) | y (center) | scaleX | scaleY | rotation° | opacity | progress |', '|---|---|---|---|---|---|---|---|---|', ...rows].join('\n');
}

function keyframeTable(el: SceneElement, fps: number) {
  const rows: string[] = [];
  Object.entries(el.tracks).forEach(([prop, kfs]) => {
    [...(kfs ?? [])].sort((a, b) => a.time - b.time).forEach((k) => rows.push(`| ${prop} | ${f3(k.time)} | ${Math.round(k.time * fps)} | ${typeof k.value === 'number' ? f3(k.value) : k.value} | ${describeEasing(k.easing)} |`));
  });
  if (!rows.length) return '- Keyframes: none (motion comes from entrance / exit / loop only).';
  return ['- **Keyframes** (x / y are OFFSETS in px added to the resting position; scale multiplies; easing applies from this key to the next):', '', '| Property | Time s | Frame | Value | Easing to next |', '|---|---|---|---|---|', ...rows].join('\n');
}

function describeElement(el: SceneElement, i: number, sc: Scene, inp: PromptInput) {
  const { format, fps, assets } = inp;
  const L = layoutFor(el, format.id);
  const size = elementSize(el, assets);
  const fx = el.effects ?? {};
  const effects = [
    fx.glow ? `glow ${fx.glow.color} (gaussian ${fx.glow.size}px, merged twice under the source)` : '',
    fx.shadow ? `drop shadow ${fx.shadow.color} blur ${fx.shadow.blur} offset (${fx.shadow.dx}, ${fx.shadow.dy})` : '',
    fx.blur ? `static blur ${fx.blur}px` : '',
    fx.blend && fx.blend !== 'normal' ? `blend mode ${fx.blend}` : '',
  ].filter(Boolean).join('; ');
  return [
    `### Layer ${i + 1}: "${el.name}" (${el.type}, id \`${el.id}\`)`,
    '',
    `- **Resting position (${format.name}):** centre (${f2(L.x)}, ${f2(L.y)}) px = (${pct(L.x, format.width)}, ${pct(L.y, format.height)}) of frame; scale ${f3(L.scale)}; rotation ${f2(L.rotation)}°; keyframed-offset multiplier ${L.motionScale ?? 1}. Approx. unscaled size ${Math.round(size.w)}×${Math.round(size.h)} px → on-screen ≈ ${Math.round(size.w * L.scale)}×${Math.round(size.h * L.scale)} px.`,
    `- **Visible:** ${f3(el.start)} s → ${f3(el.end)} s (frames ${Math.round(el.start * fps)}–${Math.round(el.end * fps)}).${el.hidden ? ' (layer hidden — do not render)' : ''}`,
    describeAppearance(el, assets),
    animLine(el.animIn, fps, el.start, 'Entrance'),
    animLine(el.animOut, fps, el.end - (el.animOut?.duration ?? 0), 'Exit'),
    el.loop.type !== 'none' ? `- **Loop:** ${el.loop.type} at ${el.loop.speed} cycles/s, amount ${el.loop.amount} (applied after entrance/exit, time = seconds since element start).` : '- **Loop:** none',
    effects ? `- **Effects:** ${effects}.` : '- **Effects:** none',
    keyframeTable(el, fps),
    '',
    `- **Computed motion samples (ground truth — your render must match these values at these frames):**`,
    '',
    sampleTable(el, fps, format),
    '',
  ].join('\n');
}

function describeBackground(sc: Scene) {
  const b = sc.background;
  const m = b.motion !== 'none' ? ` Animated: ${b.motion} at ${b.motionSpeed}× (drift: pattern offset = (t·30·speed) mod patternSize; gradientShift: angle += 20°·speed·t; pulse: radial radius ×(1 + 0.15·sin(π·speed·t))).` : '';
  switch (b.type) {
    case 'solid': return `Solid ${b.color}.${m}`;
    case 'linear': return `Linear gradient ${b.color} → ${b.color2} at ${b.angle}°.${m}`;
    case 'radial': return `Radial gradient, centre (50%, 45%) ${b.color2} → edges ${b.color}, radius 75%.${m}`;
    case 'grid': return `${b.color} with ${b.patternSize}px grid lines in ${b.patternColor} (1.2px)${b.color2 !== b.color ? ` and a centred radial glow of ${b.color2} at 55% opacity` : ''}.${m}`;
    case 'dots': return `${b.color} with ${b.patternSize}px dot grid (r 2.2px) in ${b.patternColor}.${m}`;
    case 'paper': return `Paper/whiteboard ${b.color} with ${Math.round(b.patternSize * 1.2)}px faint grid in ${b.patternColor} at 50% opacity.${m}`;
    case 'transparent': return 'Transparent (alpha) — render with NO background.';
  }
}

function describeCameraBlock(sc: Scene, fps: number) {
  const tr = sc.camera?.tracks ?? {};
  const rows: string[] = [];
  Object.entries(tr).forEach(([prop, kfs]) => [...(kfs ?? [])].sort((a, b) => a.time - b.time).forEach((k) => rows.push(`| ${prop} | ${f3(k.time)} | ${Math.round(k.time * fps)} | ${k.value} | ${describeEasing(k.easing)} |`)));
  const lines = ['Camera transform applied to ALL elements (not the background): translate(W/2, H/2) → scale(zoom) → rotate(rotation) → translate(-W/2 - camX, -H/2 - camY).'];
  if (rows.length) lines.push('', '| Property | Time s | Frame | Value | Easing to next |', '|---|---|---|---|---|', ...rows);
  else lines.push('No camera keyframes (static camera, zoom 1).');
  if (sc.camera?.shake) lines.push(`Camera shake: ±${sc.camera.shake}px, new random offset 24×/s (deterministic hash noise).`);
  const samples = [0, sc.duration / 2, sc.duration].map((t) => { const c = evaluateCamera(sc.camera, t); return `t=${f2(t)}s → x ${f2(c.x)}, y ${f2(c.y)}, zoom ${f3(c.zoom)}, rotation ${f2(c.rotation)}`; });
  lines.push('', `Samples: ${samples.join(' · ')}`);
  return lines.join('\n');
}

export function buildPrompt(inp: PromptInput): string {
  const { format, fps, preset, scenes } = inp;
  const totalDur = scenes.reduce((s, x) => s + x.duration, 0);
  const aspect = format.width > format.height ? '16:9 landscape' : format.width < format.height ? '9:16 vertical (YouTube Shorts)' : '1:1 square';
  const refs = inp.referenceFiles?.length ? inp.referenceFiles.map((f) => `\`${f}\``).join(', ') : 'the reference video / GIF exported with this prompt';
  const out: string[] = [];
  out.push(
    `# Claude Replication Prompt — ${inp.title}`,
    `**Composition:** ${format.name} · ${format.width}×${format.height} px · ${aspect} · ${fps} fps · ${f3(totalDur)} s (${Math.round(totalDur * fps)} frames)`,
    '',
    '## 0. Non-negotiable rules',
    '',
    `You are reproducing an existing, finished animation. This is a **replication task, not a design task**.`,
    '',
    `1. **Inspect the visual reference first** (${refs}). Step through it frame by frame. It is the source of truth for look and motion.`,
    '2. **Read this whole document** — it is the technical implementation guide with exact numbers.',
    '3. **Do NOT redesign, simplify, reinterpret, restyle, "improve" or improvise anything.** No new colors, fonts, shapes, characters, easing, timing, layout or effects. No extra elements. Nothing removed.',
    '4. Reproduce **exact** positions (px), sizes, colors (hex), stroke widths, z-order, timing (frames), easing curves and camera motion.',
    '5. Character and illustration proportions must be identical. Use the exported assets in `assets/` and `characters/` wherever possible instead of redrawing.',
    `6. The output must be exactly ${format.width}×${format.height} at ${fps} fps and ${Math.round(totalDur * fps)} frames long.`,
    '7. If something is ambiguous, choose the option that matches the reference frames — never a "nicer" alternative. If something cannot be matched, say so explicitly instead of approximating silently.',
    '8. After implementing, verify against the "Computed motion samples" tables and the checkpoint frames in section 6.',
    '',
    '## 1. Global conventions',
    '',
    '- Coordinates are composition pixels, origin top-left. **Every element position is its CENTRE.**',
    '- Element transform order: `translate(x, y) → rotate(rotation°, clockwise) → scale(scaleX, scaleY)`, then opacity, then filters.',
    '- Evaluation order per frame: resting layout → keyframe tracks → entrance → exit → loop.',
    '- Keyframed x / y values are OFFSETS from the resting position (multiplied by the format\'s motion multiplier). Scale keys multiply the resting scale.',
    '- Easing between keyframes uses the easing stored on the EARLIER key. All named easings map to these exact curves:',
    '',
    ...['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic', 'easeInExpo', 'easeOutExpo', 'easeInOutExpo', 'easeInBack', 'easeOutBack', 'easeInOutBack', 'easeOutBounce', 'easeOutElastic'].map((e) => `  - ${describeEasing(e as never)}`),
    '',
    '- Fonts are system fonts (listed per element) so text metrics match the reference.',
    '',
  );
  if (preset) {
    out.push(
      '## 2. Visual style (preset)',
      '',
      `- **Preset:** ${preset.name} — ${preset.description}`,
      `- **Palette:** primary ${preset.palette.primary}, secondary ${preset.palette.secondary}, accent ${preset.palette.accent}, text ${preset.palette.text}, muted ${preset.palette.muted}, positive ${preset.palette.positive}, negative ${preset.palette.negative}, outline ${preset.palette.outline}.`,
      `- **Line thickness:** ${preset.lineWidth}px base; illustration outline ${preset.illustration.outline} ${preset.illustration.outlineWidth}px.`,
      `- **Typography:** ${preset.typography.fontFamily}; headings ${preset.typography.headingWeight}, body ${preset.typography.bodyWeight}${preset.typography.uppercase ? ', UPPERCASE' : ''}, letter-spacing ${preset.typography.letterSpacing}px.`,
      `- **Motion character:** default entrance ${preset.animation.in.type} ${preset.animation.in.duration}s ${describeEasing(preset.animation.in.easing)}; exit ${preset.animation.out.type}; stagger ${preset.animation.stagger}s; character movement ${preset.movement.default} at ${preset.movement.speed}×.`,
      `- **Transitions:** ${preset.transition.type} ${preset.transition.duration}s. **Effects:** ${preset.effects.glow ? `glow ${preset.effects.glowColor} ${preset.effects.glowSize}px` : 'no glow'}${preset.effects.shadow ? ', soft drop shadows' : ''}.`,
      '',
    );
  }
  let offset = 0;
  scenes.forEach((sc, si) => {
    const els = inp.onlyElementIds ? sc.elements.filter((e) => inp.onlyElementIds!.includes(e.id)) : sc.elements;
    out.push(
      `## ${scenes.length > 1 ? `3.${si + 1}` : '3'}. Scene${scenes.length > 1 ? ` ${si + 1}` : ''}: "${sc.name}"`,
      '',
      `- **Timing:** ${f3(sc.duration)} s (${Math.round(sc.duration * fps)} frames)${scenes.length > 1 ? `, starts at ${f3(offset)} s (frame ${Math.round(offset * fps)}) of the sequence` : ''}. All times below are scene-relative.`,
      `- **Background:** ${inp.onlyElementIds ? 'NONE (isolated element export — transparent)' : describeBackground(sc)}`,
      `- **Transition in:** ${si === 0 && scenes.length > 1 ? 'n/a (first scene)' : sc.transitionIn.type === 'none' ? 'cut' : `${sc.transitionIn.type}, ${sc.transitionIn.duration}s, ${describeEasing(sc.transitionIn.easing)} (the previous scene stays frozen on its last frame underneath)`}`,
      sc.notes ? `- **Author notes:** ${sc.notes}` : '',
      '',
      '#### Camera',
      describeCameraBlock(sc, fps),
      '',
      '#### Layer stack (bottom → top; later layers draw on top)',
      '',
      '| # | Name | Type | Frames | Centre px | Centre % | Scale | Rot° |',
      '|---|---|---|---|---|---|---|---|',
      ...els.map((e, i) => { const L = layoutFor(e, format.id); return `| ${i + 1} | ${e.name} | ${e.type} | ${Math.round(e.start * fps)}–${Math.round(e.end * fps)} | ${f2(L.x)}, ${f2(L.y)} | ${pct(L.x, format.width)}, ${pct(L.y, format.height)} | ${f3(L.scale)} | ${f2(L.rotation)} |`; }),
      '',
      '#### Elements',
      '',
      ...els.map((e, i) => describeElement(e, i, sc, inp)),
    );
    offset += sc.duration;
  });

  const checkpoints = new Set<number>([0]);
  let acc = 0;
  scenes.forEach((sc) => {
    sc.elements.forEach((e) => { [e.start + (e.animIn.delay ?? 0) + e.animIn.duration, e.end - e.animOut.duration].forEach((t) => checkpoints.add(Math.round((acc + t) * fps))); });
    checkpoints.add(Math.round((acc + sc.duration / 2) * fps));
    acc += sc.duration;
  });
  checkpoints.add(Math.round(totalDur * fps) - 1);
  const cps = [...checkpoints].filter((f) => f >= 0 && f < Math.round(totalDur * fps)).sort((a, b) => a - b).slice(0, 24);

  out.push(
    '## 4. Remotion implementation guide',
    '',
    '```tsx',
    `// Root.tsx — register the composition with these exact values`,
    `<Composition id="${slugId(inp.title)}-${format.id}" component={Animation} width={${format.width}} height={${format.height}} fps={${fps}} durationInFrames={${Math.round(totalDur * fps)}} />`,
    '',
    '// Inside the component:',
    'const frame = useCurrentFrame();',
    `const t = frame / ${fps}; // seconds — evaluate every property from t, never from wall-clock time`,
    '```',
    '',
    '- Render everything as one `<svg viewBox="0 0 W H">` (or absolutely positioned layers) so positions map 1:1 to pixels.',
    '- Implement easing with the cubic-bezier values above (Remotion: `Easing.bezier(x1, y1, x2, y2)` + `interpolate(t, [t0, t1], [v0, v1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" })`).',
    '- Draw-on strokes: `pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress}`; fills fade in once progress > 0.55.',
    '- **Fastest exact path:** the export package contains `remotion/` with the original renderer source (`src/engine/*`) and `scene.json`. Rendering `<SceneSVG scene={...} assets={...} format={...} time={frame / fps} />` reproduces this animation pixel-for-pixel. Prefer that over re-implementing.',
    '',
    '## 5. Exported assets to reuse',
    '',
    '- `assets/illustrations/*.svg` — original vector illustrations (layer-separated, part ids preserved).',
    '- `characters/*.json` + `characters/*-sheet.svg` — character definitions and pose sheets (exact proportions).',
    '- `characters/references/*` — uploaded character reference images.',
    '- `data/scene.json`, `data/keyframes.json`, `data/timing.json`, `data/layers.json` — machine-readable source of truth.',
    '- `snapshots/*.svg` — exact vector frames at key moments.',
    '',
    '## 6. Verification checkpoints',
    '',
    `Compare your render with the reference at these frames (side by side or overlaid at 50% opacity). Every element must align within 2px and match color/opacity: ${cps.map((f) => `**${f}** (${f3(f / fps)}s)`).join(', ')}.`,
    '',
    'Final reminder: maximum visual fidelity. Do not reinterpret — replicate.',
  );
  if (inp.extraNotes) out.push('', '## 7. Additional notes', '', inp.extraNotes);
  return out.filter((l) => l !== undefined).join('\n');
}

const slugId = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'Animation';
