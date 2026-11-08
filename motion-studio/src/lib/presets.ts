import type { AnimSpec, Background, Character, CharacterStyle, Easing, LoopSpec, TransitionSpec } from '../engine/schema';

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  builtin?: boolean;
  characterStyle: CharacterStyle;
  character: {
    colors: Partial<Character['colors']>;
    proportions: Partial<Character['proportions']>;
    hair: Character['hair'];
    outfit: Character['outfit'];
  };
  palette: { primary: string; secondary: string; accent: string; text: string; muted: string; positive: string; negative: string; outline: string };
  illustration: { outline: string; outlineWidth: number; fills: string[] };
  lineWidth: number;
  background: Background;
  animation: { in: AnimSpec; out: AnimSpec; stagger: number; easing: Easing };
  movement: { default: string; speed: number; loop: LoopSpec };
  transition: TransitionSpec;
  typography: { fontFamily: string; headingWeight: number; bodyWeight: number; uppercase: boolean; letterSpacing: number; headingSize: number };
  effects: { glow: boolean; glowColor: string; glowSize: number; shadow: boolean };
}

const bg = (o: Partial<Background>): Background => ({
  type: 'solid', color: '#0b0c16', color2: '#1a1440', angle: 135, patternColor: '#ffffff22', patternSize: 60, motion: 'none', motionSpeed: 1, ...o,
});

const anim = (type: AnimSpec['type'], duration: number, easing: Easing, distance = 160): AnimSpec => ({ type, duration, easing, delay: 0, distance });

