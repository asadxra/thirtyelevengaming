import { Copy, Diamond, Link2, Trash2, Unlink, Upload, Wand2 } from 'lucide-react';
import React from 'react';
import { CAMERA_PROPS, evaluateCamera, layoutFor, sampleDiscrete } from '../../engine/evaluate';
import { EXPRESSIONS } from '../../engine/poses';
import { FONT_OPTIONS } from '../../engine/render';
import type { AnimSpec, AnimType, Background, CameraProp, FormatDef, LoopType, Scene, SceneElement, ShapeKind, TrackProp, TransitionType } from '../../engine/schema';
import { adaptBox, applyPresetToScene, cloneElement, isBackdrop, syncAutoLayouts, uid } from '../../lib/factory';
import { allIllustrations, allPresets, selectAssets, useStore } from '../../store/store';
import { keyAt, mutateElement, mutateScene, removeCameraKey, removeKeyframe, setCameraKey, setKeyframe, setLayout, snapTime, trackValue, updateKeyframe } from '../../ui/editing';
import { Color, cx, fileToDataURL, Num, Section, Select, Slider, Text, Toggle } from '../../ui/kit';
import { elementSize } from '../../engine/render';
import { EasingEditor } from './EasingEditor';

export const ANIM_TYPES: AnimType[] = ['none', 'fade', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'pop', 'scale', 'rotate', 'blur', 'bounce', 'drop', 'flip', 'wipe', 'draw', 'typewriter'];
export const LOOP_TYPES: LoopType[] = ['none', 'float', 'bob', 'pulse', 'spin', 'swing', 'shake', 'blink', 'glowPulse'];
export const TRANSITIONS: TransitionType[] = ['none', 'fade', 'slideLeft', 'slideRight', 'slideUp', 'zoomIn', 'zoomOut', 'wipe', 'circle', 'blur'];

export function Inspector({ scene, format, formats }: { scene: Scene; format: FormatDef; formats: FormatDef[] }) {
  const selectedIds = useStore((s) => s.ui.selectedIds);
  const kf = useStore((s) => s.ui.selectedKeyframe);
  const sel = scene.elements.filter((e) => selectedIds.includes(e.id));
  return (
    <div className="h-full overflow-y-auto">
      {kf && <KeyframePanel scene={scene} />}
      {sel.length === 1 ? <ElementInspector el={sel[0]} scene={scene} format={format} formats={formats} />
        : sel.length > 1 ? <MultiInspector els={sel} format={format} />
          : <SceneInspector scene={scene} />}
    </div>
  );
}

/* --------------------------------------------------------------- keyframe */

function KeyframePanel({ scene }: { scene: Scene }) {
  const kf = useStore((s) => s.ui.selectedKeyframe)!;
  const ui$ = useStore((s) => s.ui$);
  const tracks = kf.elementId === '__camera' ? scene.camera.tracks : scene.elements.find((e) => e.id === kf.elementId)?.tracks;
  const k = (tracks as Record<string, { id: string; time: number; value: number | string; easing: any }[]> | undefined)?.[kf.prop]?.find((x) => x.id === kf.id);
  if (!k) return null;
  const assets = selectAssets(useStore.getState());
  return (
    <Section title={`Keyframe · ${kf.prop}`} right={
      <button className="icon-btn" title="Delete keyframe" onClick={() => { kf.elementId === '__camera' ? removeCameraKey(kf.prop as CameraProp, kf.id) : removeKeyframe(kf.elementId, kf.prop, kf.id); ui$({ selectedKeyframe: null }); }}><Trash2 size={14} /></button>
    }>
      <div className="grid grid-cols-2 gap-2">
        <Num label="Time" suffix="s" step={1 / scene.fps} value={k.time} onChange={(v) => updateKeyframe(kf.elementId, kf.prop, kf.id, { time: Math.max(0, Math.min(scene.duration, snapTime(v, scene.fps))) })} />
        {kf.prop === 'pose'
          ? <Select value={String(k.value)} options={Object.keys(assets.poses)} onChange={(v) => updateKeyframe(kf.elementId, kf.prop, kf.id, { value: v })} />
          : <Num label="Value" step={kf.prop === 'scale' || kf.prop === 'opacity' || kf.prop === 'progress' || kf.prop === 'zoom' || kf.prop === 'sx' || kf.prop === 'sy' ? 0.01 : 1} value={Number(k.value)} onChange={(v) => updateKeyframe(kf.elementId, kf.prop, kf.id, { value: v })} />}
      </div>
      <EasingEditor label="Easing to next keyframe" value={k.easing} onChange={(e) => updateKeyframe(kf.elementId, kf.prop, kf.id, { easing: e })} />
    </Section>
  );
}

