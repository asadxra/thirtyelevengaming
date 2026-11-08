import { elementSize } from '../engine/render';
import type {
  AssetBundle, Background, Character, ElementPropsMap, ElementType, FormatDef, LayoutBox, Scene, SceneElement,
} from '../engine/schema';
import { LANDSCAPE, SHORTS } from '../engine/schema';
import { BUILTIN_PRESETS, type StylePreset } from './presets';

export const uid = (p = '') => `${p}${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 8)}`;

export const DEFAULT_FORMATS: FormatDef[] = [LANDSCAPE, SHORTS];

export function defaultBackground(preset?: StylePreset): Background {
  return structuredClone(preset?.background ?? BUILTIN_PRESETS[2].background);
}

export function newScene(name: string, preset?: StylePreset, fps = 30): Scene {
  return {
    id: uid('sc_'),
    name,
    duration: 5,
    fps,
    background: defaultBackground(preset),
    elements: [],
    camera: { tracks: {}, shake: 0 },
    transitionIn: structuredClone(preset?.transition ?? { type: 'fade', duration: 0.5, easing: 'easeInOut' }),
    presetId: preset?.id,
    updatedAt: Date.now(),
  };
}

export function newCharacter(preset?: StylePreset, name = 'New Character'): Character {
  const base: Character = {
    id: uid('ch_'),
    name,
    style: preset?.characterStyle ?? 'minimal',
    proportions: { headSize: 40, torsoLength: 110, torsoWidth: 52, armLength: 104, legLength: 124, limbWidth: 15, lineWidth: 6 },
    colors: { skin: '#f2c7a5', hair: '#2b1d14', shirt: '#7c5cff', pants: '#22264a', shoes: '#15161f', outline: '#0b0c16', accent: '#22d3ee', eyes: '#15161f' },
    hair: 'short',
    outfit: 'tshirt',
    accessory: 'none',
    references: [],
    createdAt: Date.now(),
  };
  if (preset) {
    Object.assign(base.colors, preset.character.colors);
    Object.assign(base.proportions, preset.character.proportions);
    base.hair = preset.character.hair;
    base.outfit = preset.character.outfit;
  }
  return base;
}

/* ---------------------------------------------------------------- layout */

export function fitScale(size: { w: number; h: number }, scale: number, f: FormatDef, margin = 0.92) {
  const maxW = f.width * margin, maxH = f.height * margin;
  let s = scale;
  if (size.w * s > maxW) s = maxW / size.w;
  if (size.h * s > maxH) s = maxH / size.h;
  return s;
}

export type AdaptStrategy = 'proportional' | 'stack';

/**
 * Derive a layout for `to` from a layout in `from` WITHOUT stretching: positions are
 * re-mapped, uniform scale is preserved (only reduced if the element would overflow).
 */
export function adaptBox(box: LayoutBox, from: FormatDef, to: FormatDef, size: { w: number; h: number }, strategy: AdaptStrategy = 'proportional', isBackdrop = false): LayoutBox {
  const nx = box.x / from.width, ny = box.y / from.height;
  const unit = Math.min(to.width, to.height) / Math.min(from.width, from.height);
  if (isBackdrop) {
    return { x: to.width / 2 + (nx - 0.5) * to.width, y: to.height / 2 + (ny - 0.5) * to.height, rotation: box.rotation, scale: Math.max(to.width / size.w, to.height / size.h) * 1.02, motionScale: box.motionScale ?? 1, auto: true };
  }
  let x = nx * to.width, y = ny * to.height;
  const fromLand = from.width > from.height, toTall = to.height > to.width;
  if (strategy === 'stack' && fromLand && toTall) {
    // side-by-side columns become stacked rows; horizontal spread compresses toward centre
    x = to.width * (0.5 + (nx - 0.5) * 0.45);
    y = to.height * (0.14 + 0.72 * (0.55 * nx + 0.45 * ny));
  } else if (strategy === 'stack' && !fromLand && !toTall) {
    x = to.width * (0.18 + 0.64 * (0.6 * ny + 0.4 * nx));
    y = to.height * (0.5 + (ny - 0.5) * 0.45);
  }
  const scale = fitScale(size, box.scale * unit, to);
  const hw = (size.w * scale) / 2, hh = (size.h * scale) / 2;
  x = Math.min(Math.max(x, Math.min(hw, to.width / 2)), Math.max(to.width - hw, to.width / 2));
  y = Math.min(Math.max(y, Math.min(hh, to.height / 2)), Math.max(to.height - hh, to.height / 2));
  return { x, y, scale, rotation: box.rotation, motionScale: (box.motionScale ?? 1) * (toTall && fromLand ? 0.75 : 1), auto: true };
}

