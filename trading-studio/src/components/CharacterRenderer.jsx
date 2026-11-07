// Parametric character renderer. Every visual attribute comes from the saved character config,
// so the same character renders identically in every scene, thumbnail and preview.
import React, { useId } from 'react';

const PROPORTIONS = {
  slim: { shoulder: 30, waist: 23, arm: 10, leg: 12, head: 1, torso: 1, legs: 1 },
  average: { shoulder: 35, waist: 29, arm: 13, leg: 15, head: 1, torso: 1, legs: 1 },
  broad: { shoulder: 45, waist: 35, arm: 17, leg: 19, head: 0.95, torso: 1.02, legs: 0.98 },
  chibi: { shoulder: 30, waist: 28, arm: 12, leg: 14, head: 1.45, torso: 0.62, legs: 0.58 },
  heroic: { shoulder: 47, waist: 27, arm: 15, leg: 16, head: 0.85, torso: 1.05, legs: 1.15 },
};
const ARM_MOD = { thin: { w: 0.7, l: 1 }, average: { w: 1, l: 1 }, muscular: { w: 1.35, l: 1 }, long: { w: 0.9, l: 1.18 } };
const LEG_MOD = { thin: { w: 0.72, l: 1 }, average: { w: 1, l: 1 }, long: { w: 0.95, l: 1.18 }, short: { w: 1.08, l: 0.8 } };

// Joint angles (degrees, SVG rotation; 0 = hanging straight down). [upper, lower]
const POSES = {
  idle: { aL: [9, -6], aR: [-9, 6], lL: [3, 0], lR: [-3, 0] },
  walking: { aL: [6, -10], aR: [-6, 10], lL: [2, 0], lR: [-2, 0] },
  running: { aL: [28, -85], aR: [-28, 85], lL: [6, 0], lR: [-6, 0] },
  sitting: { seated: true, aL: [16, -38], aR: [-16, 38], lL: [28, -28], lR: [-28, 28] },
  thinking: { aL: [9, -6], aR: [22, 148], lL: [3, 0], lR: [-3, 0], tilt: 6 },
  typing: { seated: true, desk: true, aL: [22, -72], aR: [-22, 72], lL: [24, -24], lR: [-24, 24], tilt: 0 },
  trading: { seated: true, desk: true, monitors: true, aL: [20, -78], aR: [-26, 92], lL: [24, -24], lR: [-24, 24] },
  celebrating: { aL: [152, 12], aR: [-152, -12], lL: [8, 0], lR: [-8, 0] },
  frustrated: { aL: [138, 78], aR: [-138, -78], lL: [4, 0], lR: [-4, 0], tilt: -4 },
  motivational: { aL: [9, -6], aR: [-150, 8], lL: [6, 0], lR: [-6, 0] },
};

export const POSE_IDS = Object.keys(POSES);

function headPath(shape, R) {
  switch (shape) {
    case 'square': return { type: 'rect', x: -R, y: -R * 1.02, w: R * 2, h: R * 2.04, rx: R * 0.38 };
    case 'oval': return { type: 'ellipse', rx: R * 0.86, ry: R * 1.1 };
    case 'tall': return { type: 'ellipse', rx: R * 0.8, ry: R * 1.18 };
    case 'wide': return { type: 'ellipse', rx: R * 1.16, ry: R * 0.92 };
    default: return { type: 'path', d: `M${-R} ${-R * 0.1} C${-R} ${-R * 1.25} ${R} ${-R * 1.25} ${R} ${-R * 0.1} C${R} ${R * 0.62} ${R * 0.55} ${R * 1.05} 0 ${R * 1.05} C${-R * 0.55} ${R * 1.05} ${-R} ${R * 0.62} ${-R} ${-R * 0.1}Z` };
  }
}