/* ------------------------------------------------------------------ scene */

function SceneInspector({ scene }: { scene: Scene }) {
  const time = useStore((s) => s.ui.time);
  const presets = allPresets(useStore.getState());
  const savedBgs = useStore((s) => s.backgrounds);
  const mutate = useStore((s) => s.mutate);
  const toast = useStore((s) => s.toast);
  const cam = evaluateCamera(scene.camera, time);
  const t = snapTime(time, scene.fps);
  return (
    <>
      <Section title="Scene">
        <Text label="Name" value={scene.name} onChange={(v) => mutateScene((s) => { s.name = v; })} />
        <div className="grid grid-cols-2 gap-2">
          <Num label="Dur" suffix="s" step={0.1} min={0.2} value={scene.duration} onChange={(v) => mutateScene((s) => { s.duration = v; s.elements.forEach((e) => { if (e.end > v) e.end = v; }); })} />
          <Select value={String(scene.fps)} options={['24', '30', '60']} onChange={(v) => mutateScene((s) => { s.fps = +v; })} />
        </div>
        <Text label="Notes (included in Claude prompt)" multiline value={scene.notes ?? ''} onChange={(v) => mutateScene((s) => { s.notes = v; })} />
      </Section>
      <Section title="Style preset">
        <div className="flex gap-2">
          <Select className="flex-1" value={scene.presetId ?? ''} options={[{ value: '', label: '— choose —' }, ...presets.map((p) => ({ value: p.id, label: p.name }))]}
            onChange={(v) => { const p = presets.find((x) => x.id === v); if (p) { mutateScene((s) => applyPresetToScene(s as Scene, p)); toast(`Applied “${p.name}” to scene`); } }} />
        </div>
        <p className="text-[11px] text-slate-500">Applying restyles background, type, colors, entrances, exits and transitions of every layer.</p>
      </Section>
      <Section title="Background">
        <BackgroundEditor bg={scene.background} onChange={(fn) => mutateScene((s) => fn(s.background))} />
        <div className="flex flex-wrap gap-1.5">
          <button className="btn-soft h-7 text-[12px]" onClick={() => { mutate((d) => { d.backgrounds.unshift({ id: uid('bg_'), name: `${scene.name} background`, background: structuredClone(scene.background) }); }); toast('Background saved to library'); }}>Save to library</button>
          {savedBgs.slice(0, 6).map((b) => <button key={b.id} className="btn-ghost h-7 text-[12px]" onClick={() => mutateScene((s) => { s.background = structuredClone(b.background); })}>{b.name}</button>)}
        </div>
      </Section>
      <Section title="Transition in">
        <div className="grid grid-cols-2 gap-2">
          <Select value={scene.transitionIn.type} options={TRANSITIONS} onChange={(v) => mutateScene((s) => { s.transitionIn.type = v; })} />
          <Num label="Dur" suffix="s" step={0.05} min={0} value={scene.transitionIn.duration} onChange={(v) => mutateScene((s) => { s.transitionIn.duration = v; })} />
        </div>
        <EasingEditor value={scene.transitionIn.easing} onChange={(e) => mutateScene((s) => { s.transitionIn.easing = e; })} />
        <p className="text-[11px] text-slate-500">Plays when this scene follows another — use “Sequence” preview to see it.</p>
      </Section>
      <Section title="Camera">
        {CAMERA_PROPS.map((p) => {
          const k = keyAt(scene.camera.tracks[p], t);
          return (
            <div key={p} className="flex items-center gap-1.5">
              <button className={cx('icon-btn shrink-0', k && 'icon-btn-on')} title={k ? 'Remove key at playhead' : 'Add key at playhead'}
                onClick={() => (k ? removeCameraKey(p, k.id) : setCameraKey(p, t, cam[p]))}><Diamond size={13} /></button>
              <Num className="flex-1" label={p} step={p === 'zoom' ? 0.01 : 1} value={cam[p]} onChange={(v) => setCameraKey(p as CameraProp, t, v)} />
            </div>
          );
        })}
        <Num label="Shake" suffix="px" step={1} min={0} value={scene.camera.shake} onChange={(v) => mutateScene((s) => { s.camera.shake = v; })} />
        <p className="text-[11px] text-slate-500">Editing a value creates a keyframe at the playhead.</p>
      </Section>
    </>
  );
}

