import type { Illustration, IllustrationPart, PartKind } from './schema';

let n = 0;
const pid = () => `p${(n++).toString(36)}`;

type PartInit = Partial<Omit<IllustrationPart, 'attrs' | 'anim'>> & {
  anim?: Partial<IllustrationPart['anim']>;
};

export function part(kind: PartKind, name: string, attrs: Record<string, number | string>, o: PartInit = {}): IllustrationPart {
  return {
    id: pid(),
    name,
    kind,
    attrs,
    fill: o.fill ?? '#7c5cff',
    stroke: o.stroke ?? 'none',
    strokeWidth: o.strokeWidth ?? 0,
    opacity: o.opacity ?? 1,
    tx: 0, ty: 0, s: 1, r: 0,
    hidden: false,
    anim: { type: 'pop', delay: 0, duration: 0.5, easing: 'easeOutBack', ...(o.anim ?? {}) },
    loop: o.loop ?? { type: 'none', speed: 1, amount: 0 },
  };
}

const stagger = (parts: IllustrationPart[], step = 0.08, type?: IllustrationPart['anim']['type']) =>
  parts.map((p, i) => ({ ...p, anim: { ...p.anim, delay: +(i * step).toFixed(3), ...(type ? { type } : {}) } }));

const ill = (id: string, name: string, category: string, parts: IllustrationPart[], w = 400, h = 400): Illustration => ({
  id, name, category, w, h, parts, builtin: true,
});

const OUT = '#1b1640';