function hairPath(style, R) {
  const p = (pts) => `M${pts.map(([x, y]) => `${(x * R).toFixed(1)} ${(y * R).toFixed(1)}`).join(' L')}Z`;
  switch (style) {
    case 'spiky':
      return p([[-1.02, -0.05], [-1.32, -0.42], [-0.92, -0.62], [-1.05, -0.95], [-0.55, -0.9], [-0.42, -1.3], [-0.05, -1.05], [0.32, -1.32], [0.5, -0.98], [0.95, -1.08], [0.86, -0.7], [1.18, -0.55], [1.02, -0.12], [0.9, -0.3], [-0.85, -0.3]]);
    case 'swept':
      return `M${-R * 1.02} ${-R * 0.1} C${-R * 1.2} ${-R * 1.2} ${R * 0.4} ${-R * 1.5} ${R * 1.15} ${-R * 0.75} C${R * 0.7} ${-R * 0.85} ${R * 0.2} ${-R * 0.7} ${-R * 0.3} ${-R * 0.45} C${-R * 0.6} ${-R * 0.35} ${-R * 0.9} ${-R * 0.2} ${-R * 1.02} ${-R * 0.1}Z`;
    case 'short':
      return `M${-R * 1.0} ${-R * 0.25} C${-R} ${-R * 1.3} ${R} ${-R * 1.3} ${R} ${-R * 0.25} C${R * 0.6} ${-R * 0.55} ${-R * 0.6} ${-R * 0.55} ${-R} ${-R * 0.25}Z`;
    case 'messy':
      return p([[-1.05, -0.1], [-1.2, -0.6], [-0.8, -0.75], [-0.85, -1.15], [-0.4, -0.98], [-0.2, -1.32], [0.1, -1.0], [0.45, -1.25], [0.55, -0.92], [1.05, -0.95], [0.9, -0.62], [1.25, -0.35], [1.02, -0.1], [0, -0.45]]);
    default:
      return null;
  }
}

function Limb({ x, y, a1, a2, l1, l2, w, color, lowerColor, end, cls }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a1})`}>
      <g className={`j ${cls}-1`}>
        <line x1="0" y1="0" x2="0" y2={l1} stroke={color} strokeWidth={w} strokeLinecap="round" />
        <g transform={`translate(0 ${l1}) rotate(${a2})`}>
          <g className={`j ${cls}-2`}>
            <line x1="0" y1="0" x2="0" y2={l2} stroke={lowerColor || color} strokeWidth={w * 0.92} strokeLinecap="round" />
            {end}
          </g>
        </g>
      </g>
    </g>
  );
}

function Eyes({ type, expression, R, spacing, size, color, body, glow, gid }) {
  if (type === 'none') return null;
  const dx = R * 0.34 * spacing;
  const y = R * 0.02;
  let r = R * 0.165 * size;
  if (type === 'dots') r *= 0.6;
  if (expression === 'surprised') r *= 1.25;
  const one = (side) => {
    const cx = side * dx;
    if (expression === 'happy') {
      return <path d={`M${cx - r} ${y + r * 0.3} Q${cx} ${y - r * 1.2} ${cx + r} ${y + r * 0.3}`} stroke={color} strokeWidth={r * 0.55} fill="none" strokeLinecap="round" />;
    }
    let ry = r;
    if (type === 'narrow' || expression === 'focused') ry = r * (type === 'narrow' ? 0.45 : 0.72);
    if (type === 'anime') ry = r * 1.35;
    const lid = {
      determined: `M${cx - r * 1.4} ${y - r * 0.35} L${cx + r * 1.4} ${y - r * 0.35} L${cx + r * 1.4} ${y - r * 2} L${cx - r * 1.4} ${y - r * 2}Z`,
      angry: `M${cx - r * 1.4} ${y - r * (side > 0 ? 0.9 : 0.05)} L${cx + r * 1.4} ${y - r * (side > 0 ? 0.05 : 0.9)} L${cx + r * 1.4} ${y - r * 2.2} L${cx - r * 1.4} ${y - r * 2.2}Z`,
      worried: `M${cx - r * 1.4} ${y - r * (side > 0 ? 0.1 : 0.85)} L${cx + r * 1.4} ${y - r * (side > 0 ? 0.85 : 0.1)} L${cx + r * 1.4} ${y - r * 2.2} L${cx - r * 1.4} ${y - r * 2.2}Z`,
      sad: `M${cx - r * 1.4} ${y - r * (side > 0 ? 0.0 : 0.7)} L${cx + r * 1.4} ${y - r * (side > 0 ? 0.7 : 0.0)} L${cx + r * 1.4} ${y - r * 2.2} L${cx - r * 1.4} ${y - r * 2.2}Z`,
    }[expression];
    return (
      <g key={side}>
        {type === 'glowing' && <ellipse cx={cx} cy={y} rx={r * 2.1} ry={ry * 2.1} fill={color} opacity={0.35 * (glow + 0.4)} filter={`url(#${gid}-blur)`} />}
        <ellipse cx={cx} cy={y + (expression === 'sad' ? r * 0.15 : 0)} rx={r} ry={ry} fill={color} />
        {type === 'anime' && (<>
          <ellipse cx={cx} cy={y + ry * 0.15} rx={r * 0.62} ry={ry * 0.7} fill={body} opacity="0.85" />
          <circle cx={cx - r * 0.3} cy={y - ry * 0.35} r={r * 0.28} fill="#fff" />
        </>)}
        {lid && <path d={lid} fill={body} />}
      </g>
    );
  };
  return <g className="eyes">{one(-1)}{one(1)}</g>;
}