export function BackgroundEditor({ bg, onChange }: { bg: Background; onChange: (fn: (b: Background) => void) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Select value={bg.type} options={['solid', 'linear', 'radial', 'grid', 'dots', 'paper', 'transparent']} onChange={(v) => onChange((b) => { b.type = v; })} />
        <Select value={bg.motion} options={['none', 'drift', 'gradientShift', 'pulse']} onChange={(v) => onChange((b) => { b.motion = v; })} />
      </div>
      <Color label="Color" value={bg.color} onChange={(v) => onChange((b) => { b.color = v; })} />
      {bg.type !== 'solid' && <Color label="Color 2" value={bg.color2} onChange={(v) => onChange((b) => { b.color2 = v; })} />}
      {(bg.type === 'grid' || bg.type === 'dots' || bg.type === 'paper') && (
        <>
          <Color label="Pattern" value={bg.patternColor} onChange={(v) => onChange((b) => { b.patternColor = v; })} />
          <Num label="Pattern size" value={bg.patternSize} min={8} onChange={(v) => onChange((b) => { b.patternSize = v; })} />
        </>
      )}
      <div className="grid grid-cols-2 gap-2">
        {bg.type === 'linear' && <Num label="Angle" suffix="°" value={bg.angle} onChange={(v) => onChange((b) => { b.angle = v; })} />}
        {bg.motion !== 'none' && <Num label="Speed" step={0.1} value={bg.motionSpeed} onChange={(v) => onChange((b) => { b.motionSpeed = v; })} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- multi */

function MultiInspector({ els, format }: { els: SceneElement[]; format: FormatDef }) {
  const ui$ = useStore((s) => s.ui$);
  const align = (mode: 'cx' | 'cy' | 'left' | 'top') => {
    els.forEach((e) => {
      const L = layoutFor(e, format.id);
      if (mode === 'cx') setLayout(e.id, { x: format.width / 2 }, format.id);
      if (mode === 'cy') setLayout(e.id, { y: format.height / 2 }, format.id);
      if (mode === 'left') setLayout(e.id, { x: Math.min(...els.map((x) => layoutFor(x, format.id).x)) }, format.id);
      if (mode === 'top') setLayout(e.id, { y: Math.min(...els.map((x) => layoutFor(x, format.id).y)) }, format.id);
      void L;
    });
  };
  const distribute = (axis: 'x' | 'y') => {
    const sorted = [...els].sort((a, b) => layoutFor(a, format.id)[axis] - layoutFor(b, format.id)[axis]);
    const a = layoutFor(sorted[0], format.id)[axis], b = layoutFor(sorted[sorted.length - 1], format.id)[axis];
    sorted.forEach((e, i) => setLayout(e.id, { [axis]: a + ((b - a) * i) / (sorted.length - 1) }, format.id));
  };
  const stagger = () => {
    els.forEach((e, i) => mutateElement(e.id, (d) => { d.animIn.delay = +(i * 0.15).toFixed(2); }));
  };
  return (
    <Section title={`${els.length} layers selected`}>
      <div className="grid grid-cols-2 gap-1.5">
        <button className="btn-soft" onClick={() => align('cx')}>Center horizontally</button>
        <button className="btn-soft" onClick={() => align('cy')}>Center vertically</button>
        <button className="btn-soft" onClick={() => align('left')}>Align X</button>
        <button className="btn-soft" onClick={() => align('top')}>Align Y</button>
        <button className="btn-soft" onClick={() => distribute('x')}>Distribute X</button>
        <button className="btn-soft" onClick={() => distribute('y')}>Distribute Y</button>
        <button className="btn-soft col-span-2" onClick={stagger}>Stagger entrances (0.15s)</button>
        <button className="btn-danger col-span-2" onClick={() => { mutateScene((s) => { s.elements = s.elements.filter((e) => !els.some((x) => x.id === e.id)); }); ui$({ selectedIds: [] }); }}><Trash2 size={14} /> Delete selected</button>
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- element */

const TRACK_PROPS: { p: Exclude<TrackProp, 'pose'>; label: string; step: number }[] = [
  { p: 'x', label: 'X offset', step: 1 }, { p: 'y', label: 'Y offset', step: 1 }, { p: 'scale', label: 'Scale ×', step: 0.01 },
  { p: 'sx', label: 'Stretch X', step: 0.01 }, { p: 'sy', label: 'Stretch Y', step: 0.01 }, { p: 'rotation', label: 'Rotation +', step: 1 },
  { p: 'opacity', label: 'Opacity', step: 0.01 }, { p: 'progress', label: 'Progress', step: 0.01 }, { p: 'blur', label: 'Blur', step: 0.5 },
];

function ElementInspector({ el, scene, format, formats }: { el: SceneElement; scene: Scene; format: FormatDef; formats: FormatDef[] }) {
  const time = useStore((s) => s.ui.time);
  const ui$ = useStore((s) => s.ui$);
  const mutate = useStore((s) => s.mutate);
  const toast = useStore((s) => s.toast);
  const L = layoutFor(el, format.id);
  const t = snapTime(time, scene.fps);
  const P = (k: string, v: unknown) => mutateElement(el.id, (d) => { (d.props as any)[k] = v; });
  const assets = selectAssets(useStore.getState());

  const animEditor = (key: 'animIn' | 'animOut', a: AnimSpec) => (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Select value={a.type} options={ANIM_TYPES} onChange={(v) => mutateElement(el.id, (d) => { d[key].type = v; })} />
        <Num label="Dur" suffix="s" step={0.05} min={0.01} value={a.duration} onChange={(v) => mutateElement(el.id, (d) => { d[key].duration = v; })} />
        {key === 'animIn' && <Num label="Delay" suffix="s" step={0.05} min={0} value={a.delay ?? 0} onChange={(v) => mutateElement(el.id, (d) => { d[key].delay = v; })} />}
        {['slideUp', 'slideDown', 'slideLeft', 'slideRight', 'drop'].includes(a.type) && <Num label="Dist" suffix="px" value={a.distance ?? 200} onChange={(v) => mutateElement(el.id, (d) => { d[key].distance = v; })} />}
      </div>
      {a.type !== 'none' && <EasingEditor value={a.easing} onChange={(e) => mutateElement(el.id, (d) => { d[key].easing = e; })} />}
    </div>
  );

  return (
    <>
      <Section title={`${el.type} layer`} right={
        <div className="flex gap-0.5">
          <button className="icon-btn" title="Duplicate (Ctrl+D)" onClick={() => { const c = cloneElement(el); mutateScene((s) => { const i = s.elements.findIndex((x) => x.id === el.id); s.elements.splice(i + 1, 0, c); }); ui$({ selectedIds: [c.id] }); }}><Copy size={14} /></button>
          <button className="icon-btn" title="Delete (Del)" onClick={() => { mutateScene((s) => { s.elements = s.elements.filter((x) => x.id !== el.id); }); ui$({ selectedIds: [], selectedKeyframe: null }); }}><Trash2 size={14} /></button>
        </div>
      }>
        <Text label="Name" value={el.name} onChange={(v) => mutateElement(el.id, (d) => { d.name = v; })} />
        <div className="grid grid-cols-2 gap-2">
          <Num label="Start" suffix="s" step={1 / scene.fps} min={0} value={el.start} onChange={(v) => mutateElement(el.id, (d) => { d.start = Math.min(v, d.end - 0.01); })} />
          <Num label="End" suffix="s" step={1 / scene.fps} max={scene.duration} value={el.end} onChange={(v) => mutateElement(el.id, (d) => { d.end = Math.max(v, d.start + 0.01); })} />
        </div>
      </Section>

      <Section title={`Layout · ${format.name}`} right={
        <span className={cx('chip', L.auto ? 'text-emerald-300' : 'text-amber-300')} title={L.auto ? 'Auto-derived from another format' : 'Manually composed for this format'}>
          {L.auto ? <Link2 size={11} /> : <Unlink size={11} />}{L.auto ? 'auto' : 'manual'}
        </span>
      }>
        <div className="grid grid-cols-2 gap-2">
          <Num label="X" value={L.x} onChange={(v) => setLayout(el.id, { x: v })} />
          <Num label="Y" value={L.y} onChange={(v) => setLayout(el.id, { y: v })} />
          <Num label="Scale" step={0.01} min={0.01} value={L.scale} onChange={(v) => setLayout(el.id, { scale: v })} />
          <Num label="Rot" suffix="°" value={L.rotation} onChange={(v) => setLayout(el.id, { rotation: v })} />
          <Num label="Motion ×" step={0.05} title="Multiplier for keyframed x/y offsets in this format" value={L.motionScale ?? 1} onChange={(v) => setLayout(el.id, { motionScale: v })} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button className="btn-soft h-7 text-[12px]" onClick={() => setLayout(el.id, { x: format.width / 2, y: format.height / 2 })}>Center</button>
          {formats.filter((f) => f.id !== format.id).map((f) => (
            <button key={f.id} className="btn-soft h-7 text-[12px]" title={`Re-derive this format's layout from ${f.name} (no stretching)`}
              onClick={() => {
                const size = elementSize(el, assets);
                const src = el.layout[f.id];
                if (!src) return;
                mutateElement(el.id, (d) => { d.layout[format.id] = { ...adaptBox(src, f, format, size, 'proportional', isBackdrop(el)), auto: true }; });
              }}><Wand2 size={12} /> From {f.name.split(' ')[0]}</button>
          ))}
          <button className="btn-soft h-7 text-[12px]" title="Push this layout to all auto-linked formats" onClick={() => mutateElement(el.id, (d) => syncAutoLayouts(d as SceneElement, formats, format.id, assets, true))}>Re-adapt others</button>
        </div>
      </Section>

      <Section title="Appearance"><Appearance el={el} P={P} /></Section>

      <Section title="Animate at playhead" right={<span className="text-[10px] text-slate-500 tabular-nums">{t.toFixed(2)}s</span>}>
        {TRACK_PROPS.map(({ p, label, step }) => {
          const k = keyAt(el.tracks[p], t);
          const has = !!el.tracks[p]?.length;
          return (
            <div key={p} className="flex items-center gap-1.5">
              <button className={cx('icon-btn shrink-0', k ? 'icon-btn-on' : has && 'text-amber-300/70')} title={k ? 'Remove key at playhead' : 'Add key at playhead'}
                onClick={() => (k ? removeKeyframe(el.id, p, k.id) : setKeyframe(el.id, p, t, trackValue(el, p, t)))}><Diamond size={13} /></button>
              <Num className="flex-1" label={label} step={step} value={trackValue(el, p, t)} onChange={(v) => setKeyframe(el.id, p, t, v)} />
            </div>
          );
        })}
        {el.type === 'character' && (
          <div className="flex items-center gap-1.5">
            <button className={cx('icon-btn shrink-0', keyAt(el.tracks.pose, t) && 'icon-btn-on')} title="Pose key"
              onClick={() => { const k = keyAt(el.tracks.pose, t); k ? removeKeyframe(el.id, 'pose', k.id) : setKeyframe(el.id, 'pose', t, sampleDiscrete(el.tracks.pose, t).from ?? el.props.pose); }}><Diamond size={13} /></button>
            <Select className="flex-1" value={sampleDiscrete(el.tracks.pose, t).from ?? el.props.pose} options={Object.keys(assets.poses)} onChange={(v) => setKeyframe(el.id, 'pose', t, v)} />
          </div>
        )}
        <p className="text-[11px] text-slate-500 leading-snug">Offsets are added to the resting layout, so the same motion plays in every format. Turn on <b>Auto-key</b> to record keys by dragging on the canvas.</p>
      </Section>

      <Section title="Entrance">{animEditor('animIn', el.animIn)}</Section>
      <Section title="Exit" defaultOpen={el.animOut.type !== 'none'}>{animEditor('animOut', el.animOut)}</Section>
      <Section title="Loop / idle motion" defaultOpen={el.loop.type !== 'none'}>
        <div className="grid grid-cols-3 gap-2">
          <Select value={el.loop.type} options={LOOP_TYPES} onChange={(v) => mutateElement(el.id, (d) => { d.loop.type = v; if (!d.loop.amount) d.loop.amount = v === 'pulse' ? 0.05 : v === 'swing' ? 8 : 10; })} />
          <Num label="Hz" step={0.05} value={el.loop.speed} onChange={(v) => mutateElement(el.id, (d) => { d.loop.speed = v; })} />
          <Num label="Amt" step={el.loop.type === 'pulse' ? 0.01 : 1} value={el.loop.amount} onChange={(v) => mutateElement(el.id, (d) => { d.loop.amount = v; })} />
        </div>
      </Section>
      <Section title="Effects" defaultOpen={!!(el.effects.glow || el.effects.shadow || el.effects.blur)}>
        <Toggle small label="Glow" value={!!el.effects.glow} onChange={(v) => mutateElement(el.id, (d) => { d.effects.glow = v ? { color: '#9b5cff', size: 12 } : null; })} />
        {el.effects.glow && <div className="grid grid-cols-[1fr_90px] gap-2"><Color value={el.effects.glow.color} onChange={(v) => mutateElement(el.id, (d) => { d.effects.glow!.color = v; })} /><Num label="Size" value={el.effects.glow.size} min={0} onChange={(v) => mutateElement(el.id, (d) => { d.effects.glow!.size = v; })} /></div>}
        <Toggle small label="Drop shadow" value={!!el.effects.shadow} onChange={(v) => mutateElement(el.id, (d) => { d.effects.shadow = v ? { color: '#00000088', blur: 12, dx: 0, dy: 10 } : null; })} />
        {el.effects.shadow && (
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3"><Color value={el.effects.shadow.color} onChange={(v) => mutateElement(el.id, (d) => { d.effects.shadow!.color = v; })} /></div>
            <Num label="Blur" value={el.effects.shadow.blur} onChange={(v) => mutateElement(el.id, (d) => { d.effects.shadow!.blur = v; })} />
            <Num label="dX" value={el.effects.shadow.dx} onChange={(v) => mutateElement(el.id, (d) => { d.effects.shadow!.dx = v; })} />
            <Num label="dY" value={el.effects.shadow.dy} onChange={(v) => mutateElement(el.id, (d) => { d.effects.shadow!.dy = v; })} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Num label="Blur" min={0} step={0.5} value={el.effects.blur ?? 0} onChange={(v) => mutateElement(el.id, (d) => { d.effects.blur = v; })} />
          <Select value={el.effects.blend ?? 'normal'} options={['normal', 'multiply', 'screen', 'overlay']} onChange={(v) => mutateElement(el.id, (d) => { d.effects.blend = v; })} />
        </div>
        <button className="btn-soft h-7 text-[12px] w-full" onClick={() => { mutate((d) => { d.effects.unshift({ id: uid('fx_'), name: `${el.name} effect`, effects: structuredClone(el.effects), loop: structuredClone(el.loop) }); }); toast('Effect + loop saved to library'); }}>Save effect to library</button>
      </Section>
    </>
  );
}

function Appearance({ el, P }: { el: SceneElement; P: (k: any, v: any) => void }) {
  const assets = selectAssets(useStore.getState());
  const characters = useStore((s) => s.characters);
  switch (el.type) {
    case 'text': {
      const p = el.props;
      return (
        <>
          <Text multiline label="Text (Enter = new line)" value={p.text} onChange={(v) => P('text', v)} />
          <Select label="Font" value={p.fontFamily} options={FONT_OPTIONS} onChange={(v) => P('fontFamily', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Num label="Size" value={p.fontSize} min={6} onChange={(v) => P('fontSize', v)} />
            <Num label="Weight" step={100} min={100} max={900} value={p.fontWeight} onChange={(v) => P('fontWeight', v)} />
            <Num label="Line H" step={0.05} value={p.lineHeight} onChange={(v) => P('lineHeight', v)} />
            <Num label="Spacing" value={p.letterSpacing} onChange={(v) => P('letterSpacing', v)} />
          </div>
          <Color label="Color" value={p.color} onChange={(v) => P('color', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={p.align} options={[{ value: 'start', label: 'Left' }, { value: 'middle', label: 'Center' }, { value: 'end', label: 'Right' }]} onChange={(v) => P('align', v)} />
            <div className="flex items-center gap-3 text-[12px]">
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!p.uppercase} onChange={(e) => P('uppercase', e.target.checked)} />CAPS</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!p.italic} onChange={(e) => P('italic', e.target.checked)} /><i>Ital</i></label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select label="Kinetic split" value={p.kinetic} options={['none', 'words', 'letters', 'lines']} onChange={(v) => P('kinetic', v)} />
            <Num label="Stagger" step={0.01} min={0} value={p.stagger} onChange={(v) => P('stagger', v)} />
          </div>
          <Text label="Highlight words (comma separated)" value={p.highlight ?? ''} onChange={(v) => P('highlight', v)} />
          <Color label="Highlight" value={p.highlightColor ?? '#ffd35c'} onChange={(v) => P('highlightColor', v)} />
          <Color label="Outline" allowNone value={p.stroke || 'none'} onChange={(v) => P('stroke', v === 'none' ? '' : v)} />
          {p.stroke && <Num label="Outline W" value={p.strokeWidth ?? 0} onChange={(v) => P('strokeWidth', v)} />}
          <Color label="Pill bg" allowNone value={p.background || 'none'} onChange={(v) => P('background', v === 'none' ? '' : v)} />
        </>
      );
    }
    case 'shape': {
      const p = el.props;
      return (
        <>
          <Select label="Shape" value={p.shape} options={['rect', 'circle', 'ellipse', 'triangle', 'star', 'polygon', 'line', 'ring', 'heart', 'blob'] as ShapeKind[]} onChange={(v) => P('shape', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Num label="W" min={1} value={p.w} onChange={(v) => P('w', v)} />
            <Num label="H" min={1} value={p.h} onChange={(v) => P('h', v)} />
            {p.shape === 'rect' && <Num label="Radius" min={0} value={p.radius} onChange={(v) => P('radius', v)} />}
            {(p.shape === 'polygon' || p.shape === 'star') && <Num label="Sides" min={3} value={p.sides} onChange={(v) => P('sides', v)} />}
          </div>
          <Color label="Fill" allowNone value={p.fill} onChange={(v) => P('fill', v)} />
          <Color label="Gradient" allowNone value={p.fill2 || 'none'} onChange={(v) => P('fill2', v === 'none' ? '' : v)} />
          <Color label="Stroke" allowNone value={p.stroke} onChange={(v) => P('stroke', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Num label="Stroke W" min={0} value={p.strokeWidth} onChange={(v) => P('strokeWidth', v)} />
            <label className="flex items-center gap-1 text-[12px]"><input type="checkbox" checked={!!p.dashed} onChange={(e) => P('dashed', e.target.checked)} />Dashed</label>
          </div>
        </>
      );
    }
    case 'arrow': {
      const p = el.props;
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Num label="dX" value={p.dx} onChange={(v) => P('dx', v)} />
            <Num label="dY" value={p.dy} onChange={(v) => P('dy', v)} />
            <Num label="Curve" step={0.05} value={p.curve} onChange={(v) => P('curve', v)} />
            <Num label="Width" min={1} value={p.strokeWidth} onChange={(v) => P('strokeWidth', v)} />
            <Num label="Head" min={0} value={p.headSize} onChange={(v) => P('headSize', v)} />
            <Select value={p.style} options={['solid', 'sketch']} onChange={(v) => P('style', v)} />
          </div>
          <Color label="Color" value={p.color} onChange={(v) => P('color', v)} />
          <div className="flex gap-4 text-[12px]">
            <label className="flex items-center gap-1"><input type="checkbox" checked={p.doubleHead} onChange={(e) => P('doubleHead', e.target.checked)} />Double head</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={p.dashed} onChange={(e) => P('dashed', e.target.checked)} />Dashed</label>
          </div>
        </>
      );
    }
    case 'chart': {
      const p = el.props;
      return (
        <>
          <Select label="Chart type" value={p.chartType} options={['bar', 'hbar', 'line', 'area', 'pie', 'donut', 'candlestick']} onChange={(v) => P('chartType', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Num label="W" value={p.w} onChange={(v) => P('w', v)} />
            <Num label="H" value={p.h} onChange={(v) => P('h', v)} />
            <Num label="Stroke" value={p.strokeWidth} onChange={(v) => P('strokeWidth', v)} />
            <Num label="Stagger" step={0.05} min={0} max={0.85} value={p.stagger} onChange={(v) => P('stagger', v)} />
          </div>
          {p.chartType === 'candlestick'
            ? <Text multiline label="Candles: open,high,low,close per line" value={p.candles.map((c) => `${c.o},${c.h},${c.l},${c.c}`).join('\n')}
                onChange={(v) => P('candles', v.split('\n').map((l) => l.split(',').map(Number)).filter((a) => a.length === 4 && a.every(Number.isFinite)).map(([o, h, l, c]) => ({ o, h, l, c })))} />
            : <>
              <Text label="Values (comma separated)" value={p.data.join(', ')} onChange={(v) => P('data', v.split(',').map((x) => parseFloat(x)).filter(Number.isFinite))} />
              <Text label="Labels (comma separated)" value={p.labels.join(', ')} onChange={(v) => P('labels', v.split(',').map((x) => x.trim()))} />
            </>}
          <Text label="Series colors (comma separated)" value={p.colors.join(', ')} onChange={(v) => P('colors', v.split(',').map((x) => x.trim()).filter(Boolean))} />
          <Color label="Up" value={p.upColor} onChange={(v) => P('upColor', v)} />
          <Color label="Down" value={p.downColor} onChange={(v) => P('downColor', v)} />
          <Color label="Axis" value={p.axisColor} onChange={(v) => P('axisColor', v)} />
          <Color label="Text" value={p.textColor} onChange={(v) => P('textColor', v)} />
          <div className="flex gap-3 text-[12px]">
            {(['showAxis', 'showLabels', 'showValues'] as const).map((k) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={p[k]} onChange={(e) => P(k, e.target.checked)} />{k.slice(4)}</label>)}
          </div>
        </>
      );
    }
    case 'counter': {
      const p = el.props;
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Num label="From" value={p.from} onChange={(v) => P('from', v)} />
            <Num label="To" value={p.to} onChange={(v) => P('to', v)} />
            <Num label="Decimals" min={0} max={6} value={p.decimals} onChange={(v) => P('decimals', v)} />
            <Num label="Size" value={p.fontSize} onChange={(v) => P('fontSize', v)} />
          </div>
          <div className="grid grid-cols-2 gap-2"><Text label="Prefix" value={p.prefix} onChange={(v) => P('prefix', v)} /><Text label="Suffix" value={p.suffix} onChange={(v) => P('suffix', v)} /></div>
          <Select label="Font" value={p.fontFamily} options={FONT_OPTIONS} onChange={(v) => P('fontFamily', v)} />
          <Num label="Weight" step={100} value={p.fontWeight} onChange={(v) => P('fontWeight', v)} />
          <Color label="Color" value={p.color} onChange={(v) => P('color', v)} />
          <label className="flex items-center gap-1 text-[12px]"><input type="checkbox" checked={p.separator} onChange={(e) => P('separator', e.target.checked)} />Thousands separator</label>
          <p className="text-[11px] text-slate-500">Counting is driven by Progress — use the “draw” entrance or keyframe Progress.</p>
        </>
      );
    }
    case 'character': {
      const p = el.props;
      return (
        <>
          <Select label="Character asset" value={p.characterId} options={characters.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => P('characterId', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Pose" value={p.pose} options={Object.keys(assets.poses)} onChange={(v) => P('pose', v)} />
            <Select label="Expression" value={p.expression} options={EXPRESSIONS} onChange={(v) => P('expression', v)} />
            <Select label="Movement" value={p.movement} options={Object.values(assets.movements).map((m) => ({ value: m.id, label: m.name }))} onChange={(v) => P('movement', v)} />
            <Num label="Speed" step={0.05} value={p.movementSpeed} onChange={(v) => P('movementSpeed', v)} />
          </div>
          <div className="flex gap-4 text-[12px]">
            <label className="flex items-center gap-1"><input type="checkbox" checked={p.flip} onChange={(e) => P('flip', e.target.checked)} />Mirror</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={p.talking} onChange={(e) => P('talking', e.target.checked)} />Talking mouth</label>
          </div>
          <p className="text-[11px] text-slate-500">Appearance is locked to the character asset — edit it in Character Studio and every scene updates consistently.</p>
        </>
      );
    }
    case 'illustration': {
      const p = el.props;
      return (
        <>
          <Select label="Illustration" value={p.illustrationId} options={allIllustrations(useStore.getState()).map((i) => ({ value: i.id, label: `${i.name}${i.builtin ? '' : ' (custom)'}` }))} onChange={(v) => P('illustrationId', v)} />
          <Toggle small label="Play part animations" value={p.partAnimations} onChange={(v) => P('partAnimations', v)} />
        </>
      );
    }
    case 'image': {
      const p = el.props;
      return (
        <>
          <label className="btn-soft w-full cursor-pointer"><Upload size={14} /> {p.src ? 'Replace image' : 'Upload image'}
            <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) P('src', await fileToDataURL(f)); }} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Num label="W" value={p.w} onChange={(v) => P('w', v)} />
            <Num label="H" value={p.h} onChange={(v) => P('h', v)} />
            <Num label="Radius" value={p.radius} onChange={(v) => P('radius', v)} />
            <Select value={p.fit} options={['contain', 'cover']} onChange={(v) => P('fit', v)} />
          </div>
        </>
      );
    }
    case 'fx': {
      const p = el.props;
      return (
        <>
          <Select label="Kind" value={p.kind} options={['particles', 'stars', 'grid', 'rays', 'waves', 'bokeh', 'confetti', 'scanlines']} onChange={(v) => P('kind', v)} />
          <Color label="Color" value={p.color} onChange={(v) => P('color', v)} />
          <Color label="Color 2" value={p.color2} onChange={(v) => P('color2', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Num label="Count" min={1} value={p.count} onChange={(v) => P('count', v)} />
            <Num label="Speed" step={0.1} value={p.speed} onChange={(v) => P('speed', v)} />
            <Num label="Size" step={0.5} value={p.size} onChange={(v) => P('size', v)} />
            <Num label="Seed" value={p.seed} onChange={(v) => P('seed', v)} />
            <Num label="W" value={p.w} onChange={(v) => P('w', v)} />
            <Num label="H" value={p.h} onChange={(v) => P('h', v)} />
          </div>
        </>
      );
    }
  }
}

export { Slider };
