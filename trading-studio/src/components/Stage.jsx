// Scene composition preview. Renders at 1/3 of the real output resolution
// (360×640 for Shorts, 640×360 for Landscape) and scales to fit its container,
// so layout, character placement and caption sizes match the selected format.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import CharacterRenderer from './CharacterRenderer.jsx';
import VisualElement from './VisualElement.jsx';
import { FORMATS } from '../../shared/defaults.js';
import CandleChart from './CandleChart.jsx';
import { exampleBars, revealState, sourceLabel } from '../../shared/examples.js';

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

// Where the chart and the character sit, per format.
export const CHART_BOX = {
  shorts: { left: 3, top: 7, width: 94, height: 55 },
  landscape: { left: 2.5, top: 5, width: 72, height: 80 },
};
const CHAR_SPOT = {
  shorts: { left: { x: 22, y: 80 }, right: { x: 78, y: 80 }, center: { x: 50, y: 76 } },
  landscape: { left: { x: 12, y: 62 }, right: { x: 87, y: 60 }, center: { x: 50, y: 58 } },
};

function ChartLayer({ project, scene, sceneIdx, time, format, W, H, selectedAnn, onSelectAnn }) {
  const ex = (project.examples || []).find((e) => e.id === scene.chart?.exampleId);
  const bars = useMemo(() => exampleBars(ex), [ex]);
  if (!ex) return null;
  const box = CHART_BOX[format];
  const bw = (W * box.width) / 100, bh = (H * box.height) / 100;
  const style = { left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` };
  if (ex.kind === 'screenshot' || ex.kind === 'illustration') {
    return (
      <div className="stage-chart" style={style}>
        <img src={ex.imageUrl} alt={ex.summary} className="stage-shot" />
        <div className="stage-source">{ex.kind === 'illustration' ? 'Illustration — not real market data' : `Source: ${ex.source?.label || 'user-provided screenshot'}`}</div>
      </div>
    );
  }
  const scenes = project.scenes || [];
  const local = Math.max(0, time - scene.start);
  const prev = scenes[sceneIdx - 1];
  const target = scene.chart.focus || ex.range;
  let focus = target;
  if (prev?.chart?.exampleId === ex.id && prev.chart.focus && scene.transition !== 'cut') {
    const k = ease(Math.min(1, local / 0.9));
    focus = [prev.chart.focus[0] + (target[0] - prev.chart.focus[0]) * k, prev.chart.focus[1] + (target[1] - prev.chart.focus[1]) * k];
  }
  const { shown, fresh } = revealState(scenes, sceneIdx);
  const progress = Math.min(1, local / (0.7 + 0.35 * fresh.size));
  const date = ex.keyLabel?.split(' ')[0] || '';
  return (
    <div className="stage-chart" style={style}>
      <CandleChart bars={bars} focus={focus} annotations={ex.annotations} visible={shown} fresh={fresh} progress={progress}
        width={Math.round(bw * (format === 'shorts' ? 1 : 1.2))} height={Math.round(bh * (format === 'shorts' ? 1 : 1.2))} showVolume={format === 'landscape'} overlays={ex.overlays || []}
        selectedId={selectedAnn} onSelect={onSelectAnn} compact={format === 'shorts'} />
      <div className="stage-source">{sourceLabel(ex)}{date ? ` · ${date}` : ''}</div>
    </div>
  );
}

export function useFitScale(baseW, baseH) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      const s = Math.min(width / baseW, height ? height / baseH : Infinity);
      setScale(Number.isFinite(s) && s > 0 ? s : width / baseW);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseW, baseH]);
  return [ref, scale];
}

export const LAYOUT = {
  shorts: { charX: 50, charY: 58, charH: 46 },
  landscape: { charX: 30, charY: 56, charH: 70 },
};

export function CaptionLine({ caption, time, style, format = 'shorts' }) {
  if (!caption) return null;
  const s = style;
  const words = caption.words?.length ? caption.words : caption.text.split(/\s+/).map((w) => ({ w, start: caption.start, end: caption.end }));
  const pos = { upper: '14%', middle: '46%', lower: format === 'shorts' ? '72%' : '80%' }[s.position] || '72%';
  const base = {
    fontFamily: `'${s.font}', sans-serif`,
    fontSize: s.size / 3,
    fontWeight: s.weight,
    color: s.color,
    textAlign: s.align,
    textTransform: s.uppercase ? 'uppercase' : 'none',
    WebkitTextStroke: s.outline ? `${s.outline / 3}px ${s.outlineColor}` : undefined,
    paintOrder: 'stroke fill',
    textShadow: s.shadow ? `0 ${s.shadow / 8}px ${s.shadow / 2}px rgba(0,0,0,.85)` : 'none',
    top: pos,
  };
  const elapsed = time - caption.start;
  const progress = Math.min(1, Math.max(0, elapsed / Math.max(0.01, caption.end - caption.start)));
  let content;
  switch (s.animation) {
    case 'word-reveal':
      content = words.map((w, i) => <span key={i} className="cw" style={{ opacity: time >= w.start ? 1 : 0, transition: 'opacity .15s' }}>{w.w} </span>);
      break;
    case 'typewriter': {
      const n = Math.ceil(caption.text.length * Math.min(1, progress * 1.4));
      content = <span>{caption.text.slice(0, n)}<span className="caret">▍</span></span>;
      break;
    }
    case 'highlight':
      content = words.map((w, i) => {
        const on = time >= w.start && time < w.end;
        return <span key={i} className="cw" style={{ color: on ? s.highlight : s.color, display: 'inline-block', transform: on ? 'scale(1.08)' : 'none', transition: 'transform .1s, color .1s' }}>{w.w}&nbsp;</span>;
      });
      break;
    case 'minimal':
      content = <span style={{ fontSize: Math.min(s.size, 48) / 3, fontWeight: Math.min(s.weight, 600), WebkitTextStroke: 'none', background: 'rgba(0,0,0,.45)', padding: '2px 6px', borderRadius: 4 }}>{caption.text}</span>;
      break;
    default:
      content = caption.text;
  }
  const cls = s.animation === 'fade' ? 'cap-fade' : s.animation === 'pop' ? 'cap-pop' : '';
  return (
    <div className={`caption-line ${cls}`} key={caption.id + s.animation} style={base}>
      {content}
    </div>
  );
}

export default function Stage({ project, scene, character, time = 0, showCaptions = true, captionsOverride, visuals, selectedVisualId, onSelectVisual, animate = true, className = '', showSafe = false, selectedAnn, onSelectAnn }) {
  const fmt = FORMATS[project?.format] || FORMATS.shorts;
  const W = fmt.width / 3;
  const H = fmt.height / 3;
  const [ref, scale] = useFitScale(W, H);
  const layout = LAYOUT[fmt.id];
  const layers = visuals ?? (project?.visuals || []).filter((v) => scene && v.sceneId === scene.id);
  const items = captionsOverride ?? project?.captions?.items ?? [];
  const caption = showCaptions ? items.find((c) => time >= c.start && time < c.end) : null;
  const sceneIdx = scene ? (project?.scenes || []).findIndex((s) => s.id === scene.id) : -1;
  const charLayout = scene?.characterLayout || {};
  const spot = CHAR_SPOT[fmt.id][charLayout.position || 'right'] || CHAR_SPOT[fmt.id].right;

  return (
    <div className={`stage-fit ${className}`} ref={ref} style={{ aspectRatio: `${fmt.width} / ${fmt.height}` }}>
      <div className={`stage stage-${fmt.id}`} style={{ width: W, height: H, transform: `scale(${scale})` }}>
        <div className={`stage-bg bg-${scene?.bgStyle || 'terminal'}`} />
        {scene?.transitionFx && scene.transitionFx !== 'none' && <div key={scene.id} className={`stage-fx fx-${scene.transitionFx}`} />}
        {layers.map((v) => (
          <VisualElement key={v.id} type={v.type} props={v.props} selected={v.id === selectedVisualId} onClick={onSelectVisual ? (e) => { e.stopPropagation(); onSelectVisual(v.id); } : undefined} />
        ))}
        {scene?.chart && <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}><ChartLayer project={project} scene={scene} sceneIdx={sceneIdx} time={time} format={fmt.id} W={W} H={H} selectedAnn={selectedAnn} onSelectAnn={onSelectAnn} /></div>}
        {character && charLayout.visible !== false && (
          <div className="stage-char" style={scene?.chart
            ? { left: `${spot.x}%`, top: `${spot.y}%`, height: `${(fmt.id === 'shorts' ? 26 : 42) * (charLayout.size || 1)}%`, zIndex: 4 }
            : { left: `${layout.charX}%`, top: `${layout.charY}%`, height: `${layout.charH * Math.min(1.2, charLayout.size || 1)}%`, zIndex: 4 }}>
            <CharacterRenderer character={character} pose={scene?.pose} expression={scene?.expression} animate={animate} showProps={!scene?.chart} />
          </div>
        )}
        {caption && <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}><CaptionLine caption={caption} time={time} style={project.captions.style} format={fmt.id} /></div>}
        {showSafe && <div className="safe-area" />}
        <div className="stage-vignette" />
      </div>
    </div>
  );
}