export function isBackdrop(el: SceneElement) {
  return el.type === 'fx' || (el.type === 'shape' && el.name.toLowerCase().includes('backdrop'));
}

/** Fill in / refresh auto layouts for every format from the given source format. */
export function syncAutoLayouts(el: SceneElement, formats: FormatDef[], sourceId: string, assets: AssetBundle, force = false, strategy: AdaptStrategy = 'proportional') {
  const src = el.layout[sourceId];
  const from = formats.find((f) => f.id === sourceId);
  if (!src || !from) return;
  const size = elementSize(el, assets);
  for (const f of formats) {
    if (f.id === sourceId) continue;
    const cur = el.layout[f.id];
    if (!cur || cur.auto || force) el.layout[f.id] = adaptBox(src, from, f, size, strategy, isBackdrop(el));
  }
}

/* -------------------------------------------------------------- elements */

export function defaultProps<T extends ElementType>(type: T, preset: StylePreset, extra: Partial<ElementPropsMap[T]> = {}): ElementPropsMap[T] {
  const pal = preset.palette, ty = preset.typography;
  const map: { [K in ElementType]: ElementPropsMap[K] } = {
    text: {
      text: 'Your headline here', fontFamily: ty.fontFamily, fontSize: ty.headingSize, fontWeight: ty.headingWeight, color: pal.text,
      align: 'middle', lineHeight: 1.15, letterSpacing: ty.letterSpacing, uppercase: ty.uppercase, kinetic: 'words', stagger: preset.animation.stagger,
      highlight: '', highlightColor: pal.primary, stroke: '', strokeWidth: 0, padding: 28,
    },
    shape: { shape: 'rect', w: 360, h: 220, fill: pal.primary, stroke: 'none', strokeWidth: 0, radius: 28, sides: 6 },
    arrow: { dx: 420, dy: 0, curve: 0.2, color: pal.secondary, strokeWidth: preset.lineWidth * 1.4, headSize: 34, doubleHead: false, dashed: false, style: 'solid' },
    chart: {
      chartType: 'bar', w: 900, h: 560, data: [24, 38, 52, 71, 96], candles: sampleCandles(), labels: ['2021', '2022', '2023', '2024', '2025'],
      colors: preset.illustration.fills, upColor: pal.positive, downColor: pal.negative, axisColor: pal.muted, textColor: pal.text,
      showAxis: true, showLabels: true, showValues: true, strokeWidth: 8, fontFamily: ty.fontFamily, stagger: 0.5,
    },
    counter: { from: 0, to: 1250000, decimals: 0, prefix: '$', suffix: '', separator: true, fontFamily: ty.fontFamily, fontSize: 160, fontWeight: 900, color: pal.primary },
    character: { characterId: '', pose: 'idle', expression: 'happy', movement: preset.movement.default, movementSpeed: preset.movement.speed, flip: false, talking: false },
    illustration: { illustrationId: 'ill-coin', partAnimations: true },
    image: { src: '', w: 600, h: 400, radius: 24, fit: 'contain' },
    fx: { kind: 'particles', w: 1920, h: 1920, color: pal.primary, color2: pal.secondary, count: 60, speed: 1, size: 6, seed: Math.floor(Math.random() * 1000) },
  };
  return { ...map[type], ...extra } as ElementPropsMap[T];
}

export function sampleCandles() {
  const out = [];
  let p = 100;
  const seq = [1, 1, -1, 1, -1, -1, 1, 1, 1, -1, 1, 1];
  for (let i = 0; i < seq.length; i++) {
    const o = p, c = p + seq[i] * (6 + ((i * 7) % 9));
    out.push({ o, c, h: Math.max(o, c) + 3 + (i % 4), l: Math.min(o, c) - 3 - ((i * 3) % 5) });
    p = c;
  }
  return out;
}

const DEFAULT_NAMES: Record<ElementType, string> = {
  text: 'Text', shape: 'Shape', arrow: 'Arrow', chart: 'Chart', counter: 'Counter', character: 'Character', illustration: 'Illustration', image: 'Image', fx: 'Background FX',
};

