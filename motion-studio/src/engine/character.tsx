import React from 'react';
import { applyMovement, BUILTIN_POSES, mixPose } from './poses';
import type { AssetBundle, Character, Pose } from './schema';

export const DEFAULT_POSE: Pose = BUILTIN_POSES[0].pose;

const rad = (d: number) => (d * Math.PI) / 180;
/** direction for a limb angle: 0 = down, +90 = screen right */
const dir = (a: number, len: number): [number, number] => [Math.sin(rad(a)) * len, Math.cos(rad(a)) * len];
const add = (a: [number, number], b: [number, number]): [number, number] => [a[0] + b[0], a[1] + b[1]];
/** rotate a vector by torso angle (clockwise positive) */
const rot = (v: [number, number], deg: number): [number, number] => {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
};

export interface CharacterRenderOpts {
  pose: Pose;
  expression: string;
  /** -1 = closed / default by expression, 0..1 = mouth open amount */
  mouth: number;
  /** local time in seconds (used for blinking) */
  time: number;
  /** stroke draw progress 0..1 */
  draw: number;
}

export function characterBounds(c: Character) {
  const pr = c.proportions;
  if (c.style === 'image') return { w: 320, h: 420 };
  const top = pr.torsoLength + pr.headSize * 0.35 + pr.headSize * 2;
  return { w: Math.max(pr.armLength * 2 + pr.torsoWidth, pr.headSize * 2.6), h: top + pr.legLength + 10 };
}

/** Resolve the final pose for a character element at local time t. */
export function resolveCharacterPose(
  assets: AssetBundle,
  poseName: string,
  poseTo: string | undefined,
  mix: number,
  movement: string,
  t: number,
  speed: number,
  talking: boolean,
) {
  const a = assets.poses[poseName] ?? DEFAULT_POSE;
  const base = poseTo ? mixPose(a, assets.poses[poseTo] ?? a, mix) : a;
  return applyMovement(base, movement || 'none', t, speed || 1, talking, assets.movements, assets.poses);
}