export function builtinIllustrations(): Illustration[] {
  n = 0;
  return [
    ill('ill-candles', 'Candlestick Chart', 'Finance & Trading', stagger([
      part('rect', 'Panel', { x: 10, y: 20, w: 380, h: 360, rx: 24 }, { fill: '#121528', stroke: '#2c3159', strokeWidth: 3, anim: { type: 'fade' } }),
      part('line', 'Grid 1', { x1: 40, y1: 110, x2: 360, y2: 110 }, { stroke: '#2c3159', strokeWidth: 2, anim: { type: 'draw' } }),
      part('line', 'Grid 2', { x1: 40, y1: 200, x2: 360, y2: 200 }, { stroke: '#2c3159', strokeWidth: 2, anim: { type: 'draw' } }),
      part('line', 'Grid 3', { x1: 40, y1: 290, x2: 360, y2: 290 }, { stroke: '#2c3159', strokeWidth: 2, anim: { type: 'draw' } }),
      ...[[70, 250, 300, 230, 320], [120, 230, 260, 200, 280], [170, 240, 220, 210, 260], [220, 210, 170, 150, 230], [270, 180, 200, 160, 220], [320, 170, 100, 80, 190]].flatMap(([x, o, c, hi, lo], i) => {
        const up = c < o;
        const color = up ? '#22d39a' : '#ff4d6d';
        return [
          part('line', `Wick ${i + 1}`, { x1: x, y1: hi, x2: x, y2: lo }, { stroke: color, strokeWidth: 4, anim: { type: 'draw' } }),
          part('rect', `Candle ${i + 1}`, { x: x - 14, y: Math.min(o, c), w: 28, h: Math.max(6, Math.abs(o - c)), rx: 4 }, { fill: color, anim: { type: 'grow' } }),
        ];
      }),
    ], 0.07)),
    ill('ill-coin', 'Gold Coin', 'Finance & Trading', stagger([
      part('circle', 'Rim', { cx: 200, cy: 200, r: 150 }, { fill: '#f5b82e', stroke: OUT, strokeWidth: 8 }),
      part('circle', 'Face', { cx: 200, cy: 200, r: 112 }, { fill: '#ffd35c', stroke: '#d99a12', strokeWidth: 6 }),
      part('text', 'Symbol', { x: 200, y: 245, text: '$', fontSize: 140, fontWeight: 800 }, { fill: '#d99a12' }),
      part('path', 'Shine', { d: 'M 120 140 Q 140 100 185 92' }, { fill: 'none', stroke: '#fff6d0', strokeWidth: 12, anim: { type: 'draw' } }),
    ]), 400, 400),
    ill('ill-moneybag', 'Money Bag', 'Finance & Trading', stagger([
      part('path', 'Bag', { d: 'M 140 140 Q 60 220 80 300 Q 100 370 200 370 Q 300 370 320 300 Q 340 220 260 140 Z' }, { fill: '#5fbf6a', stroke: OUT, strokeWidth: 8 }),
      part('path', 'Neck', { d: 'M 150 140 L 250 140 L 270 80 Q 200 100 130 80 Z' }, { fill: '#4aa556', stroke: OUT, strokeWidth: 8 }),
      part('rect', 'Tie', { x: 140, y: 130, w: 120, h: 22, rx: 10 }, { fill: '#c9973a', stroke: OUT, strokeWidth: 6 }),
      part('text', 'Dollar', { x: 200, y: 310, text: '$', fontSize: 120, fontWeight: 800 }, { fill: '#e9ffe6' }),
    ])),
    ill('ill-bank', 'Bank Building', 'Finance & Trading', stagger([
      part('polygon', 'Roof', { points: '40,140 200,50 360,140' }, { fill: '#8f7bff', stroke: OUT, strokeWidth: 8, anim: { type: 'slideDown' } }),
      part('rect', 'Beam', { x: 50, y: 140, w: 300, h: 30, rx: 4 }, { fill: '#b4a8ff', stroke: OUT, strokeWidth: 6 }),
      ...[80, 150, 220, 290].map((x, i) => part('rect', `Pillar ${i + 1}`, { x, y: 180, w: 30, h: 140, rx: 4 }, { fill: '#e6e2ff', stroke: OUT, strokeWidth: 6, anim: { type: 'grow' } })),
      part('rect', 'Base', { x: 40, y: 320, w: 320, h: 34, rx: 4 }, { fill: '#8f7bff', stroke: OUT, strokeWidth: 8, anim: { type: 'slideUp' } }),
      part('circle', 'Emblem', { cx: 200, cy: 108, r: 18 }, { fill: '#ffd35c', stroke: OUT, strokeWidth: 5 }),
    ], 0.08)),
    ill('ill-piggy', 'Piggy Bank', 'Finance & Trading', stagger([
      part('ellipse', 'Body', { cx: 200, cy: 220, rx: 140, ry: 110 }, { fill: '#ff9fc0', stroke: OUT, strokeWidth: 8 }),
      part('circle', 'Snout', { cx: 330, cy: 220, r: 34 }, { fill: '#ffb8d0', stroke: OUT, strokeWidth: 7 }),
      part('polygon', 'Ear', { points: '150,130 175,80 205,125' }, { fill: '#ff86ad', stroke: OUT, strokeWidth: 7 }),
      part('circle', 'Eye', { cx: 270, cy: 190, r: 9 }, { fill: OUT }),
      part('rect', 'Slot', { x: 160, y: 118, w: 70, h: 12, rx: 6 }, { fill: OUT }),
      part('rect', 'Leg 1', { x: 110, y: 305, w: 34, h: 50, rx: 8 }, { fill: '#ff86ad', stroke: OUT, strokeWidth: 6 }),
      part('rect', 'Leg 2', { x: 250, y: 305, w: 34, h: 50, rx: 8 }, { fill: '#ff86ad', stroke: OUT, strokeWidth: 6 }),
      part('circle', 'Coin', { cx: 195, cy: 70, r: 28 }, { fill: '#ffd35c', stroke: OUT, strokeWidth: 6, anim: { type: 'slideDown' }, loop: { type: 'bob', speed: 0.8, amount: 10 } }),
    ])),
    ill('ill-trend-up', 'Growth Trend Arrow', 'Charts & Data', stagger([
      part('line', 'Y Axis', { x1: 50, y1: 40, x2: 50, y2: 350 }, { stroke: '#9aa3c7', strokeWidth: 6, anim: { type: 'draw' } }),
      part('line', 'X Axis', { x1: 50, y1: 350, x2: 370, y2: 350 }, { stroke: '#9aa3c7', strokeWidth: 6, anim: { type: 'draw' } }),
      part('path', 'Trend', { d: 'M 70 310 L 150 250 L 210 280 L 340 110' }, { fill: 'none', stroke: '#22d39a', strokeWidth: 14, anim: { type: 'draw', duration: 0.9, easing: 'easeInOutCubic' } }),
      part('polygon', 'Head', { points: '300,100 360,80 345,145' }, { fill: '#22d39a', anim: { type: 'pop' } }),
    ], 0.15)),
    ill('ill-pie', 'Pie Breakdown', 'Charts & Data', stagger([
      part('path', 'Slice A', { d: 'M 200 200 L 200 60 A 140 140 0 0 1 333 243 Z' }, { fill: '#7c5cff', stroke: '#0b0c16', strokeWidth: 4 }),
      part('path', 'Slice B', { d: 'M 200 200 L 333 243 A 140 140 0 0 1 112 309 Z' }, { fill: '#22d3ee', stroke: '#0b0c16', strokeWidth: 4 }),
      part('path', 'Slice C', { d: 'M 200 200 L 112 309 A 140 140 0 0 1 200 60 Z' }, { fill: '#ff5fa2', stroke: '#0b0c16', strokeWidth: 4 }),
      part('circle', 'Hole', { cx: 200, cy: 200, r: 55 }, { fill: '#0b0c16' }),
    ], 0.12)),
    ill('ill-bars', 'Bar Graph', 'Charts & Data', stagger([
      part('line', 'Base', { x1: 40, y1: 350, x2: 360, y2: 350 }, { stroke: '#9aa3c7', strokeWidth: 6, anim: { type: 'draw' } }),
      ...[[70, 120], [140, 180], [210, 230], [280, 300]].map(([x, h], i) => part('rect', `Bar ${i + 1}`, { x, y: 350 - h, w: 50, h, rx: 8 }, { fill: ['#7c5cff', '#9a7dff', '#b9a3ff', '#22d39a'][i], anim: { type: 'grow', easing: 'easeOutCubic' } })),
    ], 0.12)),
    ill('ill-bulb', 'Idea Light Bulb', 'Education', stagger([
      ...[0, 45, 90, 135, 180].map((a, i) => {
        const r = (a - 180) * Math.PI / 180;
        return part('line', `Ray ${i + 1}`, { x1: 200 + Math.cos(r) * 150, y1: 170 + Math.sin(r) * 150, x2: 200 + Math.cos(r) * 185, y2: 170 + Math.sin(r) * 185 }, { stroke: '#ffd35c', strokeWidth: 10, anim: { type: 'draw' }, loop: { type: 'blink', speed: 1, amount: 0 } });
      }),
      part('circle', 'Glass', { cx: 200, cy: 170, r: 110 }, { fill: '#ffe680', stroke: OUT, strokeWidth: 8 }),
      part('path', 'Filament', { d: 'M 170 200 L 185 160 L 200 200 L 215 160 L 230 200' }, { fill: 'none', stroke: '#e08a00', strokeWidth: 6, anim: { type: 'draw' } }),
      part('rect', 'Base', { x: 150, y: 270, w: 100, h: 70, rx: 12 }, { fill: '#9aa3c7', stroke: OUT, strokeWidth: 8 }),
      part('line', 'Thread', { x1: 155, y1: 300, x2: 245, y2: 300 }, { stroke: OUT, strokeWidth: 6, anim: { type: 'draw' } }),
    ], 0.06)),
    ill('ill-book', 'Open Book', 'Education', stagger([
      part('path', 'Left Page', { d: 'M 200 110 Q 130 80 40 100 L 40 320 Q 130 300 200 330 Z' }, { fill: '#f4f1ff', stroke: OUT, strokeWidth: 8 }),
      part('path', 'Right Page', { d: 'M 200 110 Q 270 80 360 100 L 360 320 Q 270 300 200 330 Z' }, { fill: '#ffffff', stroke: OUT, strokeWidth: 8 }),
      ...[150, 190, 230].map((y, i) => part('line', `Text L${i + 1}`, { x1: 70, y1: y, x2: 170, y2: y + 6 }, { stroke: '#b4a8ff', strokeWidth: 8, anim: { type: 'draw' } })),
      ...[150, 190, 230].map((y, i) => part('line', `Text R${i + 1}`, { x1: 230, y1: y + 6, x2: 330, y2: y }, { stroke: '#b4a8ff', strokeWidth: 8, anim: { type: 'draw' } })),
    ], 0.07)),
    ill('ill-gradcap', 'Graduation Cap', 'Education', stagger([
      part('polygon', 'Board', { points: '200,80 370,150 200,220 30,150' }, { fill: '#2b2f4a', stroke: OUT, strokeWidth: 8 }),
      part('path', 'Cap', { d: 'M 110 190 L 110 270 Q 200 320 290 270 L 290 190 L 200 225 Z' }, { fill: '#3a3f63', stroke: OUT, strokeWidth: 8 }),
      part('path', 'Tassel', { d: 'M 200 150 L 330 175 L 330 260' }, { fill: 'none', stroke: '#ffd35c', strokeWidth: 8, anim: { type: 'draw' } }),
      part('circle', 'Tassel End', { cx: 330, cy: 268, r: 14 }, { fill: '#ffd35c', loop: { type: 'swing', speed: 0.8, amount: 8 } }),
    ])),
    ill('ill-laptop', 'Laptop', 'Objects', stagger([
      part('rect', 'Screen', { x: 70, y: 70, w: 260, h: 180, rx: 14 }, { fill: '#2b2f4a', stroke: OUT, strokeWidth: 8 }),
      part('rect', 'Display', { x: 90, y: 90, w: 220, h: 140, rx: 6 }, { fill: '#7c5cff', anim: { type: 'fade' } }),
      part('path', 'Chart', { d: 'M 105 200 L 150 170 L 190 185 L 240 130 L 290 115' }, { fill: 'none', stroke: '#ffffff', strokeWidth: 6, anim: { type: 'draw' } }),
      part('path', 'Base', { d: 'M 30 270 L 370 270 L 345 310 L 55 310 Z' }, { fill: '#9aa3c7', stroke: OUT, strokeWidth: 8 }),
    ])),
    ill('ill-phone', 'Smartphone', 'Objects', stagger([
      part('rect', 'Body', { x: 120, y: 30, w: 160, h: 340, rx: 28 }, { fill: '#1d2133', stroke: OUT, strokeWidth: 8 }),
      part('rect', 'Screen', { x: 136, y: 60, w: 128, h: 270, rx: 10 }, { fill: '#22d3ee', anim: { type: 'fade' } }),
      part('rect', 'Card 1', { x: 150, y: 80, w: 100, h: 50, rx: 8 }, { fill: '#ffffff', opacity: 0.9, anim: { type: 'slideUp' } }),
      part('rect', 'Card 2', { x: 150, y: 145, w: 100, h: 50, rx: 8 }, { fill: '#ffffff', opacity: 0.75, anim: { type: 'slideUp' } }),
      part('rect', 'Card 3', { x: 150, y: 210, w: 100, h: 50, rx: 8 }, { fill: '#ffffff', opacity: 0.6, anim: { type: 'slideUp' } }),
      part('circle', 'Button', { cx: 200, cy: 350, r: 10 }, { fill: '#3a3f63' }),
    ])),
    ill('ill-rocket', 'Rocket Launch', 'Objects', stagger([
      part('path', 'Flame', { d: 'M 175 300 Q 200 390 225 300 Z' }, { fill: '#ff8a3d', loop: { type: 'pulse', speed: 4, amount: 0.12 } }),
      part('path', 'Body', { d: 'M 200 40 Q 270 110 260 290 L 140 290 Q 130 110 200 40 Z' }, { fill: '#f4f1ff', stroke: OUT, strokeWidth: 8 }),
      part('circle', 'Window', { cx: 200, cy: 150, r: 30 }, { fill: '#22d3ee', stroke: OUT, strokeWidth: 7 }),
      part('path', 'Fin L', { d: 'M 145 220 L 95 300 L 145 290 Z' }, { fill: '#ff4d6d', stroke: OUT, strokeWidth: 7 }),
      part('path', 'Fin R', { d: 'M 255 220 L 305 300 L 255 290 Z' }, { fill: '#ff4d6d', stroke: OUT, strokeWidth: 7 }),
    ])),
    ill('ill-trophy', 'Trophy', 'Objects', stagger([
      part('path', 'Cup', { d: 'M 120 60 L 280 60 Q 280 220 200 240 Q 120 220 120 60 Z' }, { fill: '#ffd35c', stroke: OUT, strokeWidth: 8 }),
      part('path', 'Handle L', { d: 'M 125 90 Q 60 90 75 150 Q 90 190 140 190' }, { fill: 'none', stroke: OUT, strokeWidth: 10, anim: { type: 'draw' } }),
      part('path', 'Handle R', { d: 'M 275 90 Q 340 90 325 150 Q 310 190 260 190' }, { fill: 'none', stroke: OUT, strokeWidth: 10, anim: { type: 'draw' } }),
      part('rect', 'Stem', { x: 185, y: 238, w: 30, h: 60 }, { fill: '#e8b52e', stroke: OUT, strokeWidth: 6 }),
      part('rect', 'Base', { x: 130, y: 295, w: 140, h: 45, rx: 8 }, { fill: '#6b4f2a', stroke: OUT, strokeWidth: 8 }),
      part('polygon', 'Star', { points: '200,95 212,125 245,127 220,147 228,178 200,160 172,178 180,147 155,127 188,125' }, { fill: '#fff6d0', loop: { type: 'pulse', speed: 1, amount: 0.08 } }),
    ])),
    ill('ill-target', 'Target / Goal', 'Objects', stagger([
      part('circle', 'Ring 1', { cx: 200, cy: 200, r: 150 }, { fill: '#ff4d6d', stroke: OUT, strokeWidth: 6 }),
      part('circle', 'Ring 2', { cx: 200, cy: 200, r: 110 }, { fill: '#ffffff' }),
      part('circle', 'Ring 3', { cx: 200, cy: 200, r: 70 }, { fill: '#ff4d6d' }),
      part('circle', 'Bullseye', { cx: 200, cy: 200, r: 30 }, { fill: '#ffffff' }),
      part('line', 'Arrow', { x1: 200, y1: 200, x2: 350, y2: 50 }, { stroke: OUT, strokeWidth: 10, anim: { type: 'draw', easing: 'easeOutExpo' } }),
      part('polygon', 'Fletching', { points: '330,40 370,30 360,70' }, { fill: '#7c5cff', anim: { type: 'pop' } }),
    ], 0.1)),
    ill('ill-gear', 'Gear', 'Objects', [
      part('path', 'Gear', { d: gearPath(200, 200, 150, 115, 10) }, { fill: '#9aa3c7', stroke: OUT, strokeWidth: 8, loop: { type: 'spin', speed: 0.15, amount: 0 } }),
      part('circle', 'Hub', { cx: 200, cy: 200, r: 45 }, { fill: '#1d2133', stroke: OUT, strokeWidth: 8, anim: { delay: 0.15 } as IllustrationPart['anim'] }),
    ]),
    ill('ill-magnifier', 'Magnifying Glass', 'Objects', stagger([
      part('line', 'Handle', { x1: 250, y1: 250, x2: 350, y2: 350 }, { stroke: '#6b4f2a', strokeWidth: 30, anim: { type: 'draw' } }),
      part('circle', 'Lens', { cx: 170, cy: 170, r: 120 }, { fill: '#cdeffd', stroke: OUT, strokeWidth: 14, opacity: 0.95 }),
      part('path', 'Glint', { d: 'M 105 140 Q 115 105 150 92' }, { fill: 'none', stroke: '#ffffff', strokeWidth: 12, anim: { type: 'draw' } }),
    ])),
    ill('ill-lock', 'Security Lock', 'Objects', stagger([
      part('path', 'Shackle', { d: 'M 130 190 L 130 130 Q 130 60 200 60 Q 270 60 270 130 L 270 190' }, { fill: 'none', stroke: '#9aa3c7', strokeWidth: 26, anim: { type: 'draw' } }),
      part('rect', 'Body', { x: 90, y: 180, w: 220, h: 180, rx: 24 }, { fill: '#7c5cff', stroke: OUT, strokeWidth: 8 }),
      part('circle', 'Keyhole', { cx: 200, cy: 255, r: 22 }, { fill: OUT }),
      part('rect', 'Key Slot', { x: 190, y: 260, w: 20, h: 50, rx: 6 }, { fill: OUT }),
    ])),
    ill('ill-house', 'House', 'Environments', stagger([
      part('polygon', 'Roof', { points: '40,190 200,60 360,190' }, { fill: '#ff4d6d', stroke: OUT, strokeWidth: 8, anim: { type: 'slideDown' } }),
      part('rect', 'Walls', { x: 70, y: 185, w: 260, h: 175 }, { fill: '#ffe9c2', stroke: OUT, strokeWidth: 8, anim: { type: 'grow' } }),
      part('rect', 'Door', { x: 170, y: 260, w: 60, h: 100, rx: 6 }, { fill: '#6b4f2a', stroke: OUT, strokeWidth: 6 }),
      part('rect', 'Window', { x: 100, y: 220, w: 50, h: 50, rx: 4 }, { fill: '#22d3ee', stroke: OUT, strokeWidth: 6 }),
      part('rect', 'Window 2', { x: 250, y: 220, w: 50, h: 50, rx: 4 }, { fill: '#22d3ee', stroke: OUT, strokeWidth: 6 }),
    ])),
    ill('ill-city', 'City Skyline', 'Environments', stagger([
      ...[[0, 220, 70], [60, 160, 80], [130, 100, 70], [190, 180, 60], [240, 130, 90], [320, 200, 80], [390, 150, 70], [450, 230, 70]].map(([x, y, w], i) =>
        part('rect', `Tower ${i + 1}`, { x, y, w, h: 400 - y }, { fill: ['#2b2f4a', '#363c58', '#1d2133'][i % 3], stroke: '#0b0c16', strokeWidth: 3, anim: { type: 'grow', easing: 'easeOutCubic' } })),
      ...Array.from({ length: 10 }, (_, i) => part('rect', `Light ${i + 1}`, { x: 20 + (i * 47) % 460, y: 260 + ((i * 37) % 110), w: 14, h: 18 }, { fill: '#ffd35c', anim: { type: 'fade' }, loop: { type: 'blink', speed: 0.3 + (i % 3) * 0.2, amount: 0 } })),
    ], 0.05), 520, 400),
    ill('ill-landscape', 'Hills & Sun', 'Environments', stagger([
      part('circle', 'Sun', { cx: 380, cy: 110, r: 60 }, { fill: '#ffd35c', anim: { type: 'slideUp' }, loop: { type: 'pulse', speed: 0.4, amount: 0.04 } }),
      part('path', 'Hill Back', { d: 'M 0 300 Q 150 160 300 280 Q 420 190 520 260 L 520 400 L 0 400 Z' }, { fill: '#4aa556', anim: { type: 'slideUp' } }),
      part('path', 'Hill Front', { d: 'M 0 340 Q 200 250 380 340 Q 460 300 520 320 L 520 400 L 0 400 Z' }, { fill: '#5fbf6a', anim: { type: 'slideUp' } }),
      part('ellipse', 'Cloud', { cx: 140, cy: 100, rx: 70, ry: 26 }, { fill: '#ffffff', anim: { type: 'slideRight' }, loop: { type: 'float', speed: 0.3, amount: 6 } }),
    ], 0.12), 520, 400),
    ill('ill-globe', 'Globe', 'Environments', stagger([
      part('circle', 'Ocean', { cx: 200, cy: 200, r: 150 }, { fill: '#22a6ee', stroke: OUT, strokeWidth: 8 }),
      part('path', 'Land 1', { d: 'M 110 120 Q 150 90 190 120 Q 200 160 160 170 Q 120 200 100 160 Z' }, { fill: '#5fbf6a' }),
      part('path', 'Land 2', { d: 'M 220 200 Q 280 180 300 230 Q 290 290 240 300 Q 210 260 220 200 Z' }, { fill: '#5fbf6a' }),
      part('ellipse', 'Meridian', { cx: 200, cy: 200, rx: 70, ry: 150 }, { fill: 'none', stroke: '#ffffff', strokeWidth: 3, opacity: 0.5, anim: { type: 'draw' } }),
      part('line', 'Equator', { x1: 50, y1: 200, x2: 350, y2: 200 }, { stroke: '#ffffff', strokeWidth: 3, opacity: 0.5, anim: { type: 'draw' } }),
    ])),
    ill('ill-clock', 'Clock / Time', 'Education', [
      part('circle', 'Face', { cx: 200, cy: 200, r: 150 }, { fill: '#ffffff', stroke: OUT, strokeWidth: 10 }),
      ...Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return part('line', `Tick ${i + 1}`, { x1: 200 + Math.sin(a) * 125, y1: 200 - Math.cos(a) * 125, x2: 200 + Math.sin(a) * 140, y2: 200 - Math.cos(a) * 140 }, { stroke: OUT, strokeWidth: 6, anim: { type: 'fade', delay: 0.1 + i * 0.03 } as IllustrationPart['anim'] });
      }),
      part('line', 'Hour Hand', { x1: 200, y1: 200, x2: 200, y2: 120 }, { stroke: OUT, strokeWidth: 12, anim: { type: 'draw', delay: 0.5 } as IllustrationPart['anim'], loop: { type: 'spin', speed: 0.02, amount: 0 } }),
      part('line', 'Minute Hand', { x1: 200, y1: 200, x2: 290, y2: 200 }, { stroke: '#7c5cff', strokeWidth: 8, anim: { type: 'draw', delay: 0.6 } as IllustrationPart['anim'], loop: { type: 'spin', speed: 0.25, amount: 0 } }),
      part('circle', 'Pin', { cx: 200, cy: 200, r: 12 }, { fill: OUT }),
    ]),
    ill('ill-brain', 'Brain / Thinking', 'Education', stagger([
      part('path', 'Brain', { d: 'M 200 80 Q 150 50 115 90 Q 60 95 70 150 Q 30 190 70 235 Q 70 300 140 300 Q 170 340 200 310 Q 230 340 260 300 Q 330 300 330 235 Q 370 190 330 150 Q 340 95 285 90 Q 250 50 200 80 Z' }, { fill: '#ff9fc0', stroke: OUT, strokeWidth: 8 }),
      part('path', 'Fold', { d: 'M 200 85 L 200 305' }, { fill: 'none', stroke: OUT, strokeWidth: 6, anim: { type: 'draw' } }),
      part('path', 'Curl L', { d: 'M 120 150 Q 160 140 160 180 Q 160 220 120 220' }, { fill: 'none', stroke: OUT, strokeWidth: 6, anim: { type: 'draw' } }),
      part('path', 'Curl R', { d: 'M 280 150 Q 240 140 240 180 Q 240 220 280 220' }, { fill: 'none', stroke: OUT, strokeWidth: 6, anim: { type: 'draw' } }),
    ])),
    ill('ill-shield', 'Shield / Protection', 'Finance & Trading', stagger([
      part('path', 'Shield', { d: 'M 200 40 L 340 90 Q 340 280 200 360 Q 60 280 60 90 Z' }, { fill: '#22d39a', stroke: OUT, strokeWidth: 10 }),
      part('path', 'Check', { d: 'M 135 200 L 185 250 L 275 150' }, { fill: 'none', stroke: '#ffffff', strokeWidth: 22, anim: { type: 'draw', easing: 'easeOutCubic' } }),
    ], 0.25)),
    ill('ill-warning', 'Warning Sign', 'Objects', stagger([
      part('path', 'Triangle', { d: 'M 200 50 L 360 330 L 40 330 Z' }, { fill: '#ffd35c', stroke: OUT, strokeWidth: 12 }),
      part('rect', 'Bang', { x: 186, y: 140, w: 28, h: 110, rx: 12 }, { fill: OUT }),
      part('circle', 'Dot', { cx: 200, cy: 285, r: 17 }, { fill: OUT }),
    ])),
    ill('ill-cloud', 'Cloud', 'Environments', [
      part('path', 'Cloud', { d: 'M 100 280 Q 40 280 50 220 Q 60 170 120 180 Q 130 110 200 110 Q 270 110 285 170 Q 350 160 355 225 Q 355 280 300 280 Z' }, { fill: '#ffffff', stroke: OUT, strokeWidth: 8, loop: { type: 'float', speed: 0.3, amount: 8 } }),
    ]),
  ];
}

