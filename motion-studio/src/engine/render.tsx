import React from 'react';
import { CharacterSVG, resolveCharacterPose } from './character';
import { clamp, ease, lerp } from './easing';
import { evaluateCamera, evaluateElement, noise } from './evaluate';
import { partBottom, partCenter } from './illustrations';
import type {
  AnimSpec, AssetBundle, Background, ElementState, FormatDef, Illustration, IllustrationPart, Scene, SceneElement,
} from './schema';

/** Fonts available everywhere (system fonts keep preview ≡ export ≡ Remotion). */
export const FONT_OPTIONS = [
  { label: 'Sans (Arial / Helvetica)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Heavy (Arial Black)', value: '"Arial Black", "Arial Bold", Gadget, sans-serif' },
  { label: 'Condensed (Impact)', value: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' },
  { label: 'Rounded (Trebuchet)', value: '"Trebuchet MS", "Lucida Grande", sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Serif (Georgia)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono (Courier)', value: '"Courier New", Courier, monospace' },
  { label: 'Handwritten (Comic)', value: '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive' },
];

export function estimateTextWidth(text: string, fontSize: number, weight = 400, letterSpacing = 0) {
  let w = 0;
  for (const ch of text) {
    if (ch === ' ') w += 0.28;
    else if ('il.,:;|!\'’'.includes(ch)) w += 0.28;
    else if ('mwMW@'.includes(ch)) w += 0.85;
    else if (ch >= 'A' && ch <= 'Z') w += 0.66;
    else if (ch >= '0' && ch <= '9') w += 0.56;
    else w += 0.52;
    w += letterSpacing / fontSize;
  }
  return w * fontSize * (weight >= 700 ? 1.07 : 1);
}

/** Approximate local (unscaled) size of an element. */
export function elementSize(el: SceneElement, assets: AssetBundle): { w: number; h: number } {
  switch (el.type) {
    case 'text': {
      const p = el.props;
      const lines = (p.uppercase ? p.text.toUpperCase() : p.text).split('\n');
      const w = Math.max(...lines.map((l) => estimateTextWidth(l, p.fontSize, p.fontWeight, p.letterSpacing)));
      return { w: w + (p.padding ?? 0) * 2, h: lines.length * p.fontSize * p.lineHeight + (p.padding ?? 0) * 2 };
    }
    case 'shape': return { w: el.props.w, h: el.props.h };
    case 'arrow': return { w: Math.abs(el.props.dx) + 40, h: Math.abs(el.props.dy) + 40 };
    case 'chart': return { w: el.props.w, h: el.props.h };
    case 'counter': {
      const p = el.props;
      return { w: estimateTextWidth(`${p.prefix}${formatNumber(p.to, p.decimals, p.separator)}${p.suffix}`, p.fontSize, p.fontWeight), h: p.fontSize };
    }
    case 'character': {
      const c = assets.characters[el.props.characterId];
      if (!c) return { w: 200, h: 400 };
      if (c.style === 'image') return { w: 320, h: 420 };
      const pr = c.proportions;
      return { w: pr.armLength * 1.6 + pr.torsoWidth, h: pr.torsoLength + pr.headSize * 2.35 + pr.legLength };
    }
    case 'illustration': {
      const il = assets.illustrations[el.props.illustrationId];
      return il ? { w: il.w, h: il.h } : { w: 300, h: 300 };
    }
    case 'image': return { w: el.props.w, h: el.props.h };
    case 'fx': return { w: el.props.w, h: el.props.h };
  }
}

export function formatNumber(v: number, decimals: number, sep: boolean) {
  const fixed = v.toFixed(decimals);
  if (!sep) return fixed;
  const [i, d] = fixed.split('.');
  const neg = i.startsWith('-');
  const digits = neg ? i.slice(1) : i;
  const withSep = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + withSep + (d ? `.${d}` : '');
}

/* =================================================================== scene */

export interface SceneSVGProps {
  scene: Scene;
  assets: AssetBundle;
  format: FormatDef;
  time: number;
  transparent?: boolean;
  idPrefix?: string;
  /** render only the content group (no <svg> wrapper) */
  bare?: boolean;
  style?: React.CSSProperties;
  className?: string;
  /** render elements listed (for isolated element exports) */
  onlyElementIds?: string[];
}

export function SceneSVG(props: SceneSVGProps) {
  const { scene, format, transparent, style, className, bare } = props;
  const W = format.width, H = format.height;
  const content = <SceneContent {...props} />;
  if (bare) return content;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={style} className={className}
      data-scene={scene.id}>
      {!transparent && <rect width={W} height={H} fill="#000" />}
      {content}
    </svg>
  );
}

export function SceneContent({ scene, assets, format, time, transparent, idPrefix = 's', onlyElementIds }: SceneSVGProps) {
  const W = format.width, H = format.height;
  const cam = evaluateCamera(scene.camera, time);
  const camT = `translate(${W / 2} ${H / 2}) scale(${cam.zoom}) rotate(${cam.rotation}) translate(${-W / 2 - cam.x} ${-H / 2 - cam.y})`;
  const els = onlyElementIds ? scene.elements.filter((e) => onlyElementIds.includes(e.id)) : scene.elements;
  return (
    <g>
      {!transparent && <BackgroundView bg={scene.background} W={W} H={H} t={time} id={`${idPrefix}-bg`} />}
      <g transform={camT}>
        {els.map((el) => {
          const st = evaluateElement(el, time, format.id);
          if (!st.visible || st.opacity <= 0.001) return null;
          return <ElementView key={el.id} el={el} st={st} assets={assets} idp={`${idPrefix}-${el.id}`} />;
        })}
      </g>
    </g>
  );
}

/* ============================================================== background */

