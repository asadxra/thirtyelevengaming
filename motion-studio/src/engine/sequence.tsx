import React from 'react';
import { clamp, ease, lerp } from './easing';
import { SceneContent } from './render';
import type { AssetBundle, FormatDef, Scene, TransitionSpec } from './schema';

export function sequenceDuration(scenes: Scene[]) {
  return scenes.reduce((s, sc) => s + sc.duration, 0);
}

/** Map global time → scene index & local time. */
export function locateInSequence(scenes: Scene[], t: number) {
  let acc = 0;
  for (let i = 0; i < scenes.length; i++) {
    const d = scenes[i].duration;
    if (t < acc + d || i === scenes.length - 1) return { index: i, local: Math.min(d, Math.max(0, t - acc)), offset: acc };
    acc += d;
  }
  return { index: 0, local: 0, offset: 0 };
}

export function transitionStyle(tr: TransitionSpec | undefined, local: number, W: number, H: number) {
  if (!tr || tr.type === 'none' || local >= tr.duration) return null;
  const p = ease(tr.easing, clamp(local / Math.max(1e-4, tr.duration)));
  switch (tr.type) {
    case 'fade': return { opacity: p };
    case 'slideLeft': return { transform: `translate(${(1 - p) * W} 0)` };
    case 'slideRight': return { transform: `translate(${-(1 - p) * W} 0)` };
    case 'slideUp': return { transform: `translate(0 ${(1 - p) * H})` };
    case 'zoomIn': { const s = lerp(1.35, 1, p); return { transform: `translate(${W / 2} ${H / 2}) scale(${s}) translate(${-W / 2} ${-H / 2})`, opacity: p }; }
    case 'zoomOut': { const s = lerp(0.6, 1, p); return { transform: `translate(${W / 2} ${H / 2}) scale(${s}) translate(${-W / 2} ${-H / 2})`, opacity: p }; }
    case 'wipe': return { clip: { kind: 'rect' as const, w: W * p } };
    case 'circle': return { clip: { kind: 'circle' as const, r: Math.hypot(W, H) * 0.5 * p } };
    case 'blur': return { blur: (1 - p) * 30, opacity: p };
  }
  return null;
}

export interface SequenceSVGProps {
  scenes: Scene[];
  assets: AssetBundle;
  format: FormatDef;
  time: number;
  transparent?: boolean;
  idPrefix?: string;
  style?: React.CSSProperties;
  className?: string;
}

/** Renders a list of scenes back-to-back with each scene's transitionIn. */
export function SequenceSVG({ scenes, assets, format, time, transparent, idPrefix = 'q', style, className }: SequenceSVGProps) {
  const W = format.width, H = format.height;
  if (!scenes.length) return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={style} className={className} />;
  const { index, local } = locateInSequence(scenes, time);
  const sc = scenes[index];
  const tr = index > 0 ? transitionStyle(sc.transitionIn, local, W, H) : null;
  const prev = index > 0 && tr ? scenes[index - 1] : null;
  const pid = `${idPrefix}${index}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={style} className={className}>
      {!transparent && <rect width={W} height={H} fill="#000" />}
      {prev && <SceneContent scene={prev} assets={assets} format={format} time={prev.duration} transparent={transparent} idPrefix={`${idPrefix}${index - 1}`} />}
      <defs>
        {tr?.clip && (
          <clipPath id={`${pid}-tc`}>
            {tr.clip.kind === 'rect' ? <rect x={0} y={0} width={tr.clip.w} height={H} /> : <circle cx={W / 2} cy={H / 2} r={tr.clip.r} />}
          </clipPath>
        )}
        {tr?.blur ? <filter id={`${pid}-tb`}><feGaussianBlur stdDeviation={tr.blur} /></filter> : null}
      </defs>
      <g transform={tr?.transform} opacity={tr?.opacity} clipPath={tr?.clip ? `url(#${pid}-tc)` : undefined} filter={tr?.blur ? `url(#${pid}-tb)` : undefined}>
        <SceneContent scene={sc} assets={assets} format={format} time={local} transparent={transparent} idPrefix={pid} />
      </g>
    </svg>
  );
}
