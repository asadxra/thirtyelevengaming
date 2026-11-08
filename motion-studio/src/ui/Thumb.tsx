import React, { useId, useState } from 'react';
import { SceneSVG } from '../engine/render';
import type { FormatDef, Scene } from '../engine/schema';
import { LANDSCAPE } from '../engine/schema';
import { SequenceSVG } from '../engine/sequence';
import { useAssets, useStore } from '../store/store';
import { cx } from './kit';
import { useClock } from './playback';

/** Scene thumbnail that plays on hover (or always when autoplay). */
export function SceneThumb({ scene, scenes, format = LANDSCAPE, className, autoplay, still = 0.6, transparent }: { scene?: Scene; scenes?: Scene[]; format?: FormatDef; className?: string; autoplay?: boolean; still?: number; transparent?: boolean }) {
  const assets = useAssets();
  const reduce = useStore((s) => s.settings.reduceMotion);
  const [hover, setHover] = useState(false);
  const list = scenes ?? (scene ? [scene] : []);
  const dur = list.reduce((s, x) => s + x.duration, 0) || 1;
  const [t] = useClock((hover || !!autoplay) && !reduce, dur);
  const id = useId().replace(/:/g, '');
  const time = hover || autoplay ? t : Math.min(dur, dur * still);
  const style: React.CSSProperties = { width: '100%', height: '100%', display: 'block' };
  return (
    <div className={cx('relative overflow-hidden rounded-lg', transparent ? 'checker' : 'bg-black', className)} style={{ aspectRatio: `${format.width} / ${format.height}` }}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      {list.length === 1
        ? <SceneSVG scene={list[0]} assets={assets} format={format} time={time} idPrefix={`t${id}`} style={style} transparent={transparent} />
        : <SequenceSVG scenes={list} assets={assets} format={format} time={time} idPrefix={`t${id}`} style={style} />}
    </div>
  );
}

/** Generic SVG preview box (fit content into a viewBox). */
export function SvgBox({ w, h, children, className, checker }: { w: number; h: number; children: React.ReactNode; className?: string; checker?: boolean }) {
  return (
    <div className={cx('relative overflow-hidden rounded-lg', checker ? 'checker' : 'bg-ink-950', className)}>
      <svg viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`} className="w-full h-full block" preserveAspectRatio="xMidYMid meet">{children}</svg>
    </div>
  );
}