export function BackgroundView({ bg, W, H, t, id }: { bg: Background; W: number; H: number; t: number; id: string }) {
  if (bg.type === 'transparent') return null;
  const sp = bg.motionSpeed || 1;
  const drift = bg.motion === 'drift' ? (t * 30 * sp) % (bg.patternSize || 40) : 0;
  const angle = bg.angle + (bg.motion === 'gradientShift' ? t * 20 * sp : 0);
  const pulse = bg.motion === 'pulse' ? 1 + Math.sin(t * Math.PI * sp) * 0.15 : 1;
  const a = (angle * Math.PI) / 180;
  const x1 = 0.5 - Math.cos(a) * 0.5, y1 = 0.5 - Math.sin(a) * 0.5;
  const x2 = 0.5 + Math.cos(a) * 0.5, y2 = 0.5 + Math.sin(a) * 0.5;
  const ps = bg.patternSize || 40;
  let fill = bg.color;
  const defs: React.ReactNode[] = [];
  if (bg.type === 'linear') {
    defs.push(<linearGradient key="g" id={`${id}-g`} x1={x1} y1={y1} x2={x2} y2={y2}><stop offset="0" stopColor={bg.color} /><stop offset="1" stopColor={bg.color2} /></linearGradient>);
    fill = `url(#${id}-g)`;
  } else if (bg.type === 'radial') {
    defs.push(<radialGradient key="g" id={`${id}-g`} cx="0.5" cy="0.45" r={0.75 * pulse}><stop offset="0" stopColor={bg.color2} /><stop offset="1" stopColor={bg.color} /></radialGradient>);
    fill = `url(#${id}-g)`;
  }
  let pattern: React.ReactNode = null;
  if (bg.type === 'grid' || bg.type === 'paper') {
    const lines: React.ReactNode[] = [];
    const sz = bg.type === 'paper' ? ps * 1.2 : ps;
    for (let x = -sz + drift; x < W + sz; x += sz) lines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={H} />);
    for (let y = -sz + drift; y < H + sz; y += sz) lines.push(<line key={`y${y}`} x1={0} y1={y} x2={W} y2={y} />);
    pattern = <g stroke={bg.patternColor} strokeWidth={bg.type === 'paper' ? 1.5 : 1.2} opacity={bg.type === 'paper' ? 0.5 : 0.8}>{lines}</g>;
  } else if (bg.type === 'dots') {
    const dots: React.ReactNode[] = [];
    for (let x = drift; x < W + ps; x += ps) for (let y = drift; y < H + ps; y += ps) dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={2.2} />);
    pattern = <g fill={bg.patternColor}>{dots}</g>;
  }
  return (
    <g>
      {defs.length > 0 && <defs>{defs}</defs>}
      <rect width={W} height={H} fill={fill} />
      {bg.type === 'grid' && bg.color2 && bg.color2 !== bg.color && (
        <>
          <defs><radialGradient id={`${id}-v`} cx="0.5" cy="0.5" r="0.7"><stop offset="0.3" stopColor={bg.color2} stopOpacity={0.55 * pulse} /><stop offset="1" stopColor={bg.color} stopOpacity={0} /></radialGradient></defs>
          <rect width={W} height={H} fill={`url(#${id}-v)`} />
        </>
      )}
      {pattern}
    </g>
  );
}

/* ================================================================ elements */

function filterFor(el: SceneElement, st: ElementState, id: string) {
  const fx = el.effects ?? {};
  const blur = (fx.blur ?? 0) + st.blur;
  const hasGlow = !!fx.glow && fx.glow.size > 0;
  const hasShadow = !!fx.shadow;
  if (blur <= 0.01 && !hasGlow && !hasShadow) return null;
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
      {blur > 0.01 ? <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="src" /> : <feOffset in="SourceGraphic" dx={0} dy={0} result="src" />}
      {hasShadow && (
        <>
          <feGaussianBlur in="SourceAlpha" stdDeviation={fx.shadow!.blur} result="sb" />
          <feOffset in="sb" dx={fx.shadow!.dx} dy={fx.shadow!.dy} result="so" />
          <feFlood floodColor={fx.shadow!.color} result="sc" />
          <feComposite in="sc" in2="so" operator="in" result="shadow" />
        </>
      )}
      {hasGlow && (
        <>
          <feGaussianBlur in="src" stdDeviation={fx.glow!.size} result="gb" />
          <feFlood floodColor={fx.glow!.color} result="gc" />
          <feComposite in="gc" in2="gb" operator="in" result="glow1" />
          <feMerge result="glow"><feMergeNode in="glow1" /><feMergeNode in="glow1" /></feMerge>
        </>
      )}
      <feMerge>
        {hasShadow && <feMergeNode in="shadow" />}
        {hasGlow && <feMergeNode in="glow" />}
        <feMergeNode in="src" />
      </feMerge>
    </filter>
  );
}

const KINETIC_SKIP = new Set(['none', 'typewriter', 'draw', 'wipe']);

