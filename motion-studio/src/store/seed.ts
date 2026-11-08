import { builtinIllustrations } from '../engine/illustrations';
import { BUILTIN_MOVEMENTS, BUILTIN_POSES } from '../engine/poses';
import type { AssetBundle, Character, ElementPropsMap, ElementType, FormatDef, Scene, SceneElement } from '../engine/schema';
import { DEFAULT_FORMATS, newCharacter, newElement, newScene, uid } from '../lib/factory';
import { BUILTIN_PRESETS, type StylePreset } from '../lib/presets';
import type { Clip, Project, StudioData } from './store';

const preset = (id: string) => BUILTIN_PRESETS.find((p) => p.id === id)!;

export function buildSeed(): StudioData {
  const alex: Character = { ...newCharacter(preset('preset-finance'), 'Alex — Finance Host'), id: 'ch_alex', accessory: 'glasses' };
  const sam: Character = { ...newCharacter(preset('preset-stickman'), 'Sam — Stickman'), id: 'ch_sam' };
  const mia: Character = { ...newCharacter(preset('preset-cartoon'), 'Mia — Cartoon Guide'), id: 'ch_mia', hair: 'long' };
  const characters = [alex, sam, mia];

  const assets: AssetBundle = {
    characters: Object.fromEntries(characters.map((c) => [c.id, c])),
    illustrations: Object.fromEntries(builtinIllustrations().map((i) => [i.id, i])),
    poses: Object.fromEntries(BUILTIN_POSES.map((p) => [p.id, p.pose])),
    movements: Object.fromEntries(BUILTIN_MOVEMENTS.map((m) => [m.id, m])),
  };
  const formats: FormatDef[] = structuredClone(DEFAULT_FORMATS);

  const mk = <T extends ElementType>(sc: Scene, p: StylePreset, type: T, o: { name?: string; at?: { x: number; y: number }; props?: Partial<ElementPropsMap[T]>; shorts?: { x: number; y: number; scale?: number } }) => {
    const el = newElement(type, { preset: p, formats, formatId: 'landscape', assets, name: o.name, at: o.at, props: o.props, end: sc.duration });
    if (o.shorts) el.layout.shorts = { ...el.layout.shorts, x: o.shorts.x, y: o.shorts.y, scale: o.shorts.scale ?? el.layout.shorts.scale, auto: false };
    sc.elements.push(el);
    return el;
  };

  /* ------------------------------------------------ demo project scenes */
  const fin = preset('preset-finance');
  const s1 = newScene('Hook — Your money can grow', fin);
  s1.duration = 6;
  mk(s1, fin, 'fx', { name: 'Floating particles', props: { kind: 'particles', count: 50, size: 4, color: '#22d39a', color2: '#3b82f6' } });
  const title = mk(s1, fin, 'text', { name: 'Headline', at: { x: 640, y: 300 }, props: { text: 'Why compound\ninterest wins', fontSize: 104, highlight: 'compound', highlightColor: '#22d39a', align: 'middle' }, shorts: { x: 540, y: 420, scale: 0.95 } });
  title.animIn = { type: 'slideUp', duration: 0.6, easing: 'easeOutExpo', delay: 0.2, distance: 120 };
  const host = mk(s1, fin, 'character', { name: 'Alex', at: { x: 1420, y: 600 }, props: { characterId: 'ch_alex', pose: 'present', movement: 'talk', expression: 'happy', talking: true }, shorts: { x: 540, y: 1380, scale: 1.5 } });
  host.animIn = { type: 'slideLeft', duration: 0.7, easing: 'easeOutCubic', delay: 0, distance: 300 };
  const coin = mk(s1, fin, 'illustration', { name: 'Gold coin', at: { x: 560, y: 720 }, props: { illustrationId: 'ill-coin' }, shorts: { x: 540, y: 860, scale: 0.8 } });
  coin.layout.landscape.scale = 0.75;
  coin.animIn = { type: 'pop', duration: 0.5, easing: 'easeOutBack', delay: 0.9 };
  coin.loop = { type: 'float', speed: 0.5, amount: 12 };
  const counter = mk(s1, fin, 'counter', { name: 'Balance counter', at: { x: 640, y: 940 }, props: { from: 1000, to: 21724, prefix: '$', fontSize: 110 }, shorts: { x: 540, y: 1080 } });
  counter.animIn = { type: 'draw', duration: 2.4, easing: 'easeInOutCubic', delay: 1.4 };
  counter.tracks.scale = [
    { id: uid('kf_'), time: 3.8, value: 1, easing: 'easeOutBack' },
    { id: uid('kf_'), time: 4.1, value: 1.15, easing: 'easeInOut' },
    { id: uid('kf_'), time: 4.5, value: 1, easing: 'linear' },
  ];
  s1.camera.tracks.zoom = [
    { id: uid('kf_'), time: 0, value: 1, easing: 'easeInOutCubic' },
    { id: uid('kf_'), time: 6, value: 1.06, easing: 'linear' },
  ];

  const s2 = newScene('Growth chart', fin);
  s2.duration = 5;
  const ch = mk(s2, fin, 'chart', { name: 'Growth chart', at: { x: 760, y: 560 }, props: { chartType: 'bar', data: [1000, 1610, 2594, 4177, 6727, 10835], labels: ['Y0', 'Y5', 'Y10', 'Y15', 'Y20', 'Y25'], w: 1100, h: 640 }, shorts: { x: 540, y: 1100, scale: 0.88 } });
  ch.animIn = { type: 'draw', duration: 1.8, easing: 'easeOutCubic', delay: 0.4 };
  mk(s2, fin, 'text', { name: 'Chart title', at: { x: 760, y: 160 }, props: { text: '10% a year, reinvested', fontSize: 72, kinetic: 'words' }, shorts: { x: 540, y: 520, scale: 1 } });
  const arr = mk(s2, fin, 'arrow', { name: 'Trend arrow', at: { x: 1480, y: 480 }, props: { dx: 260, dy: -300, curve: -0.25, color: '#ffd35c', style: 'sketch' }, shorts: { x: 820, y: 760, scale: 0.8 } });
  arr.animIn = { type: 'draw', duration: 0.8, easing: 'easeOutCubic', delay: 2.2 };
  const sam2 = mk(s2, fin, 'character', { name: 'Alex pointing', at: { x: 1640, y: 760 }, props: { characterId: 'ch_alex', pose: 'pointLeft', movement: 'idle', expression: 'confident' }, shorts: { x: 820, y: 1620, scale: 1.1 } });
  sam2.layout.landscape.scale = 1.1;
  s2.transitionIn = { type: 'wipe', duration: 0.6, easing: 'easeInOutCubic' };

  const project: Project = {
    id: 'pr_demo', title: 'Compound Interest Explained', description: 'Demo explainer: a finance host walks through why reinvesting returns snowballs over time.',
    formatId: 'landscape', presetId: fin.id, formats, scenes: [s1, s2], clipIds: [], exportHistory: [], createdAt: Date.now(), updatedAt: Date.now(),
  };

  /* --------------------------------------------------------- motion clips */
  const m2d = preset('preset-motion2d');
  const clip = (name: string, kind: Clip['kind'], category: string, sc: Scene, p: StylePreset, tags: string[] = []): Clip => ({
    id: uid('cl_'), name, kind, category, tags, scene: sc, formats: structuredClone(DEFAULT_FORMATS), presetId: p.id, createdAt: Date.now(), updatedAt: Date.now(),
  });

  const k1 = newScene('Kinetic Title', m2d);
  k1.duration = 3;
  const kt = mk(k1, m2d, 'text', { name: 'Kinetic title', props: { text: 'Stop wasting\nyour money', kinetic: 'words', stagger: 0.12, highlight: 'money', highlightColor: '#22d3ee', fontSize: 130 } });
  kt.animIn = { type: 'slideUp', duration: 0.5, easing: 'easeOutBack', delay: 0.1, distance: 160 };
  kt.animOut = { type: 'fade', duration: 0.3, easing: 'easeIn', delay: 0 };
  const bar = mk(k1, m2d, 'shape', { name: 'Underline bar', at: { x: 960, y: 700 }, props: { shape: 'rect', w: 620, h: 18, radius: 9, fill: '#ff5fa2' } });
  bar.animIn = { type: 'wipe', duration: 0.6, easing: 'easeOutCubic', delay: 0.8 };

  const k2 = newScene('Stat Counter', m2d);
  k2.duration = 3;
  const ring = mk(k2, m2d, 'shape', { name: 'Glow ring', props: { shape: 'ring', w: 520, h: 520, fill: '#7c5cff', strokeWidth: 18 } });
  ring.animIn = { type: 'draw', duration: 1.2, easing: 'easeInOutCubic', delay: 0 };
  ring.effects = { glow: { color: '#7c5cff', size: 16 } };
  const cnt = mk(k2, m2d, 'counter', { name: 'Percent', props: { from: 0, to: 87, suffix: '%', prefix: '', fontSize: 170, color: '#ffffff' } });
  cnt.animIn = { type: 'draw', duration: 1.2, easing: 'easeOutCubic', delay: 0 };
  mk(k2, m2d, 'text', { name: 'Caption', at: { x: 960, y: 880 }, props: { text: 'of traders lose money', fontSize: 56, kinetic: 'words' }, shorts: { x: 540, y: 1300 } });

  const k3 = newScene('Candles Reveal', fin);
  k3.duration = 4;
  const cc = mk(k3, fin, 'chart', { name: 'Candles', props: { chartType: 'candlestick', w: 1300, h: 700, stagger: 0.7 } });
  cc.animIn = { type: 'draw', duration: 2.2, easing: 'linear', delay: 0.2 };
  k3.camera.tracks.zoom = [{ id: uid('kf_'), time: 0, value: 1.15, easing: 'easeOutCubic' }, { id: uid('kf_'), time: 3, value: 1, easing: 'linear' }];

  const k4 = newScene('Comparison Connector', m2d);
  k4.duration = 3;
  const b1 = mk(k4, m2d, 'shape', { name: 'Card A', at: { x: 520, y: 540 }, props: { shape: 'rect', w: 420, h: 300, fill: '#7c5cff', fill2: '#4b2fd6' }, shorts: { x: 540, y: 520 } });
  b1.animIn = { type: 'pop', duration: 0.5, easing: 'easeOutBack', delay: 0 };
  const b2 = mk(k4, m2d, 'shape', { name: 'Card B', at: { x: 1400, y: 540 }, props: { shape: 'rect', w: 420, h: 300, fill: '#22d3ee', fill2: '#0e8fb0' }, shorts: { x: 540, y: 1400 } });
  b2.animIn = { type: 'pop', duration: 0.5, easing: 'easeOutBack', delay: 0.3 };
  const cn = mk(k4, m2d, 'arrow', { name: 'Connector', at: { x: 960, y: 540 }, props: { dx: 380, dy: 0, curve: 0.3, dashed: true, color: '#ffffff' }, shorts: { x: 540, y: 960, scale: 1 } });
  cn.layout.shorts.rotation = 90;
  cn.animIn = { type: 'draw', duration: 0.7, easing: 'easeInOutCubic', delay: 0.8 };

  const clips = [
    clip('Kinetic Title — Word Stagger', 'motion', 'Typography', k1, m2d, ['kinetic', 'title']),
    clip('Stat Ring Counter', 'motion', 'Statistics', k2, m2d, ['counter', 'stat']),
    clip('Candlestick Reveal + Camera Push', 'animation', 'Charts', k3, fin, ['trading', 'camera']),
    clip('Comparison Connector', 'motion', 'Infographics', k4, m2d, ['arrow', 'compare']),
  ];

  /* ------------------------------------------------------------ templates */
  const t1 = newScene('Title Card', m2d);
  const tt = mk(t1, m2d, 'text', { name: 'Title', props: { text: 'Big Bold Title', fontSize: 140 } });
  tt.animIn.delay = 0.2;
  mk(t1, m2d, 'fx', { name: 'Rays', props: { kind: 'rays', count: 18, speed: 0.4 } }).loop = { type: 'none', speed: 1, amount: 0 };
  t1.elements.reverse();

  const t2 = newScene('Host + Idea', preset('preset-cartoon'));
  mk(t2, preset('preset-cartoon'), 'character', { name: 'Mia', at: { x: 560, y: 600 }, props: { characterId: 'ch_mia', pose: 'thinking', movement: 'think', expression: 'thinking' }, shorts: { x: 540, y: 1300, scale: 1.6 } });
  const bulb = mk(t2, preset('preset-cartoon'), 'illustration', { name: 'Idea bulb', at: { x: 1300, y: 460 }, props: { illustrationId: 'ill-bulb' }, shorts: { x: 540, y: 560, scale: 1 } });
  bulb.animIn = { type: 'pop', duration: 0.6, easing: 'easeOutBack', delay: 0.6 };

  const templates = [
    { id: 'tp_title', name: 'Title Card', scene: t1, createdAt: Date.now() },
    { id: 'tp_host', name: 'Host + Idea', scene: t2, createdAt: Date.now() },
  ];

  return {
    projects: [project],
    clips,
    characters,
    illustrations: [],
    poses: [],
    movements: [],
    presets: [],
    templates,
    backgrounds: [],
    effects: [],
    exportHistory: [],
    settings: {
      accent: '#9b5cff', glow: 1, defaultFps: 30, defaultFormat: 'landscape', showSafeZones: true, reduceMotion: false, defaultPresetId: 'preset-motion2d', gifMaxWidth: 720,
    },
  };
}

export type { SceneElement };