export const BUILTIN_PRESETS: StylePreset[] = [
  {
    id: 'preset-stickman', name: 'Explainer Stickman', builtin: true,
    description: 'Clean black-on-white stick figures, bold sans type, snappy pops.',
    characterStyle: 'stickman',
    character: { colors: { outline: '#111111', skin: '#ffffff', accent: '#ff4d4d' }, proportions: { lineWidth: 7, headSize: 34 }, hair: 'none', outfit: 'tshirt' },
    palette: { primary: '#111111', secondary: '#ff4d4d', accent: '#2f6bff', text: '#111111', muted: '#8a8a8a', positive: '#1aa260', negative: '#e53935', outline: '#111111' },
    illustration: { outline: '#111111', outlineWidth: 6, fills: ['#ffffff', '#ff4d4d', '#2f6bff', '#ffd35c'] },
    lineWidth: 7,
    background: bg({ type: 'solid', color: '#ffffff', color2: '#f2f2f2', patternColor: '#00000010' }),
    animation: { in: anim('pop', 0.45, 'easeOutBack'), out: anim('fade', 0.3, 'easeIn'), stagger: 0.08, easing: 'easeOutBack' },
    movement: { default: 'idle', speed: 1, loop: { type: 'none', speed: 1, amount: 0 } },
    transition: { type: 'slideLeft', duration: 0.5, easing: 'easeInOutCubic' },
    typography: { fontFamily: '"Arial Black", "Arial Bold", Gadget, sans-serif', headingWeight: 900, bodyWeight: 700, uppercase: false, letterSpacing: 0, headingSize: 110 },
    effects: { glow: false, glowColor: '#000000', glowSize: 0, shadow: false },
  },
  {
    id: 'preset-minimal', name: 'Minimalist Educational', builtin: true,
    description: 'Soft pastel palette, rounded shapes, gentle slides.',
    characterStyle: 'minimal',
    character: { colors: { shirt: '#6c8cff', pants: '#2d3561', skin: '#f2c7a5', hair: '#3b2a20', accent: '#ffb44d' }, proportions: { limbWidth: 16 }, hair: 'short', outfit: 'tshirt' },
    palette: { primary: '#6c8cff', secondary: '#ffb44d', accent: '#58d6a8', text: '#1f2440', muted: '#9aa0bf', positive: '#58d6a8', negative: '#ff7a7a', outline: '#1f2440' },
    illustration: { outline: 'none', outlineWidth: 0, fills: ['#6c8cff', '#ffb44d', '#58d6a8', '#ff9fc0'] },
    lineWidth: 4,
    background: bg({ type: 'linear', color: '#f7f4ee', color2: '#e9eefc', angle: 120 }),
    animation: { in: anim('slideUp', 0.6, 'easeOutCubic', 80), out: anim('fade', 0.4, 'easeInCubic'), stagger: 0.1, easing: 'easeOutCubic' },
    movement: { default: 'idle', speed: 0.8, loop: { type: 'float', speed: 0.3, amount: 6 } },
    transition: { type: 'fade', duration: 0.6, easing: 'easeInOut' },
    typography: { fontFamily: '"Trebuchet MS", "Lucida Grande", sans-serif', headingWeight: 700, bodyWeight: 400, uppercase: false, letterSpacing: 0, headingSize: 96 },
    effects: { glow: false, glowColor: '#000000', glowSize: 0, shadow: true },
  },
  {
    id: 'preset-motion2d', name: '2D Motion Graphics', builtin: true,
    description: 'Vibrant flat colors on deep navy, kinetic type and elastic motion.',
    characterStyle: 'cartoon',
    character: { colors: { shirt: '#7c5cff', pants: '#22264a', skin: '#ffcfa8', hair: '#1b1640', outline: '#0b0c16', accent: '#22d3ee' }, proportions: { headSize: 46, lineWidth: 5 }, hair: 'spiky', outfit: 'hoodie' },
    palette: { primary: '#7c5cff', secondary: '#22d3ee', accent: '#ff5fa2', text: '#ffffff', muted: '#8f96c2', positive: '#22d39a', negative: '#ff4d6d', outline: '#0b0c16' },
    illustration: { outline: '#0b0c16', outlineWidth: 6, fills: ['#7c5cff', '#22d3ee', '#ff5fa2', '#ffd35c'] },
    lineWidth: 6,
    background: bg({ type: 'radial', color: '#090a18', color2: '#1c1650', motion: 'pulse', motionSpeed: 0.5 }),
    animation: { in: anim('pop', 0.55, 'easeOutBack'), out: anim('scale', 0.35, 'easeInBack'), stagger: 0.06, easing: 'easeOutBack' },
    movement: { default: 'idle', speed: 1.2, loop: { type: 'float', speed: 0.5, amount: 8 } },
    transition: { type: 'zoomIn', duration: 0.5, easing: 'easeOutExpo' },
    typography: { fontFamily: '"Arial Black", "Arial Bold", Gadget, sans-serif', headingWeight: 900, bodyWeight: 700, uppercase: true, letterSpacing: 2, headingSize: 120 },
    effects: { glow: true, glowColor: '#7c5cff', glowSize: 12, shadow: false },
  },
  {
    id: 'preset-finance', name: 'Financial Explainer', builtin: true,
    description: 'Trading-desk dark UI, green/red signals, charts that draw on.',
    characterStyle: 'educational',
    character: { colors: { shirt: '#1f2a44', pants: '#141a2b', skin: '#e8b48f', hair: '#2a1d14', outline: '#0a0e18', accent: '#22d39a' }, proportions: { headSize: 38 }, hair: 'short', outfit: 'suit' },
    palette: { primary: '#22d39a', secondary: '#3b82f6', accent: '#ffd35c', text: '#e8eefc', muted: '#6b7899', positive: '#22d39a', negative: '#ff4d6d', outline: '#0a0e18' },
    illustration: { outline: '#0a0e18', outlineWidth: 5, fills: ['#22d39a', '#3b82f6', '#ffd35c', '#ff4d6d'] },
    lineWidth: 5,
    background: bg({ type: 'grid', color: '#070b14', color2: '#0f1b33', patternColor: '#1b2a4a', patternSize: 70, motion: 'drift', motionSpeed: 0.4 }),
    animation: { in: anim('slideUp', 0.5, 'easeOutExpo', 100), out: anim('fade', 0.3, 'easeIn'), stagger: 0.07, easing: 'easeOutExpo' },
    movement: { default: 'talk', speed: 1, loop: { type: 'none', speed: 1, amount: 0 } },
    transition: { type: 'wipe', duration: 0.5, easing: 'easeInOutCubic' },
    typography: { fontFamily: 'Arial, Helvetica, sans-serif', headingWeight: 800, bodyWeight: 500, uppercase: false, letterSpacing: 0, headingSize: 100 },
    effects: { glow: true, glowColor: '#22d39a', glowSize: 8, shadow: false },
  },
  {
    id: 'preset-whiteboard', name: 'Whiteboard Animation', builtin: true,
    description: 'Hand-drawn strokes revealed on a paper board.',
    characterStyle: 'stickman',
    character: { colors: { outline: '#1d1d1f', skin: '#fdfcf7', accent: '#2f6bff' }, proportions: { lineWidth: 6 }, hair: 'none', outfit: 'tshirt' },
    palette: { primary: '#1d1d1f', secondary: '#2f6bff', accent: '#e53935', text: '#1d1d1f', muted: '#7a7a7a', positive: '#1aa260', negative: '#e53935', outline: '#1d1d1f' },
    illustration: { outline: '#1d1d1f', outlineWidth: 6, fills: ['#fdfcf7', '#2f6bff', '#e53935', '#ffd35c'] },
    lineWidth: 6,
    background: bg({ type: 'paper', color: '#fdfcf7', color2: '#f1efe6', patternColor: '#c9d6ea', patternSize: 50 }),
    animation: { in: anim('draw', 1.0, 'easeInOut'), out: anim('fade', 0.4, 'easeIn'), stagger: 0.12, easing: 'easeInOut' },
    movement: { default: 'idle', speed: 0.8, loop: { type: 'none', speed: 1, amount: 0 } },
    transition: { type: 'slideLeft', duration: 0.7, easing: 'easeInOutCubic' },
    typography: { fontFamily: '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive', headingWeight: 700, bodyWeight: 400, uppercase: false, letterSpacing: 0, headingSize: 96 },
    effects: { glow: false, glowColor: '#000000', glowSize: 0, shadow: false },
  },
  {
    id: 'preset-cartoon', name: 'Cartoon Animation', builtin: true,
    description: 'Thick outlines, big expressive eyes, bouncy motion.',
    characterStyle: 'cartoon',
    character: { colors: { shirt: '#ff7a3d', pants: '#3b5bdb', skin: '#ffd2b0', hair: '#5a3418', outline: '#1b1640', accent: '#ffd35c' }, proportions: { headSize: 52, lineWidth: 6, limbWidth: 18 }, hair: 'curly', outfit: 'tshirt' },
    palette: { primary: '#ff7a3d', secondary: '#3b5bdb', accent: '#ffd35c', text: '#1b1640', muted: '#7b7fa8', positive: '#2fbf71', negative: '#ff4d6d', outline: '#1b1640' },
    illustration: { outline: '#1b1640', outlineWidth: 8, fills: ['#ff7a3d', '#3b5bdb', '#ffd35c', '#2fbf71'] },
    lineWidth: 8,
    background: bg({ type: 'linear', color: '#8fd3ff', color2: '#e6f7ff', angle: 90 }),
    animation: { in: anim('bounce', 0.7, 'easeOutBounce'), out: anim('pop', 0.3, 'easeInBack'), stagger: 0.1, easing: 'easeOutBounce' },
    movement: { default: 'idle', speed: 1.3, loop: { type: 'bob', speed: 1, amount: 8 } },
    transition: { type: 'circle', duration: 0.6, easing: 'easeInOutCubic' },
    typography: { fontFamily: '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive', headingWeight: 800, bodyWeight: 700, uppercase: false, letterSpacing: 0, headingSize: 110 },
    effects: { glow: false, glowColor: '#000000', glowSize: 0, shadow: true },
  },
  {
    id: 'preset-cinematic', name: 'Cinematic Infographics', builtin: true,
    description: 'Moody gradients, glowing data, slow camera pushes and blur reveals.',
    characterStyle: 'minimal',
    character: { colors: { shirt: '#2a2f45', pants: '#151827', skin: '#d9a98a', hair: '#0f0f14', accent: '#f5b82e' }, proportions: { limbWidth: 13 }, hair: 'short', outfit: 'suit' },
    palette: { primary: '#f5b82e', secondary: '#4cc9f0', accent: '#f72585', text: '#f4f1ea', muted: '#7d8299', positive: '#4cc9f0', negative: '#f72585', outline: '#05060a' },
    illustration: { outline: 'none', outlineWidth: 0, fills: ['#f5b82e', '#4cc9f0', '#f72585', '#f4f1ea'] },
    lineWidth: 3,
    background: bg({ type: 'radial', color: '#05060a', color2: '#1d1a2e', motion: 'gradientShift', motionSpeed: 0.2 }),
    animation: { in: anim('blur', 0.9, 'easeOutCubic'), out: anim('blur', 0.6, 'easeInCubic'), stagger: 0.12, easing: 'easeOutCubic' },
    movement: { default: 'idle', speed: 0.7, loop: { type: 'none', speed: 1, amount: 0 } },
    transition: { type: 'blur', duration: 0.8, easing: 'easeInOut' },
    typography: { fontFamily: 'Georgia, "Times New Roman", serif', headingWeight: 700, bodyWeight: 400, uppercase: true, letterSpacing: 8, headingSize: 92 },
    effects: { glow: true, glowColor: '#f5b82e', glowSize: 14, shadow: false },
  },
];