export function ElementView({ el, st, assets, idp }: { el: SceneElement; st: ElementState; assets: AssetBundle; idp: string }) {
  const filter = filterFor(el, st, `${idp}-f`);
  const size = elementSize(el, assets);
  const flipX = st.flip ?? 1;
  const transform = `translate(${r2(st.x)} ${r2(st.y)}) rotate(${r2(st.rotation)}) scale(${r3(st.scale * st.sx * flipX)} ${r3(st.scale * st.sy)})`;
  const clip = st.wipe !== undefined && st.wipe < 1 ? (
    <clipPath id={`${idp}-w`}><rect x={-size.w / 2 - 20} y={-size.h / 2 - 40} width={(size.w + 40) * st.wipe} height={size.h + 80} /></clipPath>
  ) : null;
  return (
    <g data-el-id={el.id} transform={transform} opacity={r3(clamp(st.opacity))} style={el.effects?.blend && el.effects.blend !== 'normal' ? { mixBlendMode: el.effects.blend } : undefined}>
      {(filter || clip) && <defs>{filter}{clip}</defs>}
      <g filter={filter ? `url(#${idp}-f)` : undefined} clipPath={clip ? `url(#${idp}-w)` : undefined}>
        <ElementBody el={el} st={st} assets={assets} idp={idp} />
      </g>
    </g>
  );
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function ElementBody({ el, st, assets, idp }: { el: SceneElement; st: ElementState; assets: AssetBundle; idp: string }) {
  switch (el.type) {
    case 'text': return <TextView el={el} st={st} />;
    case 'shape': return <ShapeView el={el} st={st} idp={idp} />;
    case 'arrow': return <ArrowView el={el} st={st} />;
    case 'chart': return <ChartView el={el} st={st} />;
    case 'counter': return <CounterView el={el} st={st} />;
    case 'character': {
      const c = assets.characters[el.props.characterId];
      if (!c) return <MissingAsset label="Missing character" />;
      const { pose, mouth } = resolveCharacterPose(assets, st.pose ?? el.props.pose, st.poseTo, st.poseMix ?? 0, el.props.movement, st.local, el.props.movementSpeed, el.props.talking);
      return (
        <g transform={el.props.flip ? 'scale(-1 1)' : undefined}>
          <CharacterSVG c={c} opts={{ pose, expression: el.props.expression, mouth, time: st.local, draw: st.progress }} />
        </g>
      );
    }
    case 'illustration': {
      const il = assets.illustrations[el.props.illustrationId];
      if (!il) return <MissingAsset label="Missing illustration" />;
      return <IllustrationView il={il} local={el.props.partAnimations ? st.local : 999} draw={st.progress} />;
    }
    case 'image': {
      const p = el.props;
      return (
        <g>
          <defs><clipPath id={`${idp}-ic`}><rect x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} rx={p.radius} /></clipPath></defs>
          {p.src ? (
            <image href={p.src} x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} preserveAspectRatio={p.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'} clipPath={`url(#${idp}-ic)`} opacity={st.progress < 1 ? st.progress : 1} />
          ) : (
            <rect x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} rx={p.radius} fill="none" stroke="#7c5cff" strokeDasharray="12 8" strokeWidth={4} />
          )}
        </g>
      );
    }
    case 'fx': return <FxView el={el} st={st} idp={idp} />;
  }
}

function MissingAsset({ label }: { label: string }) {
  return (
    <g>
      <rect x={-150} y={-60} width={300} height={120} rx={16} fill="none" stroke="#ff4d6d" strokeWidth={4} strokeDasharray="10 8" />
      <text textAnchor="middle" y={10} fill="#ff4d6d" fontSize={28} fontFamily="Arial, sans-serif">{label}</text>
    </g>
  );
}

/* ------------------------------------------------------------------- text */

function unitOffset(anim: AnimSpec, p: number) {
  const inv = 1 - p;
  const d = (anim.distance ?? 200) * 0.35;
  switch (anim.type) {
    case 'slideUp': return { dx: 0, dy: inv * d, op: p };
    case 'slideDown': return { dx: 0, dy: -inv * d, op: p };
    case 'slideLeft': return { dx: inv * d, dy: 0, op: p };
    case 'slideRight': return { dx: -inv * d, dy: 0, op: p };
    case 'drop': return { dx: 0, dy: -inv * d * 1.5, op: clamp(p * 2) };
    case 'bounce': case 'pop': return { dx: 0, dy: inv * d * 0.4, op: clamp(p * 2) };
    default: return { dx: 0, dy: 0, op: p };
  }
}