function Mouth({ expression, R, color }) {
  const y = R * 0.55;
  const w = R * 0.22;
  const d = {
    happy: `M${-w} ${y} Q0 ${y + w} ${w} ${y}`,
    sad: `M${-w} ${y + w * 0.5} Q0 ${y - w * 0.4} ${w} ${y + w * 0.5}`,
    worried: `M${-w} ${y + 2} Q${-w / 2} ${y - 3} 0 ${y + 2} Q${w / 2} ${y + 6} ${w} ${y}`,
    angry: `M${-w} ${y + 3} L${w} ${y - 1}`,
    surprised: null,
  }[expression] ?? `M${-w * 0.7} ${y} L${w * 0.7} ${y}`;
  if (expression === 'surprised') return <ellipse cx="0" cy={y} rx={w * 0.4} ry={w * 0.55} fill={color} />;
  return <path d={d} stroke={color} strokeWidth={R * 0.07} fill="none" strokeLinecap="round" />;
}

export default function CharacterRenderer({ character, pose, expression, animate = true, showProps = true, className = '', style }) {
  const uid = useId().replace(/:/g, '');
  if (!character) return null;
  const a = character.appearance || {};
  const c = character.colors || {};
  const st = character.style || 'silhouette';
  const poseId = pose || character.animation?.default || 'idle';
  const P = POSES[poseId] || POSES.idle;
  const expr = expression || a.expression || character.defaultExpression || 'neutral';

  const prop = { ...(PROPORTIONS[a.bodyProportions] || PROPORTIONS.average) };
  if (st === 'cartoon') prop.head *= 1.12;
  if (st === 'anime') { prop.head *= 0.95; prop.legs *= 1.08; prop.shoulder *= 0.9; }
  const hs = (a.height ?? 100) / 100;
  const ws = (a.width ?? 100) / 100;
  const R = 34 * prop.head * ((a.headSize ?? 100) / 100);
  const armM = ARM_MOD[a.arms] || ARM_MOD.average;
  const legM = LEG_MOD[a.legs] || LEG_MOD.average;
  const stick = st === 'stickman';

  const armW = stick ? 5 : prop.arm * armM.w * ws;
  const legW = stick ? 5 : prop.leg * legM.w * ws;
  const thigh = 38 * prop.legs * legM.l * hs;
  const shin = 36 * prop.legs * legM.l * hs;
  const torso = 80 * prop.torso * hs;
  const upperArm = 36 * prop.torso * armM.l * hs;
  const foreArm = 32 * prop.torso * armM.l * hs;
  const sh = prop.shoulder * ws;
  const wa = prop.waist * ws;
  const ground = 330;
  const footH = a.feet === 'hidden' ? 0 : 6;
  const seated = !!P.seated;
  const thighEff = seated ? thigh * 0.38 : thigh;
  const hipY = ground - footH - shin - thighEff;
  const shoulderY = hipY - torso;
  const headCY = shoulderY - R * 0.92;
  const cx = 100;

  const body = c.body || '#050507';
  const clothing = a.clothing || 'none (silhouette)';
  const clothed = !clothing.startsWith('none');
  const sleeveColor = clothed && clothing !== 't-shirt' ? c.clothing : body;
  const upperSleeve = clothed ? c.clothing : body;
  const legColor = clothing === 'trench coat' ? body : clothed ? shade(c.clothing, -0.25) : body;

  // Material fill
  const mat = a.material || 'flat matte';
  const useGrad = mat !== 'flat matte' || st === '3d';
  const fill = (base, key) => (useGrad ? `url(#${uid}-${key})` : base);

  const outlineW = { cartoon: 3, cyberpunk: 2.2, minimal2d: 1.4, '3d': 0 }[st] || 0;
  const outlineColor = st === 'cartoon' ? '#000000' : c.outline || '#22d3ee';
  const glowAmt = st === 'cyberpunk' ? 1 : 0;
  const texture = a.texture || 'none';
  const acc = a.accessories || [];
  const hairD = a.hair === 'hood' ? null : hairPath(a.hair || 'spiky', R);
  const head = headPath(a.headShape, R);

  const hand = (w) => {
    if (a.hands === 'hidden') return null;
    const r = a.hands === 'simple' ? w * 0.45 : w * 0.6;
    return (
      <g>
        <circle cx="0" cy="0" r={r} fill={body} />
        {a.hands === 'detailed' && <ellipse cx={w * 0.35} cy={-w * 0.15} rx={w * 0.22} ry={w * 0.38} fill={body} />}
      </g>
    );
  };
  const foot = (side) => {
    if (a.feet === 'hidden') return null;
    const shoes = a.shoes && a.shoes !== 'none';
    const col = shoes ? c.shoes : body;
    const w = legW * 0.9;
    const shape = a.shoes === 'dress shoes' || a.feet === 'pointed'
      ? `M${-w * 0.6} 0 L${side * w * 1.6} ${footH + 2} L${-w * 0.6} ${footH + 2}Z`
      : null;
    return (
      <g transform={`translate(0 ${2})`}>
        {a.shoes === 'boots' && <rect x={-w * 0.7} y={-12} width={w * 1.4} height={14} rx="3" fill={col} />}
        {shape ? <path d={shape} fill={col} /> : <ellipse cx={side * w * 0.35} cy={footH * 0.55} rx={w * (a.feet === 'rounded' ? 1.1 : 0.95)} ry={footH * 0.85 + 1} fill={col} />}
        {a.shoes === 'sneakers' && <rect x={-w * 0.7 + side * w * 0.35} y={footH * 0.9} width={w * 1.5} height="2.2" rx="1" fill={c.clothingAccent} opacity=".9" />}
      </g>
    );
  };

  const lowerLegLen = seated ? shin : shin;
  const torsoPath = stick
    ? null
    : `M${cx - sh * 0.62} ${shoulderY} Q${cx - sh} ${shoulderY + 2} ${cx - sh} ${shoulderY + 18}
       L${cx - wa} ${hipY + 4} Q${cx - wa} ${hipY + 12} ${cx - wa + 8} ${hipY + 12}
       L${cx + wa - 8} ${hipY + 12} Q${cx + wa} ${hipY + 12} ${cx + wa} ${hipY + 4}
       L${cx + sh} ${shoulderY + 18} Q${cx + sh} ${shoulderY + 2} ${cx + sh * 0.62} ${shoulderY}Z`;

  const anim = animate ? `anim-${poseId}` : 'still';
  const spd = character.animation?.speed || 1;
  const intensity = character.animation?.intensity ?? 1;

  const filterParts = outlineW || glowAmt || texture !== 'none';

  return (
    <svg viewBox="0 0 200 340" className={`character ${anim} style-${st} ${className}`} style={{ '--spd': `${1 / spd}`, '--int': intensity, ...style }} role="img" aria-label={`${character.name} — ${poseId}`}>
      <defs>
        <filter id={`${uid}-blur`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" /></filter>
        {useGrad && ['body', 'cloth'].map((k) => {
          const base = k === 'body' ? body : c.clothing;
          const stops = mat === 'holographic'
            ? [[0, '#a855f7'], [0.35, '#22d3ee'], [0.7, '#f472b6'], [1, base]]
            : mat === 'metallic'
              ? [[0, shade(base, 0.45)], [0.45, base], [0.6, shade(base, 0.6)], [1, shade(base, -0.2)]]
              : mat === 'glossy'
                ? [[0, shade(base, 0.35)], [0.5, base], [1, shade(base, -0.2)]]
                : [[0, shade(base, 0.22)], [1, shade(base, -0.15)]];
          return (
            <linearGradient key={k} id={`${uid}-${k}`} x1="0" y1="0" x2="1" y2="1">
              {stops.map(([o, col]) => <stop key={o} offset={o} stopColor={col} stopOpacity={mat === 'holographic' && o < 1 ? 0.85 : 1} />)}
            </linearGradient>
          );
        })}
        {filterParts && (
          <filter id={`${uid}-fx`} x="-30%" y="-30%" width="160%" height="160%">
            {texture !== 'none' && (<>
              <feTurbulence type={texture === 'scanlines' ? 'turbulence' : 'fractalNoise'} baseFrequency={{ 'paper grain': '0.9', 'film grain': '1.6', scanlines: '0.001 0.45', halftone: '0.35' }[texture]} numOctaves="1" seed="3" result="noise" />
              <feColorMatrix in="noise" type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${texture === 'halftone' ? 0.9 : 0.55} -0.2`} result="grain" />
              <feComposite in="grain" in2="SourceAlpha" operator="in" result="tex" />
              <feComposite in="tex" in2="SourceGraphic" operator="over" result="textured" />
            </>)}
            {outlineW > 0 && (<>
              <feMorphology in="SourceAlpha" operator="dilate" radius={outlineW} result="thick" />
              <feFlood floodColor={outlineColor} result="oc" />
              <feComposite in="oc" in2="thick" operator="in" result="outline" />
            </>)}
            {glowAmt > 0 && (<>
              <feGaussianBlur in={outlineW ? 'outline' : 'SourceAlpha'} stdDeviation="5" result="glowBlur" />
            </>)}
            <feMerge>
              {glowAmt > 0 && <feMergeNode in="glowBlur" />}
              {outlineW > 0 && <feMergeNode in="outline" />}
              <feMergeNode in={texture !== 'none' ? 'textured' : 'SourceGraphic'} />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* ground shadow */}
      {(st === '3d' || st === 'cartoon' || st === 'cyberpunk') && <ellipse cx={cx} cy={ground + 4} rx={sh * 1.5} ry="6" fill="#000" opacity=".35" />}
      {showProps && P.monitors && (
        <g className="props-back" opacity=".95">
          {[-1, 1].map((s) => (
            <g key={s} transform={`translate(${cx + s * 70} ${shoulderY - 18})`}>
              <rect x="-26" y="-20" width="52" height="38" rx="3" fill="#0b1020" stroke="var(--secondary)" strokeOpacity=".6" />
              <polyline points="-20,10 -10,2 -2,6 8,-8 18,-12" fill="none" stroke={s > 0 ? '#22c55e' : '#ef4444'} strokeWidth="2" />
            </g>
          ))}
        </g>
      )}
      {showProps && seated && (
        <g className="chair">
          <rect x={cx - wa - 14} y={hipY - torso * 0.6} width={(wa + 14) * 2} height={torso * 0.62} rx="10" fill="#111827" opacity=".85" />
          <rect x={cx - wa - 18} y={hipY + 6} width={(wa + 18) * 2} height="10" rx="4" fill="#1f2937" />
          <rect x={cx - 3} y={hipY + 16} width="6" height={ground - hipY - 20} fill="#1f2937" />
        </g>
      )}

      <g className="figure" filter={filterParts ? `url(#${uid}-fx)` : undefined}>
        <g className="bob">
          {/* legs */}
          <Limb cls="legL" x={cx - wa * 0.48} y={hipY + 4} a1={P.lL[0]} a2={P.lL[1]} l1={thighEff} l2={lowerLegLen} w={legW} color={stick ? body : legColor} end={foot(-1)} />
          <Limb cls="legR" x={cx + wa * 0.48} y={hipY + 4} a1={P.lR[0]} a2={P.lR[1]} l1={thighEff} l2={lowerLegLen} w={legW} color={stick ? body : legColor} end={foot(1)} />

          {/* torso */}
          <g className="torso">
            {stick
              ? <line x1={cx} y1={shoulderY - 4} x2={cx} y2={hipY + 6} stroke={body} strokeWidth="5" strokeLinecap="round" />
              : <path d={torsoPath} fill={clothed ? fill(c.clothing, 'cloth') : fill(body, 'body')} />}
            {!stick && clothing === 'trench coat' && <path d={`M${cx - wa - 2} ${hipY} L${cx - wa - 10} ${hipY + thighEff + 18} L${cx + wa + 10} ${hipY + thighEff + 18} L${cx + wa + 2} ${hipY}Z`} fill={fill(c.clothing, 'cloth')} />}
            {!stick && clothing === 'hoodie' && (<>
              <path d={`M${cx - wa * 0.55} ${hipY - torso * 0.3} h${wa * 1.1} v${torso * 0.22} h${-wa * 1.1}Z`} fill={shade(c.clothing, -0.2)} />
              <line x1={cx - 5} y1={shoulderY + 6} x2={cx - 6} y2={shoulderY + 26} stroke={c.clothingAccent} strokeWidth="2" strokeLinecap="round" />
              <line x1={cx + 5} y1={shoulderY + 6} x2={cx + 6} y2={shoulderY + 26} stroke={c.clothingAccent} strokeWidth="2" strokeLinecap="round" />
            </>)}
            {!stick && clothing === 'suit jacket' && (<>
              <path d={`M${cx - 12} ${shoulderY} L${cx} ${shoulderY + torso * 0.5} L${cx + 12} ${shoulderY}`} fill={c.clothingAccent} />
              <path d={`M${cx - sh * 0.5} ${shoulderY + 2} L${cx - 3} ${shoulderY + torso * 0.52}`} stroke={shade(c.clothing, 0.3)} strokeWidth="2" />
              <path d={`M${cx + sh * 0.5} ${shoulderY + 2} L${cx + 3} ${shoulderY + torso * 0.52}`} stroke={shade(c.clothing, 0.3)} strokeWidth="2" />
            </>)}
            {!stick && clothing === 'tech jacket' && (<>
              <line x1={cx} y1={shoulderY + 4} x2={cx} y2={hipY + 8} stroke={c.clothingAccent} strokeWidth="2" />
              <path d={`M${cx - sh + 6} ${shoulderY + 22} L${cx - 10} ${shoulderY + 36} L${cx - 10} ${hipY}`} stroke={c.clothingAccent} strokeWidth="1.6" fill="none" opacity=".9" />
              <path d={`M${cx + sh - 6} ${shoulderY + 22} L${cx + 10} ${shoulderY + 36} L${cx + 10} ${hipY}`} stroke={c.clothingAccent} strokeWidth="1.6" fill="none" opacity=".9" />
            </>)}
            {!stick && clothing === 't-shirt' && <path d={`M${cx - 10} ${shoulderY} Q${cx} ${shoulderY + 10} ${cx + 10} ${shoulderY}`} stroke={shade(c.clothing, -0.3)} strokeWidth="2.5" fill="none" />}
            {acc.includes('scarf') && <path d={`M${cx - sh * 0.7} ${shoulderY - 2} Q${cx} ${shoulderY + 12} ${cx + sh * 0.7} ${shoulderY - 2} L${cx + sh * 0.5} ${shoulderY + 8} L${cx + sh * 0.55} ${shoulderY + 34} L${cx + sh * 0.3} ${shoulderY + 34} L${cx + sh * 0.25} ${shoulderY + 12} Q${cx} ${shoulderY + 18} ${cx - sh * 0.7} ${shoulderY + 6}Z`} fill={c.accessory} />}
          </g>

          {/* arms */}
          <Limb cls="armL" x={cx - sh + armW * 0.45} y={shoulderY + armW * 0.5} a1={P.aL[0]} a2={P.aL[1]} l1={upperArm} l2={foreArm} w={armW} color={stick ? body : upperSleeve} lowerColor={stick ? body : sleeveColor}
            end={<g transform={`translate(0 ${foreArm})`}>{hand(armW)}{acc.includes('watch') && <rect x={-armW * 0.55} y={-armW * 1.1} width={armW * 1.1} height={armW * 0.45} rx="1.5" fill={c.accessory} />}</g>} />
          <Limb cls="armR" x={cx + sh - armW * 0.45} y={shoulderY + armW * 0.5} a1={P.aR[0]} a2={P.aR[1]} l1={upperArm} l2={foreArm} w={armW} color={stick ? body : upperSleeve} lowerColor={stick ? body : sleeveColor}
            end={<g transform={`translate(0 ${foreArm})`}>{hand(armW)}</g>} />

          {/* head */}
          <g transform={`translate(${cx} ${headCY}) rotate(${P.tilt || 0})`}>
            <g className="head">
              {!stick && <rect x={-R * 0.28} y={R * 0.6} width={R * 0.56} height={R * 0.5} fill={clothing === 'hoodie' ? c.clothing : body} />}
              {a.hair === 'hood' && <ellipse cx="0" cy={-R * 0.05} rx={R * 1.3} ry={R * 1.32} fill={clothed ? c.clothing : shade(body, 0.12)} />}
              {clothing === 'hoodie' && a.hair !== 'hood' && <path d={`M${-R * 1.1} ${R * 0.4} Q0 ${R * 1.5} ${R * 1.1} ${R * 0.4} L${R * 0.9} ${R * 1.1} L${-R * 0.9} ${R * 1.1}Z`} fill={c.clothing} />}
              {head.type === 'ellipse' && <ellipse cx="0" cy="0" rx={head.rx} ry={head.ry} fill={stick ? 'none' : fill(body, 'body')} stroke={stick ? body : 'none'} strokeWidth="5" />}
              {head.type === 'rect' && <rect x={head.x} y={head.y} width={head.w} height={head.h} rx={head.rx} fill={stick ? 'none' : fill(body, 'body')} stroke={stick ? body : 'none'} strokeWidth="5" />}
              {head.type === 'path' && <path d={head.d} fill={stick ? 'none' : fill(body, 'body')} stroke={stick ? body : 'none'} strokeWidth="5" />}
              {hairD && !acc.includes('cap') && <path d={hairD} fill={fill(body, 'body')} />}
              {acc.includes('cap') && (<>
                <path d={`M${-R * 1.02} ${-R * 0.3} C${-R} ${-R * 1.35} ${R} ${-R * 1.35} ${R * 1.02} ${-R * 0.3}Z`} fill={c.accessory} />
                <path d={`M${R * 0.2} ${-R * 0.42} Q${R * 1.4} ${-R * 0.5} ${R * 1.55} ${-R * 0.25} L${R * 0.6} ${-R * 0.22}Z`} fill={shade(c.accessory, -0.25)} />
              </>)}
              <Eyes type={stick && a.eyes === 'round' ? 'dots' : a.eyes || 'round'} expression={expr} R={R} spacing={(a.eyeSpacing ?? 100) / 100} size={(a.eyeSize ?? 100) / 100}
                color={stick ? body : c.eyes || '#fff'} body={body} glow={st === 'cyberpunk' ? 1 : 0.4} gid={uid} />
              {['cartoon', 'anime', '3d'].includes(st) && a.eyes !== 'none' && <Mouth expression={expr} R={R} color={c.eyes || '#fff'} />}
              {acc.includes('glasses') && (
                <g stroke={c.accessory} strokeWidth="2.4" fill="none">
                  <rect x={-R * 0.6} y={-R * 0.2} width={R * 0.5} height={R * 0.4} rx="4" />
                  <rect x={R * 0.1} y={-R * 0.2} width={R * 0.5} height={R * 0.4} rx="4" />
                  <line x1={-R * 0.1} y1={-R * 0.05} x2={R * 0.1} y2={-R * 0.05} />
                </g>
              )}
              {acc.includes('visor') && <rect x={-R * 0.95} y={-R * 0.2} width={R * 1.9} height={R * 0.38} rx={R * 0.19} fill={c.accessory} opacity=".85" className="visor" />}
              {acc.includes('headphones') && (
                <g>
                  <path d={`M${-R * 1.05} ${-R * 0.05} C${-R * 1.05} ${-R * 1.55} ${R * 1.05} ${-R * 1.55} ${R * 1.05} ${-R * 0.05}`} stroke={c.accessory} strokeWidth="5" fill="none" />
                  <rect x={-R * 1.22} y={-R * 0.3} width={R * 0.34} height={R * 0.6} rx="6" fill={c.accessory} />
                  <rect x={R * 0.88} y={-R * 0.3} width={R * 0.34} height={R * 0.6} rx="6" fill={c.accessory} />
                </g>
              )}
              {(mat === 'glossy' || st === '3d') && !stick && <ellipse cx={-R * 0.4} cy={-R * 0.5} rx={R * 0.3} ry={R * 0.16} fill="#fff" opacity=".18" transform={`rotate(-25 ${-R * 0.4} ${-R * 0.5})`} />}
            </g>
          </g>
        </g>
      </g>

      {showProps && P.desk && (
        <g className="desk">
          <rect x="18" y={hipY - 6} width="164" height="12" rx="3" fill="#111827" stroke="var(--primary)" strokeOpacity=".35" />
          <rect x="30" y={hipY + 6} width="140" height={ground - hipY - 6} fill="#0b0f1a" opacity=".92" />
          <g transform={`translate(${cx} ${hipY - 6})`}>
            <path d="M-34 0 L-28 -40 L28 -40 L34 0Z" fill="#1f2937" stroke="var(--secondary)" strokeOpacity=".5" />
            <circle cx="0" cy="-20" r="5" fill="var(--secondary)" opacity=".7" className="pulse" />
          </g>
        </g>
      )}
    </svg>
  );
}

export function shade(hex = '#000000', amt = 0) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