export function CharacterSVG({ c, opts }: { c: Character; opts: CharacterRenderOpts }) {
  if (c.style === 'image') return <ImageCharacter c={c} opts={opts} />;
  const pr = c.proportions;
  const col = c.colors;
  const p = opts.pose;
  const H = pr.headSize;
  const neck = H * 0.35;
  const stick = c.style === 'stickman';
  const outlined = c.style === 'cartoon' || c.style === 'educational';
  const ow = c.style === 'cartoon' ? pr.lineWidth : Math.max(1.5, pr.lineWidth * 0.5);
  const drawing = opts.draw < 0.999;
  const dash = drawing ? { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - opts.draw } : {};
  const fillOp = drawing ? Math.max(0, (opts.draw - 0.55) / 0.45) : 1;

  // skeleton
  const hip: [number, number] = [0, p.lift];
  const shoulder = add(hip, rot([0, -pr.torsoLength], p.torso));
  const neckTop = add(shoulder, rot([0, -neck], p.torso));
  const headC = add(neckTop, rot([0, -H], p.torso + p.head));
  const halfW = stick ? 0 : pr.torsoWidth * 0.42;
  const lSh = add(shoulder, rot([-halfW, 6], p.torso));
  const rSh = add(shoulder, rot([halfW, 6], p.torso));
  const hipW = stick ? 0 : pr.torsoWidth * 0.24;
  const lHip = add(hip, rot([-hipW, 0], p.torso));
  const rHip = add(hip, rot([hipW, 0], p.torso));
  const ua = pr.armLength * 0.5, la = pr.armLength * 0.5;
  const ul = pr.legLength * 0.5, ll = pr.legLength * 0.5;
  const lElbow = add(lSh, dir(p.torso + p.lUpper, ua));
  const lHand = add(lElbow, dir(p.torso + p.lUpper + p.lLower, la));
  const rElbow = add(rSh, dir(p.torso + p.rUpper, ua));
  const rHand = add(rElbow, dir(p.torso + p.rUpper + p.rLower, la));
  const lKnee = add(lHip, dir(p.lThigh, ul));
  const lFoot = add(lKnee, dir(p.lThigh + p.lShin, ll));
  const rKnee = add(rHip, dir(p.rThigh, ul));
  const rFoot = add(rKnee, dir(p.rThigh + p.rShin, ll));

  // vertical centring
  const topY = -(pr.torsoLength + neck + H * 2);
  const botY = pr.legLength;
  const cy = (topY + botY) / 2;

  const poly = (pts: [number, number][]) => pts.map((q) => q.map((n) => n.toFixed(2)).join(',')).join(' ');
  const limb = (pts: [number, number][], color: string, w: number, key: string) =>
    outlined ? (
      <g key={key}>
        <polyline points={poly(pts)} fill="none" stroke={col.outline} strokeWidth={w + ow * 2} strokeLinecap="round" strokeLinejoin="round" {...dash} />
        <polyline points={poly(pts)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...dash} />
      </g>
    ) : (
      <polyline key={key} points={poly(pts)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...dash} />
    );

  const lw = stick ? pr.lineWidth : pr.limbWidth;
  const armColorU = stick ? col.outline : c.outfit === 'labcoat' ? '#f4f6fb' : col.shirt;
  const armColorL = stick ? col.outline : c.outfit === 'tshirt' || c.outfit === 'dress' ? col.skin : armColorU;
  const legColor = stick ? col.outline : c.outfit === 'dress' ? col.skin : col.pants;

  const strokeO = outlined ? { stroke: col.outline, strokeWidth: ow } : {};
  const parts: React.ReactNode[] = [];

  // hood / long hair behind head
  if (!stick && (c.hair === 'long')) {
    parts.push(<path key="hairback" d={`M ${headC[0] - H * 1.05} ${headC[1]} Q ${headC[0] - H * 1.2} ${headC[1] + H * 1.6} ${headC[0] - H * 0.5} ${headC[1] + H * 1.7} L ${headC[0] + H * 0.5} ${headC[1] + H * 1.7} Q ${headC[0] + H * 1.2} ${headC[1] + H * 1.6} ${headC[0] + H * 1.05} ${headC[1]} Z`} fill={col.hair} opacity={fillOp} {...strokeO} />);
  }
  if (!stick && c.outfit === 'hoodie') {
    parts.push(<circle key="hood" cx={headC[0]} cy={headC[1] + H * 0.15} r={H * 1.18} fill={col.shirt} opacity={fillOp} {...strokeO} />);
  }

  // legs
  parts.push(limb([lHip, lKnee, lFoot], legColor, lw, 'lleg'));
  parts.push(limb([rHip, rKnee, rFoot], legColor, lw, 'rleg'));
  if (!stick) {
    const shoe = (f: [number, number], sgn: number, k: string) => (
      <ellipse key={k} cx={f[0] + sgn * lw * 0.35} cy={f[1] + lw * 0.1} rx={lw * 0.95} ry={lw * 0.55} fill={col.shoes} opacity={fillOp} {...strokeO} />
    );
    parts.push(shoe(lFoot, -1, 'lshoe'), shoe(rFoot, 1, 'rshoe'));
  }

  // torso
  if (stick) {
    parts.push(<line key="torso" x1={hip[0]} y1={hip[1]} x2={neckTop[0]} y2={neckTop[1]} stroke={col.outline} strokeWidth={pr.lineWidth} strokeLinecap="round" {...dash} />);
  } else {
    const tw = pr.torsoWidth;
    const tl = pr.torsoLength;
    const coatLen = c.outfit === 'labcoat' ? tl * 0.35 : c.outfit === 'suit' ? tl * 0.08 : 0;
    const torsoPath = `M ${-tw * 0.5} ${-tl + 4} Q ${-tw * 0.5} ${-tl - 4} ${-tw * 0.3} ${-tl - 4} L ${tw * 0.3} ${-tl - 4} Q ${tw * 0.5} ${-tl - 4} ${tw * 0.5} ${-tl + 4} L ${tw * 0.44} ${coatLen} L ${-tw * 0.44} ${coatLen} Z`;
    const torsoFill = c.outfit === 'labcoat' ? '#f4f6fb' : col.shirt;
    parts.push(
      <g key="torso" transform={`translate(${hip[0]} ${hip[1]}) rotate(${p.torso})`}>
        {c.outfit === 'dress' && (
          <path d={`M ${-tw * 0.42} ${-tl * 0.2} L ${-tw * 0.85} ${pr.legLength * 0.45} L ${tw * 0.85} ${pr.legLength * 0.45} L ${tw * 0.42} ${-tl * 0.2} Z`} fill={col.shirt} opacity={fillOp} {...strokeO} />
        )}
        {(c.outfit === 'labcoat') && <rect x={-tw * 0.3} y={-tl} width={tw * 0.6} height={tl} fill={col.shirt} opacity={fillOp} />}
        <path d={torsoPath} fill={torsoFill} opacity={fillOp} {...strokeO} {...(outlined ? dash : {})} />
        {c.outfit === 'labcoat' && <rect x={-tw * 0.18} y={-tl - 2} width={tw * 0.36} height={tl * 0.7} fill={col.shirt} opacity={fillOp} />}
        {c.outfit === 'suit' && (
          <g opacity={fillOp}>
            <path d={`M ${-tw * 0.22} ${-tl - 3} L 0 ${-tl * 0.45} L ${tw * 0.22} ${-tl - 3} Z`} fill="#f4f6fb" />
            <path d={`M -5 ${-tl + 2} L 5 ${-tl + 2} L 7 ${-tl * 0.55} L 0 ${-tl * 0.42} L -7 ${-tl * 0.55} Z`} fill={col.accent} />
          </g>
        )}
        {c.outfit === 'hoodie' && <path d={`M ${-tw * 0.28} ${-tl * 0.32} L ${tw * 0.28} ${-tl * 0.32} L ${tw * 0.2} ${-tl * 0.08} L ${-tw * 0.2} ${-tl * 0.08} Z`} fill="rgba(0,0,0,0.15)" opacity={fillOp} />}
        {c.accessory === 'tie' && c.outfit !== 'suit' && <path d={`M -5 ${-tl + 2} L 5 ${-tl + 2} L 7 ${-tl * 0.45} L 0 ${-tl * 0.32} L -7 ${-tl * 0.45} Z`} fill={col.accent} opacity={fillOp} />}
        {c.accessory === 'badge' && <rect x={tw * 0.12} y={-tl * 0.78} width={tw * 0.2} height={tw * 0.14} rx={2} fill={col.accent} opacity={fillOp} />}
        {c.style === 'educational' && <path d={`M ${-tw * 0.18} ${-tl - 3} Q 0 ${-tl + 10} ${tw * 0.18} ${-tl - 3}`} fill="none" stroke={col.outline} strokeWidth={ow} opacity={fillOp} />}
      </g>,
    );
  }

  // arms
  parts.push(limb([lSh, lElbow], armColorU, lw, 'luarm'), limb([lElbow, lHand], armColorL, lw, 'llarm'));
  parts.push(limb([rSh, rElbow], armColorU, lw, 'ruarm'), limb([rElbow, rHand], armColorL, lw, 'rlarm'));
  if (!stick) {
    parts.push(<circle key="lhand" cx={lHand[0]} cy={lHand[1]} r={lw * 0.62} fill={col.skin} opacity={fillOp} {...strokeO} />);
    parts.push(<circle key="rhand" cx={rHand[0]} cy={rHand[1]} r={lw * 0.62} fill={col.skin} opacity={fillOp} {...strokeO} />);
    // neck
    parts.push(<line key="neck" x1={shoulder[0]} y1={shoulder[1]} x2={neckTop[0]} y2={neckTop[1] + 4} stroke={col.skin} strokeWidth={pr.torsoWidth * 0.22} strokeLinecap="round" opacity={fillOp} />);
  }

  // head
  parts.push(
    <g key="head" transform={`translate(${headC[0]} ${headC[1]}) rotate(${p.torso + p.head})`}>
      {stick ? (
        <circle r={H} fill={col.skin} stroke={col.outline} strokeWidth={pr.lineWidth} {...dash} />
      ) : (
        <circle r={H} fill={col.skin} opacity={fillOp} {...strokeO} {...(outlined ? dash : {})} />
      )}
      <g opacity={fillOp}>
        <Face c={c} H={H} opts={opts} />
        {!stick && <Hair c={c} H={H} ow={ow} outlined={outlined} />}
        <Accessory c={c} H={H} />
      </g>
    </g>,
  );

  return <g transform={`translate(0 ${(-cy).toFixed(2)})`}>{parts}</g>;
}