function TextView({ el, st }: { el: Extract<SceneElement, { type: 'text' }>; st: ElementState }) {
  const p = el.props;
  const raw = p.uppercase ? p.text.toUpperCase() : p.text;
  const lines = raw.split('\n');
  const lh = p.fontSize * p.lineHeight;
  const y0 = -((lines.length - 1) * lh) / 2 + p.fontSize * 0.35;
  const hl = (p.highlight ?? '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  const kinetic = p.kinetic !== 'none' && !KINETIC_SKIP.has(el.animIn.type);
  const typing = el.animIn.type === 'typewriter';
  const totalChars = raw.replace(/\n/g, '').length;
  let visibleChars = typing ? Math.floor(st.progress * totalChars + 1e-6) : Infinity;

  // kinetic unit index across whole text
  let unitIdx = 0;
  const unitState = (i: number) => {
    const delay = (el.animIn.delay ?? 0) + i * p.stagger;
    const u = ease(el.animIn.easing, (st.local - delay) / Math.max(1e-4, el.animIn.duration));
    return unitOffset(el.animIn, u);
  };

  const common = {
    fontFamily: p.fontFamily,
    fontSize: p.fontSize,
    fontWeight: p.fontWeight,
    fontStyle: p.italic ? 'italic' : undefined,
    letterSpacing: p.letterSpacing || undefined,
    textAnchor: p.align,
    fill: p.color,
    stroke: p.stroke && p.strokeWidth ? p.stroke : undefined,
    strokeWidth: p.strokeWidth || undefined,
    paintOrder: 'stroke' as const,
    strokeLinejoin: 'round' as const,
  };

  const bgW = Math.max(...lines.map((l) => estimateTextWidth(l, p.fontSize, p.fontWeight, p.letterSpacing))) + (p.padding ?? 24) * 2;
  const bgH = lines.length * lh + (p.padding ?? 24) * 1.2;
  const bgX = p.align === 'middle' ? -bgW / 2 : p.align === 'start' ? -(p.padding ?? 24) : -bgW + (p.padding ?? 24);

  return (
    <g>
      {p.background && <rect x={bgX} y={-bgH / 2} width={bgW} height={bgH} rx={Math.min(bgH / 2, 28)} fill={p.background} />}
      {lines.map((line, li) => {
        const y = y0 + li * lh;
        if (typing) {
          const shown = line.slice(0, Math.max(0, visibleChars));
          visibleChars -= line.length;
          return <text key={li} x={0} y={y} {...common}>{renderHighlighted(shown, hl, p.highlightColor)}</text>;
        }
        if (!kinetic) {
          return <text key={li} x={0} y={y} {...common}>{renderHighlighted(line, hl, p.highlightColor)}</text>;
        }
        // kinetic: tspans with per-unit offset/opacity (layout preserved by the font engine)
        const units = p.kinetic === 'letters' ? [...line] : p.kinetic === 'lines' ? [line] : line.split(/(\s+)/);
        let accDx = 0, accDy = 0;
        const spans = units.map((u, ui) => {
          if (/^\s+$/.test(u) && p.kinetic !== 'letters') return <tspan key={ui}>{u}</tspan>;
          const s = unitState(unitIdx++);
          const dx = s.dx - accDx, dy = s.dy - accDy;
          accDx = s.dx; accDy = s.dy;
          const isHl = hl.includes(u.toLowerCase().replace(/[^\w%$€£]/g, ''));
          return (
            <tspan key={ui} dx={r2(dx) || undefined} dy={r2(dy) || undefined} fillOpacity={r3(clamp(s.op))} strokeOpacity={r3(clamp(s.op))} fill={isHl ? p.highlightColor : undefined}>{u}</tspan>
          );
        });
        return <text key={li} x={0} y={y} {...common}>{spans}</text>;
      })}
    </g>
  );
}

function renderHighlighted(text: string, hl: string[], color?: string) {
  if (!hl.length || !color) return text;
  return text.split(/(\s+)/).map((w, i) => (hl.includes(w.toLowerCase().replace(/[^\w%$€£]/g, '')) ? <tspan key={i} fill={color}>{w}</tspan> : w));
}

/* ------------------------------------------------------------------ shape */

export function shapePath(kind: string, w: number, h: number, sides: number, radius: number): string | null {
  const hw = w / 2, hh = h / 2;
  switch (kind) {
    case 'triangle': return `M 0 ${-hh} L ${hw} ${hh} L ${-hw} ${hh} Z`;
    case 'star': {
      const n = Math.max(3, sides || 5);
      const pts: string[] = [];
      for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / n;
        const r = i % 2 === 0 ? 1 : 0.45;
        pts.push(`${r2(Math.cos(a) * hw * r)} ${r2(Math.sin(a) * hh * r)}`);
      }
      return `M ${pts.join(' L ')} Z`;
    }
    case 'polygon': {
      const n = Math.max(3, sides || 6);
      const pts: string[] = [];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        pts.push(`${r2(Math.cos(a) * hw)} ${r2(Math.sin(a) * hh)}`);
      }
      return `M ${pts.join(' L ')} Z`;
    }
    case 'heart':
      return `M 0 ${hh * 0.95} C ${-hw * 1.4} ${-hh * 0.1} ${-hw * 0.6} ${-hh * 1.25} 0 ${-hh * 0.45} C ${hw * 0.6} ${-hh * 1.25} ${hw * 1.4} ${-hh * 0.1} 0 ${hh * 0.95} Z`;
    case 'blob':
      return `M ${-hw * 0.9} ${-hh * 0.1} C ${-hw} ${-hh * 0.9} ${hw * 0.2} ${-hh * 1.1} ${hw * 0.8} ${-hh * 0.6} C ${hw * 1.1} ${-hh * 0.2} ${hw * 0.9} ${hh * 0.8} ${hw * 0.1} ${hh * 0.95} C ${-hw * 0.6} ${hh * 1.05} ${-hw * 0.85} ${hh * 0.5} ${-hw * 0.9} ${-hh * 0.1} Z`;
    case 'rect': {
      const r = Math.min(radius, hw, hh);
      return `M ${-hw + r} ${-hh} L ${hw - r} ${-hh} Q ${hw} ${-hh} ${hw} ${-hh + r} L ${hw} ${hh - r} Q ${hw} ${hh} ${hw - r} ${hh} L ${-hw + r} ${hh} Q ${-hw} ${hh} ${-hw} ${hh - r} L ${-hw} ${-hh + r} Q ${-hw} ${-hh} ${-hw + r} ${-hh} Z`;
    }
  }
  return null;
}