export function newElement<T extends ElementType>(
  type: T,
  opts: { preset: StylePreset; formats: FormatDef[]; formatId: string; assets: AssetBundle; start?: number; end?: number; props?: Partial<ElementPropsMap[T]>; name?: string; at?: { x: number; y: number } },
): SceneElement {
  const { preset, formats, formatId, assets } = opts;
  const f = formats.find((x) => x.id === formatId) ?? formats[0];
  const props = defaultProps(type, preset, opts.props);
  const el = {
    id: uid('el_'),
    type,
    name: opts.name ?? DEFAULT_NAMES[type],
    start: opts.start ?? 0,
    end: opts.end ?? 5,
    layout: {} as Record<string, LayoutBox>,
    props,
    animIn: structuredClone(type === 'fx' ? { type: 'fade', duration: 0.6, easing: 'easeOut', delay: 0 } : type === 'arrow' || type === 'chart' || type === 'counter' ? { ...preset.animation.in, type: type === 'chart' || type === 'counter' || type === 'arrow' ? 'draw' : preset.animation.in.type, duration: type === 'counter' ? 1.5 : 1 } : preset.animation.in),
    animOut: structuredClone(preset.animation.out),
    loop: structuredClone(type === 'character' || type === 'fx' ? { type: 'none', speed: 1, amount: 0 } : { type: 'none', speed: 1, amount: 0 }),
    tracks: {},
    effects: preset.effects.glow && (type === 'text' || type === 'counter' || type === 'chart') ? { glow: { color: preset.effects.glowColor, size: preset.effects.glowSize } } : preset.effects.shadow && type !== 'fx' ? { shadow: { color: '#00000055', blur: 10, dx: 0, dy: 8 } } : {},
  } as SceneElement;
  if (type === 'fx') { (el as any).animIn.duration = 0.6; }
  const size = elementSize(el, assets);
  const at = opts.at ?? { x: f.width / 2, y: f.height / 2 };
  const backdrop = isBackdrop(el);
  el.layout[f.id] = backdrop
    ? { x: f.width / 2, y: f.height / 2, scale: Math.max(f.width / size.w, f.height / size.h) * 1.02, rotation: 0, auto: false, motionScale: 1 }
    : { x: at.x, y: at.y, scale: fitScale(size, type === 'character' ? 1.4 : 1, f, 0.8), rotation: 0, auto: false, motionScale: 1 };
  syncAutoLayouts(el, formats, f.id, assets, true);
  return el;
}

/* -------------------------------------------------------------- cloning */

export function cloneScene(s: Scene, name?: string): Scene {
  const c = structuredClone(s);
  c.id = uid('sc_');
  if (name) c.name = name;
  c.elements = c.elements.map((e) => ({ ...e, id: uid('el_'), tracks: Object.fromEntries(Object.entries(e.tracks).map(([k, v]) => [k, v?.map((kf) => ({ ...kf, id: uid('kf_') }))])) }));
  c.updatedAt = Date.now();
  return c;
}

export function cloneElement(e: SceneElement): SceneElement {
  const c = structuredClone(e);
  c.id = uid('el_');
  c.name = `${e.name} copy`;
  Object.values(c.layout).forEach((l) => { l.x += 30; l.y += 30; });
  return c;
}

/** Restyle a scene with a preset (colors, type, background, motion defaults). */
export function applyPresetToScene(scene: Scene, preset: StylePreset) {
  const pal = preset.palette;
  scene.background = structuredClone(preset.background);
  scene.transitionIn = structuredClone(preset.transition);
  scene.presetId = preset.id;
  scene.elements.forEach((el) => {
    switch (el.type) {
      case 'text':
        Object.assign(el.props, { fontFamily: preset.typography.fontFamily, fontWeight: preset.typography.headingWeight, color: pal.text, uppercase: preset.typography.uppercase, letterSpacing: preset.typography.letterSpacing, highlightColor: pal.primary });
        break;
      case 'counter': Object.assign(el.props, { fontFamily: preset.typography.fontFamily, color: pal.primary }); break;
      case 'shape': if (el.props.fill !== 'none') el.props.fill = pal.primary; break;
      case 'arrow': Object.assign(el.props, { color: pal.secondary, strokeWidth: preset.lineWidth * 1.4 }); break;
      case 'chart': Object.assign(el.props, { colors: preset.illustration.fills, upColor: pal.positive, downColor: pal.negative, axisColor: pal.muted, textColor: pal.text, fontFamily: preset.typography.fontFamily }); break;
      case 'fx': Object.assign(el.props, { color: pal.primary, color2: pal.secondary }); break;
      case 'character': el.props.movement = el.props.movement === 'none' ? 'none' : preset.movement.default; el.props.movementSpeed = preset.movement.speed; break;
    }
    if (el.type !== 'fx' && el.type !== 'chart' && el.type !== 'counter' && el.type !== 'arrow') el.animIn = { ...structuredClone(preset.animation.in), delay: el.animIn.delay ?? 0 };
    el.animOut = structuredClone(preset.animation.out);
    el.effects = preset.effects.glow && (el.type === 'text' || el.type === 'counter' || el.type === 'chart') ? { glow: { color: preset.effects.glowColor, size: preset.effects.glowSize } } : preset.effects.shadow && el.type !== 'fx' ? { shadow: { color: '#00000055', blur: 10, dx: 0, dy: 8 } } : {};
  });
}