function Face({ c, H, opts }: { c: Character; H: number; opts: CharacterRenderOpts }) {
  const e = opts.expression;
  const col = c.colors;
  const ink = c.style === 'stickman' ? col.outline : col.eyes;
  const ex = H * 0.36, ey = -H * 0.08;
  const big = c.style === 'cartoon';
  const blinkPhase = (opts.time % 3.4);
  const blinking = blinkPhase > 3.25;
  const sw = Math.max(2, H * 0.08);
  const eye = (x: number, k: string, closedLook?: 'happy' | 'wink') => {
    if (closedLook === 'happy' || (closedLook === 'wink' && x > 0) || blinking) {
      return <path key={k} d={`M ${x - H * 0.13} ${ey + 2} Q ${x} ${ey - H * 0.14} ${x + H * 0.13} ${ey + 2}`} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" />;
    }
    const r = e === 'surprised' ? H * 0.13 : H * 0.085;
    if (big) {
      const lookX = e === 'thinking' ? H * 0.05 : 0, lookY = e === 'thinking' ? -H * 0.06 : 0;
      return (
        <g key={k}>
          <ellipse cx={x} cy={ey} rx={H * 0.2} ry={H * 0.24} fill="#fff" stroke={col.outline} strokeWidth={sw * 0.6} />
          <circle cx={x + lookX} cy={ey + lookY + 1} r={r * 1.25} fill={ink} />
          <circle cx={x + lookX + r * 0.4} cy={ey + lookY - r * 0.3} r={r * 0.4} fill="#fff" />
        </g>
      );
    }
    return <circle key={k} cx={x + (e === 'thinking' ? H * 0.05 : 0)} cy={ey + (e === 'thinking' ? -H * 0.05 : 0)} r={r} fill={ink} />;
  };
  const eyes = e === 'excited' ? [eye(-ex, 'l', 'happy'), eye(ex, 'r', 'happy')] : e === 'wink' ? [eye(-ex, 'l'), eye(ex, 'r', 'wink')] : [eye(-ex, 'l'), eye(ex, 'r')];

  const by = ey - H * (big ? 0.36 : 0.26);
  const brow = (x: number, tilt: number, k: string) => (
    <line key={k} x1={x - H * 0.14} y1={by - tilt} x2={x + H * 0.14} y2={by + tilt} stroke={c.style === 'stickman' ? col.outline : col.hair} strokeWidth={sw} strokeLinecap="round" />
  );
  let brows: React.ReactNode[] = [];
  if (e === 'angry') brows = [brow(-ex, -H * 0.08, 'bl'), brow(ex, H * 0.08, 'br')];
  else if (e === 'sad' || e === 'worried') brows = [brow(-ex, H * 0.07, 'bl'), brow(ex, -H * 0.07, 'br')];
  else if (e === 'surprised') brows = [brow(-ex, 0, 'bl'), brow(ex, 0, 'br')].map((b, i) => <g key={i} transform={`translate(0 ${-H * 0.08})`}>{b}</g>);
  else if (e === 'thinking' || e === 'confident') brows = [brow(-ex, 0, 'bl'), <g key="br" transform={`translate(0 ${-H * 0.07})`}>{brow(ex, -H * 0.03, 'x')}</g>];
  else if (c.style !== 'stickman') brows = [brow(-ex, 0, 'bl'), brow(ex, 0, 'br')];

  const my = H * 0.38;
  const mw = H * 0.32;
  let mouth: React.ReactNode;
  if (opts.mouth >= 0) {
    const o = Math.max(0.08, opts.mouth);
    mouth = <ellipse cx={0} cy={my} rx={mw * 0.55} ry={H * 0.2 * o + 1} fill={c.style === 'stickman' ? col.outline : '#5a1d2a'} stroke={c.style === 'stickman' ? 'none' : col.outline} strokeWidth={sw * 0.5} />;
  } else {
    switch (e) {
      case 'happy': mouth = <path d={`M ${-mw} ${my - 4} Q 0 ${my + H * 0.28} ${mw} ${my - 4}`} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" />; break;
      case 'excited': mouth = <path d={`M ${-mw} ${my - 6} Q 0 ${my + H * 0.45} ${mw} ${my - 6} Z`} fill={c.style === 'stickman' ? ink : '#5a1d2a'} stroke={ink} strokeWidth={sw * 0.6} strokeLinejoin="round" />; break;
      case 'sad': mouth = <path d={`M ${-mw * 0.8} ${my + 8} Q 0 ${my - H * 0.15} ${mw * 0.8} ${my + 8}`} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" />; break;
      case 'worried': mouth = <path d={`M ${-mw * 0.7} ${my + 4} Q ${-mw * 0.35} ${my - 4} 0 ${my + 4} Q ${mw * 0.35} ${my + 10} ${mw * 0.7} ${my + 2}`} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" />; break;
      case 'surprised': mouth = <ellipse cx={0} cy={my + 2} rx={H * 0.12} ry={H * 0.16} fill={c.style === 'stickman' ? 'none' : '#5a1d2a'} stroke={ink} strokeWidth={sw} />; break;
      case 'angry': mouth = <path d={`M ${-mw * 0.7} ${my + 6} L ${mw * 0.7} ${my + 2}`} stroke={ink} strokeWidth={sw} strokeLinecap="round" />; break;
      case 'thinking': mouth = <path d={`M ${-mw * 0.2} ${my + 3} L ${mw * 0.5} ${my}`} stroke={ink} strokeWidth={sw} strokeLinecap="round" />; break;
      case 'wink':
      case 'confident': mouth = <path d={`M ${-mw * 0.7} ${my + 2} Q ${mw * 0.2} ${my + H * 0.2} ${mw * 0.8} ${my - 6}`} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" />; break;
      default: mouth = <path d={`M ${-mw * 0.6} ${my + 2} Q 0 ${my + 6} ${mw * 0.6} ${my + 2}`} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" />;
    }
  }
  const cheeks = c.style === 'cartoon' || c.style === 'educational'
    ? [<circle key="c1" cx={-H * 0.55} cy={H * 0.22} r={H * 0.11} fill="#ff7a8a" opacity={0.35} />, <circle key="c2" cx={H * 0.55} cy={H * 0.22} r={H * 0.11} fill="#ff7a8a" opacity={0.35} />]
    : null;
  return <g>{cheeks}{eyes}{brows}{mouth}</g>;
}