function ShapeView({ el, st, idp }: { el: Extract<SceneElement, { type: 'shape' }>; st: ElementState; idp: string }) {
  const p = el.props;
  const drawing = st.progress < 0.999;
  const dash = drawing ? { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - st.progress } : p.dashed ? { strokeDasharray: `${p.strokeWidth * 3} ${p.strokeWidth * 2}` } : {};
  const fillOp = drawing ? clamp((st.progress - 0.5) / 0.5) : 1;
  const hasGrad = !!p.fill2 && p.fill !== 'none';
  const fill = hasGrad ? `url(#${idp}-sg)` : p.fill;
  // when drawing a shape with no stroke, draw an outline in fill color
  const stroke = p.stroke !== 'none' && p.strokeWidth > 0 ? p.stroke : drawing ? (p.fill === 'none' ? '#fff' : p.fill) : 'none';
  const sw = p.stroke !== 'none' && p.strokeWidth > 0 ? p.strokeWidth : drawing ? 4 : 0;
  const common = { fill, fillOpacity: fillOp, stroke, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...dash };
  let body: React.ReactNode;
  switch (p.shape) {
    case 'circle': body = <circle r={p.w / 2} {...common} />; break;
    case 'ellipse': body = <ellipse rx={p.w / 2} ry={p.h / 2} {...common} />; break;
    case 'ring': body = <circle r={p.w / 2} {...common} fill="none" stroke={p.fill} strokeWidth={Math.max(p.strokeWidth, 6)} />; break;
    case 'line': body = <line x1={-p.w / 2} y1={0} x2={p.w / 2} y2={0} {...common} stroke={p.stroke !== 'none' ? p.stroke : p.fill} strokeWidth={Math.max(p.strokeWidth, 2)} />; break;
    default: body = <path d={shapePath(p.shape, p.w, p.h, p.sides, p.radius) ?? ''} {...common} />;
  }
  return (
    <g>
      {hasGrad && (
        <defs><linearGradient id={`${idp}-sg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p.fill} /><stop offset="1" stopColor={p.fill2} /></linearGradient></defs>
      )}
      {body}
    </g>
  );
}

/* ------------------------------------------------------------------ arrow */

type Pt = [number, number];
function quadAt(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]];
}
function quadSplit(p0: Pt, p1: Pt, p2: Pt, t: number): [Pt, Pt, Pt] {
  const q0: Pt = [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t)];
  const q1: Pt = [lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t)];
  const e: Pt = [lerp(q0[0], q1[0], t), lerp(q0[1], q1[1], t)];
  return [p0, q0, e];
}

function ArrowView({ el, st }: { el: Extract<SceneElement, { type: 'arrow' }>; st: ElementState }) {
  const p = el.props;
  const p0: Pt = [-p.dx / 2, -p.dy / 2];
  const p2: Pt = [p.dx / 2, p.dy / 2];
  const len = Math.hypot(p.dx, p.dy) || 1;
  const nx = -p.dy / len, ny = p.dx / len;
  const p1: Pt = [nx * p.curve * len, ny * p.curve * len];
  const t = clamp(st.progress);
  if (t <= 0.001) return null;
  const [a, b, c] = quadSplit(p0, p1, p2, t);
  const d = `M ${r2(a[0])} ${r2(a[1])} Q ${r2(b[0])} ${r2(b[1])} ${r2(c[0])} ${r2(c[1])}`;
  const tangent = (pt: Pt, from: Pt) => Math.atan2(pt[1] - from[1], pt[0] - from[0]);
  const endAng = tangent(c, b);
  const hs = p.headSize;
  const head = (pt: Pt, ang: number, k: string) => (
    <path key={k} d={`M ${r2(pt[0] + Math.cos(ang + 2.6) * hs)} ${r2(pt[1] + Math.sin(ang + 2.6) * hs)} L ${r2(pt[0])} ${r2(pt[1])} L ${r2(pt[0] + Math.cos(ang - 2.6) * hs)} ${r2(pt[1] + Math.sin(ang - 2.6) * hs)}`}
      fill="none" stroke={p.color} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  );
  const startAng = tangent(a, quadAt(p0, p1, p2, 0.02));
  return (
    <g>
      {p.style === 'sketch' && <path d={d} transform="translate(3 -2)" fill="none" stroke={p.color} strokeWidth={p.strokeWidth * 0.45} strokeLinecap="round" opacity={0.6} />}
      <path d={d} fill="none" stroke={p.color} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeDasharray={p.dashed ? `${p.strokeWidth * 2.5} ${p.strokeWidth * 2}` : undefined} />
      {hs > 0 && head(c, endAng, 'h1')}
      {hs > 0 && p.doubleHead && head(a, startAng, 'h2')}
    </g>
  );
}

/* ------------------------------------------------------------------ chart */

function staggered(progress: number, i: number, n: number, stagger: number) {
  const s = Math.min(0.85, Math.max(0, stagger));
  if (n <= 1) return clamp(progress);
  const d = s / (n - 1);
  return clamp((progress - i * d) / (1 - s));
}

function ChartView({ el, st }: { el: Extract<SceneElement, { type: 'chart' }>; st: ElementState }) {
  const p = el.props;
  const W = p.w, H = p.h;
  const x0 = -W / 2, y0 = -H / 2;
  const prog = clamp(st.progress);
  const color = (i: number) => p.colors[i % Math.max(1, p.colors.length)] ?? '#7c5cff';
  const font = { fontFamily: p.fontFamily, fill: p.textColor };
  const labelSize = Math.max(14, Math.min(34, H * 0.065));
  const padB = p.showLabels ? labelSize * 1.8 : 10;
  const padT = p.showValues ? labelSize * 1.6 : 10;
  const plotH = H - padB - padT;
  const base = y0 + H - padB;
  const out: React.ReactNode[] = [];

  if (p.chartType === 'pie' || p.chartType === 'donut') {
    const total = p.data.reduce((s, v) => s + Math.max(0, v), 0) || 1;
    const R = Math.min(W, H) / 2 - 10;
    const sweepMax = prog * Math.PI * 2;
    let acc = -Math.PI / 2;
    let used = 0;
    p.data.forEach((v, i) => {
      const full = (Math.max(0, v) / total) * Math.PI * 2;
      const ang = Math.max(0, Math.min(full, sweepMax - used));
      used += full;
      if (ang > 0.0005) {
        const a0 = acc, a1 = acc + ang;
        const large = ang > Math.PI ? 1 : 0;
        const pts = [Math.cos(a0) * R, Math.sin(a0) * R, Math.cos(a1) * R, Math.sin(a1) * R].map(r2);
        const d = ang >= Math.PI * 2 - 1e-3
          ? `M ${R} 0 A ${R} ${R} 0 1 1 ${-R} 0 A ${R} ${R} 0 1 1 ${R} 0 Z`
          : `M 0 0 L ${pts[0]} ${pts[1]} A ${R} ${R} 0 ${large} 1 ${pts[2]} ${pts[3]} Z`;
        out.push(<path key={`s${i}`} d={d} fill={color(i)} stroke={p.axisColor} strokeWidth={p.strokeWidth * 0.5} />);
        if (p.showLabels && ang === full && p.labels[i]) {
          const mid = a0 + ang / 2;
          const lr = p.chartType === 'donut' ? R * 0.78 : R * 0.62;
          out.push(<text key={`l${i}`} x={r2(Math.cos(mid) * lr)} y={r2(Math.sin(mid) * lr + labelSize * 0.35)} textAnchor="middle" fontSize={labelSize} fontWeight={700} {...font} fill="#fff">{p.labels[i]}</text>);
        }
      }
      acc += full;
    });
    if (p.chartType === 'donut') out.push(<circle key="hole" r={R * 0.55} fill={p.axisColor} />);
    return <g>{out}</g>;
  }

  if (p.chartType === 'candlestick') {
    const cs = p.candles;
    const n = cs.length || 1;
    const lo = Math.min(...cs.map((c) => c.l)), hi = Math.max(...cs.map((c) => c.h));
    const yv = (v: number) => base - ((v - lo) / (hi - lo || 1)) * plotH;
    const slot = W / n;
    if (p.showAxis) out.push(<line key="ax" x1={x0} y1={base} x2={x0 + W} y2={base} stroke={p.axisColor} strokeWidth={p.strokeWidth * 0.6} />);
    cs.forEach((c, i) => {
      const k = staggered(prog, i, n, p.stagger);
      if (k <= 0) return;
      const cx = x0 + slot * (i + 0.5);
      const up = c.c >= c.o;
      const col = up ? p.upColor : p.downColor;
      const mid = yv((c.o + c.c) / 2);
      const wt = yv(c.h), wb = yv(c.l);
      out.push(<line key={`w${i}`} x1={cx} y1={lerp(mid, wt, k)} x2={cx} y2={lerp(mid, wb, k)} stroke={col} strokeWidth={Math.max(2, p.strokeWidth * 0.5)} strokeLinecap="round" />);
      const top = yv(Math.max(c.o, c.c)), bot = yv(Math.min(c.o, c.c));
      const bh = Math.max(3, (bot - top) * k);
      out.push(<rect key={`b${i}`} x={cx - slot * 0.3} y={lerp(mid, top, k)} width={slot * 0.6} height={bh} rx={Math.min(4, slot * 0.08)} fill={col} />);
    });
    return <g>{out}</g>;
  }

  const n = p.data.length || 1;
  const max = Math.max(...p.data, 0) || 1;
  const min = Math.min(...p.data, 0);
  const range = max - min || 1;
  const yv = (v: number) => base - ((v - min) / range) * plotH;

  if (p.chartType === 'hbar') {
    const labelW = p.showLabels ? W * 0.22 : 0;
    const plotW = W - labelW - (p.showValues ? W * 0.12 : 0);
    const slot = H / n;
    p.data.forEach((v, i) => {
      const k = staggered(prog, i, n, p.stagger);
      const y = y0 + slot * i + slot * 0.18;
      const bw = (Math.max(0, v) / max) * plotW * k;
      out.push(<rect key={`b${i}`} x={x0 + labelW} y={y} width={Math.max(0, bw)} height={slot * 0.64} rx={Math.min(10, slot * 0.2)} fill={color(i)} />);
      if (p.showLabels) out.push(<text key={`l${i}`} x={x0 + labelW - 12} y={y + slot * 0.32 + labelSize * 0.35} textAnchor="end" fontSize={labelSize} {...font}>{p.labels[i] ?? ''}</text>);
      if (p.showValues && k > 0.05) out.push(<text key={`v${i}`} x={x0 + labelW + bw + 10} y={y + slot * 0.32 + labelSize * 0.35} fontSize={labelSize} fontWeight={700} {...font} opacity={k}>{formatNumber(v * k, Number.isInteger(v) ? 0 : 1, true)}</text>);
    });
    return <g>{out}</g>;
  }

  if (p.showAxis) {
    out.push(<line key="ax" x1={x0} y1={base} x2={x0 + W} y2={base} stroke={p.axisColor} strokeWidth={p.strokeWidth * 0.6} strokeLinecap="round" />);
    out.push(<line key="ay" x1={x0} y1={base} x2={x0} y2={y0 + padT * 0.5} stroke={p.axisColor} strokeWidth={p.strokeWidth * 0.6} strokeLinecap="round" />);
  }

  if (p.chartType === 'bar') {
    const slot = W / n;
    p.data.forEach((v, i) => {
      const k = staggered(prog, i, n, p.stagger);
      const top = lerp(yv(0), yv(v), k);
      const x = x0 + slot * i + slot * 0.18;
      out.push(<rect key={`b${i}`} x={x} y={Math.min(top, yv(0))} width={slot * 0.64} height={Math.abs(yv(0) - top)} rx={Math.min(10, slot * 0.12)} fill={color(i)} />);
      if (p.showLabels) out.push(<text key={`l${i}`} x={x + slot * 0.32} y={base + labelSize * 1.3} textAnchor="middle" fontSize={labelSize} {...font}>{p.labels[i] ?? ''}</text>);
      if (p.showValues && k > 0.05) out.push(<text key={`v${i}`} x={x + slot * 0.32} y={top - labelSize * 0.5} textAnchor="middle" fontSize={labelSize} fontWeight={700} {...font} opacity={k}>{formatNumber(v * k, Number.isInteger(v) ? 0 : 1, true)}</text>);
    });
    return <g>{out}</g>;
  }

  // line / area: reveal along the polyline by length
  const step = n > 1 ? W / (n - 1) : 0;
  const pts: Pt[] = p.data.map((v, i) => [x0 + i * step, yv(v)]);
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
  const target = total * prog;
  const shown: Pt[] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    if (acc + segs[i - 1] <= target) { shown.push(pts[i]); acc += segs[i - 1]; continue; }
    const f = (target - acc) / (segs[i - 1] || 1);
    if (f > 0) shown.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]);
    break;
  }
  const poly = shown.map((q) => `${r2(q[0])},${r2(q[1])}`).join(' ');
  if (p.chartType === 'area' && shown.length > 1) {
    const last = shown[shown.length - 1];
    out.push(<polygon key="area" points={`${r2(pts[0][0])},${r2(base)} ${poly} ${r2(last[0])},${r2(base)}`} fill={color(0)} opacity={0.28} />);
  }
  out.push(<polyline key="line" points={poly} fill="none" stroke={color(0)} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />);
  pts.forEach((q, i) => {
    const reached = i === 0 ? prog > 0 : shown.length > i && (shown[i][0] === q[0]);
    if (!reached) return;
    out.push(<circle key={`d${i}`} cx={q[0]} cy={q[1]} r={p.strokeWidth * 0.9} fill={p.axisColor === 'none' ? '#fff' : '#fff'} stroke={color(0)} strokeWidth={p.strokeWidth * 0.5} />);
    if (p.showValues) out.push(<text key={`v${i}`} x={q[0]} y={q[1] - labelSize * 0.8} textAnchor="middle" fontSize={labelSize} fontWeight={700} {...font}>{formatNumber(p.data[i], Number.isInteger(p.data[i]) ? 0 : 1, true)}</text>);
    if (p.showLabels) out.push(<text key={`l${i}`} x={q[0]} y={base + labelSize * 1.3} textAnchor="middle" fontSize={labelSize} {...font}>{p.labels[i] ?? ''}</text>);
  });
  return <g>{out}</g>;
}

/* ---------------------------------------------------------------- counter */

function CounterView({ el, st }: { el: Extract<SceneElement, { type: 'counter' }>; st: ElementState }) {
  const p = el.props;
  const v = lerp(p.from, p.to, clamp(st.progress));
  return (
    <text x={0} y={p.fontSize * 0.35} textAnchor="middle" fontFamily={p.fontFamily} fontSize={p.fontSize} fontWeight={p.fontWeight} fill={p.color}>
      {p.prefix}{formatNumber(v, p.decimals, p.separator)}{p.suffix}
    </text>
  );
}

/* ----------------------------------------------------------- illustration */

export function IllustrationView({ il, local, draw = 1, selectedPartId }: { il: Illustration; local: number; draw?: number; selectedPartId?: string }) {
  return (
    <g transform={`translate(${-il.w / 2} ${-il.h / 2})`}>
      {il.parts.map((p) => (p.hidden ? null : <PartView key={p.id} p={p} local={local} draw={draw} selected={p.id === selectedPartId} />))}
    </g>
  );
}

export function partAnimState(p: IllustrationPart, local: number) {
  const a = p.anim;
  const raw = a.type === 'none' ? 1 : clamp((local - a.delay) / Math.max(1e-4, a.duration));
  const k = ease(a.easing, raw);
  const s = { dx: 0, dy: 0, scale: 1, sy: 1, rot: 0, op: 1, draw: 1 };
  switch (a.type) {
    case 'fade': s.op = k; break;
    case 'pop': s.scale = k; s.op = clamp(raw * 4); break;
    case 'draw': s.draw = raw; break;
    case 'slideUp': s.dy = (1 - k) * 60; s.op = clamp(raw * 2); break;
    case 'slideDown': s.dy = -(1 - k) * 60; s.op = clamp(raw * 2); break;
    case 'slideLeft': s.dx = (1 - k) * 60; s.op = clamp(raw * 2); break;
    case 'slideRight': s.dx = -(1 - k) * 60; s.op = clamp(raw * 2); break;
    case 'grow': s.sy = k; s.op = clamp(raw * 5); break;
    case 'spin': s.rot = (1 - k) * -180; s.scale = k; break;
  }
  const lp = p.loop;
  if (lp && lp.type !== 'none' && raw >= 1) {
    const lt = local - a.delay - a.duration;
    const ph = lt * lp.speed * Math.PI * 2;
    switch (lp.type) {
      case 'float': s.dy += Math.sin(ph) * lp.amount; break;
      case 'bob': s.dy -= Math.abs(Math.sin(ph)) * lp.amount; break;
      case 'pulse': s.scale *= 1 + Math.sin(ph) * lp.amount; break;
      case 'spin': s.rot += lt * lp.speed * 360; break;
      case 'swing': s.rot += Math.sin(ph) * lp.amount; break;
      case 'shake': s.dx += noise(Math.floor(lt * lp.speed * 20)) * lp.amount; break;
      case 'blink': s.op *= Math.sin(ph) > -0.3 ? 1 : 0.2; break;
      case 'glowPulse': s.op *= 0.7 + 0.3 * (Math.sin(ph) * 0.5 + 0.5); break;
    }
  }
  return s;
}

function PartView({ p, local, draw, selected }: { p: IllustrationPart; local: number; draw: number; selected?: boolean }) {
  const s = partAnimState(p, local);
  const [cx, cy] = p.anim.type === 'grow' ? partBottom(p) : partCenter(p);
  const d = Math.min(s.draw, draw);
  const drawing = d < 0.999;
  const a = p.attrs as Record<string, any>;
  const stroke = p.stroke !== 'none' && p.strokeWidth > 0 ? p.stroke : drawing && p.kind !== 'text' ? p.fill : p.stroke;
  const sw = p.stroke !== 'none' && p.strokeWidth > 0 ? p.strokeWidth : drawing ? 3 : 0;
  const style = {
    fill: p.fill,
    fillOpacity: drawing ? clamp((d - 0.55) / 0.45) : 1,
    stroke,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...(drawing ? { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - d } : {}),
  };
  let el: React.ReactNode;
  switch (p.kind) {
    case 'rect': el = <rect x={a.x} y={a.y} width={a.w} height={a.h} rx={a.rx ?? 0} {...style} />; break;
    case 'circle': el = <circle cx={a.cx} cy={a.cy} r={a.r} {...style} />; break;
    case 'ellipse': el = <ellipse cx={a.cx} cy={a.cy} rx={a.rx} ry={a.ry} {...style} />; break;
    case 'path': el = <path d={a.d} {...style} />; break;
    case 'polygon': el = <polygon points={a.points} {...style} />; break;
    case 'line': el = <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} {...style} />; break;
    case 'text': el = <text x={a.x} y={a.y} textAnchor="middle" fontSize={a.fontSize ?? 40} fontWeight={a.fontWeight ?? 700} fontFamily={a.fontFamily ?? 'Arial, Helvetica, sans-serif'} fill={p.fill} opacity={drawing ? d : 1}>{a.text}</text>; break;
  }
  const userT = `translate(${p.tx} ${p.ty}) translate(${cx} ${cy}) rotate(${p.r}) scale(${p.s}) translate(${-cx} ${-cy})`;
  const animT = `translate(${r2(s.dx)} ${r2(s.dy)}) translate(${cx} ${cy}) rotate(${r2(s.rot)}) scale(${r3(s.scale)} ${r3(s.scale * s.sy)}) translate(${-cx} ${-cy})`;
  return (
    <g data-part-id={p.id} transform={userT} opacity={p.opacity}>
      <g transform={animT} opacity={r3(clamp(s.op))}>{el}</g>
      {selected && <g>{el && React.cloneElement(el as React.ReactElement, { fill: 'none', stroke: '#c084fc', strokeWidth: 3, strokeDasharray: '8 6', pathLength: undefined, strokeDashoffset: 0, fillOpacity: 0 })}</g>}
    </g>
  );
}

/* --------------------------------------------------------------------- fx */

function rnd(seed: number, i: number) {
  const s = Math.sin(seed * 9301 + i * 49297 + 233.3) * 233280;
  return s - Math.floor(s);
}

function FxView({ el, st, idp }: { el: Extract<SceneElement, { type: 'fx' }>; st: ElementState; idp: string }) {
  const p = el.props;
  const W = p.w, H = p.h, t = st.local, sp = p.speed;
  const x0 = -W / 2, y0 = -H / 2;
  const items: React.ReactNode[] = [];
  const mod = (a: number, m: number) => ((a % m) + m) % m;
  switch (p.kind) {
    case 'particles':
      for (let i = 0; i < p.count; i++) {
        const x = x0 + rnd(p.seed, i) * W + Math.sin(t * sp + i) * 10;
        const y = y0 + mod(rnd(p.seed, i + 500) * H - t * sp * 60 * (0.5 + rnd(p.seed, i + 900)), H);
        const r = p.size * (0.4 + rnd(p.seed, i + 1300));
        items.push(<circle key={i} cx={r2(x)} cy={r2(y)} r={r2(r)} fill={i % 3 === 0 ? p.color2 : p.color} opacity={r3(0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 * sp + i)))} />);
      }
      break;
    case 'stars':
      for (let i = 0; i < p.count; i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * 3 * sp + rnd(p.seed, i) * 20);
        items.push(<circle key={i} cx={r2(x0 + rnd(p.seed, i) * W)} cy={r2(y0 + rnd(p.seed, i + 77) * H)} r={r2(p.size * (0.3 + rnd(p.seed, i + 33) * 0.8) * (0.6 + tw * 0.4))} fill={p.color} opacity={r3(0.2 + tw * 0.8)} />);
      }
      break;
    case 'grid': {
      const sz = p.size * 4;
      const off = mod(t * sp * 40, sz);
      for (let x = x0 - sz + off; x <= x0 + W; x += sz) items.push(<line key={`x${x}`} x1={r2(x)} y1={y0} x2={r2(x)} y2={y0 + H} stroke={p.color} strokeWidth={1.5} opacity={0.5} />);
      for (let y = y0 - sz + off; y <= y0 + H; y += sz) items.push(<line key={`y${y}`} x1={x0} y1={r2(y)} x2={x0 + W} y2={r2(y)} stroke={p.color} strokeWidth={1.5} opacity={0.5} />);
      break;
    }
    case 'rays': {
      const n = Math.max(4, Math.min(48, p.count));
      const R = Math.hypot(W, H);
      const rot = t * sp * 15;
      for (let i = 0; i < n; i++) {
        const a0 = ((i / n) * 360 + rot) * Math.PI / 180, a1 = (((i + 0.5) / n) * 360 + rot) * Math.PI / 180;
        items.push(<path key={i} d={`M 0 0 L ${r2(Math.cos(a0) * R)} ${r2(Math.sin(a0) * R)} L ${r2(Math.cos(a1) * R)} ${r2(Math.sin(a1) * R)} Z`} fill={i % 2 ? p.color2 : p.color} opacity={0.35} />);
      }
      break;
    }
    case 'waves':
      for (let k = 0; k < Math.max(1, Math.min(8, p.count)); k++) {
        const pts: string[] = [];
        const amp = p.size * 3 * (1 + k * 0.3);
        const yb = y0 + H * (0.35 + k * 0.12);
        for (let x = 0; x <= W; x += 24) pts.push(`${r2(x0 + x)},${r2(yb + Math.sin(x / (120 + k * 30) + t * sp * 2 + k) * amp)}`);
        items.push(<polyline key={k} points={pts.join(' ')} fill="none" stroke={k % 2 ? p.color2 : p.color} strokeWidth={3 + k} opacity={0.6 - k * 0.06} strokeLinecap="round" />);
      }
      break;
    case 'bokeh':
      items.push(<defs key="d"><radialGradient id={`${idp}-bk`}><stop offset="0" stopColor="#fff" stopOpacity="1" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient></defs>);
      for (let i = 0; i < p.count; i++) {
        const x = x0 + mod(rnd(p.seed, i) * W + t * sp * 12 * (rnd(p.seed, i + 3) - 0.5) * 4, W);
        const y = y0 + mod(rnd(p.seed, i + 50) * H - t * sp * 8, H);
        const r = p.size * (3 + rnd(p.seed, i + 100) * 6);
        items.push(<circle key={i} cx={r2(x)} cy={r2(y)} r={r2(r)} fill={i % 2 ? p.color2 : p.color} opacity={0.18 + 0.12 * Math.sin(t * sp + i)} />);
      }
      break;
    case 'confetti': {
      const palette = [p.color, p.color2, '#ffd35c', '#22d39a', '#22d3ee', '#ff5fa2'];
      for (let i = 0; i < p.count; i++) {
        const fall = t * sp * (200 + rnd(p.seed, i + 5) * 300);
        const y = y0 - 40 + rnd(p.seed, i + 9) * -H * 0.5 + fall;
        if (y > y0 + H + 40) continue;
        const x = x0 + rnd(p.seed, i) * W + Math.sin(t * 3 + i) * 30;
        const rot = t * 360 * (rnd(p.seed, i + 13) - 0.5) * 2 * sp;
        items.push(<rect key={i} x={-p.size} y={-p.size * 0.5} width={p.size * 2} height={p.size} fill={palette[i % palette.length]} transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)})`} />);
      }
      break;
    }
    case 'scanlines': {
      const gap = Math.max(4, p.size);
      const off = mod(t * sp * 30, gap);
      for (let y = y0 + off; y < y0 + H; y += gap) items.push(<line key={y} x1={x0} x2={x0 + W} y1={r2(y)} y2={r2(y)} stroke={p.color} strokeWidth={1} opacity={0.25} />);
      break;
    }
  }
  return (
    <g>
      <defs><clipPath id={`${idp}-fc`}><rect x={x0} y={y0} width={W} height={H} /></clipPath></defs>
      <g clipPath={`url(#${idp}-fc)`} opacity={st.progress}>{items}</g>
    </g>
  );
}