export function gearPath(cx: number, cy: number, ro: number, ri: number, teeth: number) {
  const pts: string[] = [];
  const steps = teeth * 4;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = i % 4 < 2 ? ro : ri;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

/** Approximate centre of a part (for transform origins). */
export function partCenter(p: IllustrationPart): [number, number] {
  const a = p.attrs as Record<string, number & string>;
  switch (p.kind) {
    case 'rect': return [Number(a.x) + Number(a.w) / 2, Number(a.y) + Number(a.h) / 2];
    case 'circle': case 'ellipse': return [Number(a.cx), Number(a.cy)];
    case 'line': return [(Number(a.x1) + Number(a.x2)) / 2, (Number(a.y1) + Number(a.y2)) / 2];
    case 'text': return [Number(a.x), Number(a.y) - Number(a.fontSize ?? 40) / 3];
    case 'polygon': case 'path': {
      const nums = String(p.kind === 'path' ? a.d : a.points).match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
        minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
      }
      return isFinite(minX) ? [(minX + maxX) / 2, (minY + maxY) / 2] : [0, 0];
    }
  }
  return [0, 0];
}

/** Anchor for "grow" animations: bottom-centre of bounding area. */
export function partBottom(p: IllustrationPart): [number, number] {
  const a = p.attrs as Record<string, number>;
  if (p.kind === 'rect') return [Number(a.x) + Number(a.w) / 2, Number(a.y) + Number(a.h)];
  const c = partCenter(p);
  return c;
}