function Hair({ c, H, ow, outlined }: { c: Character; H: number; ow: number; outlined: boolean }) {
  const col = c.colors;
  const s = outlined ? { stroke: col.outline, strokeWidth: ow } : {};
  switch (c.hair) {
    case 'short':
      return <path d={`M ${-H * 1.02} ${-H * 0.05} Q ${-H * 1.08} ${-H * 1.15} 0 ${-H * 1.12} Q ${H * 1.08} ${-H * 1.15} ${H * 1.02} ${-H * 0.05} Q ${H * 0.75} ${-H * 0.62} ${H * 0.1} ${-H * 0.62} Q ${-H * 0.6} ${-H * 0.62} ${-H * 1.02} ${-H * 0.05} Z`} fill={col.hair} {...s} />;
    case 'long':
      return <path d={`M ${-H * 1.05} ${H * 0.3} Q ${-H * 1.15} ${-H * 1.2} 0 ${-H * 1.12} Q ${H * 1.15} ${-H * 1.2} ${H * 1.05} ${H * 0.3} Q ${H * 0.85} ${-H * 0.55} 0 ${-H * 0.6} Q ${-H * 0.85} ${-H * 0.55} ${-H * 1.05} ${H * 0.3} Z`} fill={col.hair} {...s} />;
    case 'spiky': {
      const pts: string[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        const r = i % 2 === 0 ? H * 1.0 : H * 1.42;
        pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r - H * 0.05).toFixed(1)}`);
      }
      return <polygon points={`${-H},${-H * 0.2} ${pts.join(' ')} ${H},${-H * 0.2} ${H * 0.4},${-H * 0.6} ${-H * 0.4},${-H * 0.6}`} fill={col.hair} {...s} />;
    }
    case 'bun':
      return (
        <g>
          <circle cx={0} cy={-H * 1.2} r={H * 0.42} fill={col.hair} {...s} />
          <path d={`M ${-H * 1.02} ${-H * 0.1} Q ${-H} ${-H * 1.12} 0 ${-H * 1.1} Q ${H} ${-H * 1.12} ${H * 1.02} ${-H * 0.1} Q ${H * 0.6} ${-H * 0.7} 0 ${-H * 0.68} Q ${-H * 0.6} ${-H * 0.7} ${-H * 1.02} ${-H * 0.1} Z`} fill={col.hair} {...s} />
        </g>
      );
    case 'curly':
      return (
        <g fill={col.hair} {...s}>
          {Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI * 1.05 + (i / 8) * Math.PI * 0.9;
            return <circle key={i} cx={Math.cos(a) * H * 0.92} cy={Math.sin(a) * H * 0.92} r={H * 0.32} />;
          })}
        </g>
      );
    case 'cap':
      return (
        <g {...s}>
          <path d={`M ${-H * 1.02} ${-H * 0.25} Q ${-H} ${-H * 1.15} 0 ${-H * 1.12} Q ${H} ${-H * 1.15} ${H * 1.02} ${-H * 0.25} Z`} fill={col.accent} />
          <path d={`M ${H * 0.2} ${-H * 0.3} L ${H * 1.65} ${-H * 0.22} Q ${H * 1.7} ${-H * 0.38} ${H * 1.0} ${-H * 0.45} Z`} fill={col.accent} />
        </g>
      );
    default:
      return null;
  }
}

function Accessory({ c, H }: { c: Character; H: number }) {
  const col = c.colors;
  const sw = Math.max(2, H * 0.07);
  switch (c.accessory) {
    case 'glasses':
      return (
        <g fill="rgba(255,255,255,0.15)" stroke={col.outline === 'none' ? '#111' : col.outline} strokeWidth={sw}>
          <circle cx={-H * 0.36} cy={-H * 0.08} r={H * 0.24} />
          <circle cx={H * 0.36} cy={-H * 0.08} r={H * 0.24} />
          <line x1={-H * 0.12} y1={-H * 0.1} x2={H * 0.12} y2={-H * 0.1} />
        </g>
      );
    case 'headset':
      return (
        <g fill="none" stroke="#222" strokeWidth={sw * 1.4}>
          <path d={`M ${-H * 1.05} ${-H * 0.1} Q 0 ${-H * 1.6} ${H * 1.05} ${-H * 0.1}`} />
          <rect x={-H * 1.18} y={-H * 0.3} width={H * 0.3} height={H * 0.5} rx={4} fill={col.accent} stroke="none" />
          <path d={`M ${-H * 1.0} ${H * 0.15} Q ${-H * 0.8} ${H * 0.65} ${-H * 0.25} ${H * 0.55}`} />
        </g>
      );
    case 'beard':
      return <path d={`M ${-H * 0.85} ${H * 0.1} Q ${-H * 0.7} ${H * 1.05} 0 ${H * 1.08} Q ${H * 0.7} ${H * 1.05} ${H * 0.85} ${H * 0.1} Q ${H * 0.4} ${H * 0.62} 0 ${H * 0.62} Q ${-H * 0.4} ${H * 0.62} ${-H * 0.85} ${H * 0.1} Z`} fill={col.hair} />;
    default:
      return null;
  }
}

function ImageCharacter({ c, opts }: { c: Character; opts: CharacterRenderOpts }) {
  const src = c.references[c.imageIndex ?? 0];
  const p = opts.pose;
  const tilt = p.torso + p.head * 0.5;
  const sq = 1 + Math.min(0.08, Math.max(-0.08, p.lift / -400));
  if (!src) {
    return (
      <g>
        <rect x={-160} y={-210} width={320} height={420} rx={24} fill="none" stroke={c.colors.accent} strokeWidth={4} strokeDasharray="14 10" />
        <text x={0} y={0} textAnchor="middle" fill={c.colors.accent} fontSize={28} fontFamily="Arial, sans-serif">Upload reference art</text>
      </g>
    );
  }
  return (
    <g transform={`translate(0 ${p.lift}) rotate(${tilt} 0 210) scale(${1 / sq} ${sq})`} opacity={opts.draw < 1 ? opts.draw : 1}>
      <image href={src} x={-160} y={-210} width={320} height={420} preserveAspectRatio="xMidYMax meet" />
    </g>
  );
}
