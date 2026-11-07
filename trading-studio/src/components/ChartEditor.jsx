import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Panel, Select, Slider, Toggle, Chips, Input, ColorInput, Badge, Empty, IconButton } from './ui.jsx';
import { Icon } from './Icon.jsx';
import Stage, { DEFAULT_LAYOUT, videoStyle } from './Stage.jsx';
import { CANDLE_PRESETS } from '../../shared/defaults.js';
import { SECTION_LABELS, ANIMATIONS, EXPRESSIONS } from '../../shared/defaults.js';
import { exampleBars, sourceLabel } from '../../shared/examples.js';
import { fmtTime } from '../../shared/scenes.js';
import { formatBarTime, fmtPrice } from '../../shared/market.js';

const ROLES = ['fvg', 'ifvg', 'liquidity', 'ob', 'breaker', 'structure', 'entry', 'stop', 'target', 'fib', 'session', 'info', 'highlight', 'bull', 'bear'];
const TYPES = [
  { id: 'label', label: 'Text label' }, { id: 'hline', label: 'Horizontal line / level' }, { id: 'box', label: 'Zone box (FVG / OB)' },
  { id: 'highlight', label: 'Candle highlight' }, { id: 'fib', label: 'Fibonacci' }, { id: 'trend', label: 'Trendline' }, { id: 'vline', label: 'Vertical marker' },
];
const BG = [{ value: 'terminal', label: 'Terminal glow' }, { value: 'black', label: 'Pure black' }, { value: 'grid', label: 'Grid' }, { value: 'gradient', label: 'Accent gradient' }];

export default function ChartEditor({ project, update, character }) {
  const store = useStore();
  const scenes = project.scenes || [];
  const [sceneId, setSceneId] = useState(scenes.find((s) => s.chart)?.id || scenes[0]?.id);
  const [annId, setAnnId] = useState(null);
  const [offset, setOffset] = useState(1.5);
  const scene = scenes.find((s) => s.id === sceneId) || scenes[0];
  const ex = (project.examples || []).find((e) => e.id === scene?.chart?.exampleId);
  const bars = useMemo(() => exampleBars(ex), [ex]);
  const ann = ex?.annotations.find((a) => a.id === annId);

  if (!scenes.length) return <Panel><Empty icon="film" title="No scenes yet">Build scenes from the script first. Each scene can then be bound to a real chart example.</Empty></Panel>;

  const patchScene = (patch) => update((p) => ({ scenes: p.scenes.map((s) => (s.id === scene.id ? { ...s, ...patch } : s)) }));
  const patchChart = (patch) => patchScene({ chart: { ...(scene.chart || { reveal: [], hide: [] }), ...patch } });
  const patchExample = (fn) => update((p) => ({ examples: p.examples.map((e) => (e.id === ex.id ? fn(e) : e)) }));
  const patchAnn = (patch) => patchExample((e) => ({ ...e, annotations: e.annotations.map((a) => (a.id === annId ? { ...a, ...patch } : a)) }));
  const charLayout = scene.characterLayout || { visible: true, position: 'right', size: 1 };
  const setChar = (patch) => patchScene({ characterLayout: { ...charLayout, ...patch } });
  const time = Math.min(scene.end - 0.05, scene.start + offset);

  const addAnnotation = (type) => {
    const [a, b] = scene.chart?.focus || ex.range;
    const mid = Math.round((a + b) / 2);
    const q = bars[mid];
    const id = `ann_${Date.now().toString(36)}`;
    const base = { id, type, role: 'info', text: 'Note', i1: Math.max(0, mid - 3), i2: Math.min(bars.length - 1, mid + 3) };
    const extra = {
      label: { i1: mid, price: q.h, text: 'Note' },
      hline: { price: q.c, role: 'liquidity', text: `Level ${fmtPrice(q.c)}`, dashed: true },
      box: { p1: q.l, p2: q.h, role: 'fvg', text: 'Zone' },
      highlight: { role: 'highlight', text: 'Look here' },
      fib: { i1: Math.max(0, mid - 10), p1: Math.min(...bars.slice(mid - 10, mid + 1).map((x) => x.l)), p2: Math.max(...bars.slice(mid - 10, mid + 1).map((x) => x.h)), role: 'fib', levels: [0, 0.5, 0.618, 0.705, 0.79, 1], text: 'Fibonacci' },
      trend: { p1: bars[Math.max(0, mid - 6)].l, p2: q.l, role: 'structure', text: 'Trendline' },
      vline: { i1: mid, role: 'session', text: 'Marker' },
    }[type];
    patchExample((e) => ({ ...e, annotations: [...e.annotations, { ...base, ...extra, manual: true }] }));
    patchChart({ reveal: [...(scene.chart.reveal || []), id] });
    setAnnId(id);
  };

  const revealHere = new Set(scene.chart?.reveal || []);
  const hideHere = new Set(scene.chart?.hide || []);

  return (
    <div className="editor-layout">
      <Panel title="Scenes" pad={false} className="vis-scenes">
        {scenes.map((s, i) => (
          <button key={s.id} className={`vis-scene ${s.id === scene.id ? 'on' : ''}`} onClick={() => { setSceneId(s.id); setAnnId(null); }}>
            <span className="scene-num">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <Badge tone="accent">{SECTION_LABELS[s.section] || s.section}</Badge> <span className="mono small muted">{fmtTime(s.start)}</span>
              <p className="small clamp-2">{s.voiceover}</p>
              <span className="small muted">{s.chart ? `Chart · ${s.chart.stepId || 'overview'}` : 'No chart'}</span>
            </div>
          </button>
        ))}
      </Panel>

      <div className="col gap">
        <Panel title={`Scene ${scenes.indexOf(scene) + 1} · ${SECTION_LABELS[scene.section] || ''}`} subtitle={scene.voiceover}>
          <div className={`preview-wrap bg-${scene.bgStyle || 'terminal'}`}>
            <Stage project={project} scene={scene} character={character} time={time} selectedAnn={annId} onSelectAnn={setAnnId} />
          </div>
          <Slider label="Preview time within scene" value={offset} min={0} max={Math.max(0.1, scene.end - scene.start)} step={0.05} onChange={setOffset} format={(v) => `${fmtTime(scene.start + v)}`} />
          <p className="small muted">Click a chart annotation to edit it. Annotations listed under “Reveal in this scene” animate in at the start of the scene, in order.</p>
        </Panel>
      </div>

      <div className="col gap inspector">
        <Panel title="Chart">
          <Select label="Chart example" value={scene.chart?.exampleId || ''} onChange={(e) => {
            const nx = project.examples.find((x) => x.id === e.target.value);
            patchScene({ chart: nx ? { exampleId: nx.id, stepId: null, focus: nx.range ? [...nx.range] : null, reveal: [], hide: [] } : null });
            setAnnId(null);
          }} options={[{ value: '', label: 'No chart in this scene' }, ...(project.examples || []).map((x, k) => ({ value: x.id, label: `#${k + 1} ${x.summary?.slice(0, 60) || x.kind}` }))]} />
          {ex && ex.kind === 'historical' && (
            <>
              <p className="small muted">{sourceLabel(ex)} · {ex.session}</p>
              <Select label="Teaching step" value={scene.chart.stepId || ''} onChange={(e) => {
                const st = ex.steps.find((x) => x.id === e.target.value);
                patchChart(st ? { stepId: st.id, focus: [...st.focus], reveal: [...st.reveal] } : { stepId: null, focus: [...ex.range] });
              }} options={[{ value: '', label: 'Overview (whole example)' }, ...ex.steps.map((st) => ({ value: st.id, label: st.label }))]} />
              <Slider label="Chart framing · first candle" value={Math.round(scene.chart.focus?.[0] ?? 0)} min={0} max={bars.length - 5} step={1}
                onChange={(v) => patchChart({ focus: [v, Math.max(v + 4, scene.chart.focus?.[1] ?? bars.length - 1)] })} format={(v) => formatBarTime(bars[v]?.t ?? 0, false)} />
              <Slider label="Chart framing · last candle" value={Math.round(scene.chart.focus?.[1] ?? bars.length - 1)} min={4} max={bars.length - 1} step={1}
                onChange={(v) => patchChart({ focus: [Math.min(v - 4, scene.chart.focus?.[0] ?? 0), v] })} format={(v) => formatBarTime(bars[v]?.t ?? 0, false)} />
              <Select label="Camera" value={scene.transition || 'zoom'} onChange={(e) => patchScene({ transition: e.target.value })}
                options={[{ value: 'zoom', label: 'Animate from previous framing (zoom/pan)' }, { value: 'cut', label: 'Cut straight to this framing' }]} />
              <div className="field">
                <span className="field-label">Annotations</span>
                <div className="ann-list">
                  {ex.annotations.map((a) => (
                    <div key={a.id} className={`ann-row ${a.id === annId ? 'on' : ''}`} onClick={() => setAnnId(a.id)}>
                      <i className="layer-swatch" style={{ background: a.color || `var(--c-${a.role})` }} />
                      <span className="grow small">{a.text || a.type}</span>
                      <label className="small" title="Animate in during this scene" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={revealHere.has(a.id)} onChange={() => patchChart({ reveal: revealHere.has(a.id) ? [...revealHere].filter((x) => x !== a.id) : [...revealHere, a.id] })} /> reveal
                      </label>
                      <label className="small" title="Hide in this scene" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={hideHere.has(a.id)} onChange={() => patchChart({ hide: hideHere.has(a.id) ? [...hideHere].filter((x) => x !== a.id) : [...hideHere, a.id] })} /> hide
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Select label="Add annotation" value="" onChange={(e) => e.target.value && addAnnotation(e.target.value)} options={[{ value: '', label: '+ Add to chart…' }, ...TYPES.map((t) => ({ value: t.id, label: t.label }))]} />
            </>
          )}
        </Panel>

        {ann && (
          <Panel title="Selected annotation" actions={<IconButton icon="trash" title="Delete annotation" onClick={() => {
            patchExample((e) => ({ ...e, annotations: e.annotations.filter((a) => a.id !== annId) }));
            update((p) => ({ scenes: p.scenes.map((s) => (s.chart?.exampleId === ex.id ? { ...s, chart: { ...s.chart, reveal: (s.chart.reveal || []).filter((x) => x !== annId) } } : s)) }));
            setAnnId(null);
          }} />}>
            <Input label="Text" value={ann.text || ''} onChange={(e) => patchAnn({ text: e.target.value })} />
            <Select label="Style (color role)" value={ann.role || 'info'} onChange={(e) => patchAnn({ role: e.target.value, color: undefined })} options={ROLES} />
            <div className="row gap-s">
              <ColorInput label="Custom color" value={ann.color || '#ffffff'} onChange={(v) => patchAnn({ color: v })} />
              {ann.color && <Button size="sm" variant="ghost" onClick={() => patchAnn({ color: undefined })}>Use theme color</Button>}
            </div>
            <Slider label="Opacity" value={ann.opacity ?? 1} min={0.1} max={1} step={0.05} onChange={(v) => patchAnn({ opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
            {'dashed' in ann || ann.type === 'hline' ? <Toggle label="Dashed line" checked={!!ann.dashed} onChange={(v) => patchAnn({ dashed: v })} /> : null}
            {ann.i1 != null && <Slider label="Start candle" value={ann.i1} min={0} max={bars.length - 1} step={1} onChange={(v) => patchAnn({ i1: v })} format={(v) => formatBarTime(bars[v]?.t ?? 0, false)} />}
            {ann.i2 != null && <Slider label="End candle" value={ann.i2} min={0} max={bars.length - 1} step={1} onChange={(v) => patchAnn({ i2: v })} format={(v) => formatBarTime(bars[v]?.t ?? 0, false)} />}
            {ann.price != null && <Input label="Price" type="number" step="any" value={ann.price} onChange={(e) => patchAnn({ price: Number(e.target.value) })} />}
            {ann.p1 != null && <div className="grid-2">
              <Input label={ann.type === 'fib' || ann.type === 'trend' ? 'Start price' : 'Lower price'} type="number" step="any" value={ann.p1} onChange={(e) => patchAnn({ p1: Number(e.target.value) })} />
              <Input label={ann.type === 'fib' || ann.type === 'trend' ? 'End price' : 'Upper price'} type="number" step="any" value={ann.p2} onChange={(e) => patchAnn({ p2: Number(e.target.value) })} />
            </div>}
            {!ann.manual && <p className="small muted"><Icon name="alert" size={12} /> Detected from real prices. Moving it changes what the chart claims, so keep it on the actual candles.</p>}
          </Panel>
        )}


        <VideoStylePanel value={project.videoStyle} onChange={(patch) => update((p) => ({ videoStyle: { ...(p.videoStyle || {}), ...patch } }))} />
        <LayoutPanel project={project} scene={scene} update={update} />
        <LabelsPanel project={project} scene={scene} update={update} />

        <Panel title="Scene look">
          <Select label="Background" value={scene.bgStyle || 'terminal'} onChange={(e) => patchScene({ bgStyle: e.target.value })} options={BG} />
          <Select label="Transition into this scene" value={scene.transitionFx || 'none'} onChange={(e) => patchScene({ transitionFx: e.target.value })}
            options={[{ value: 'none', label: 'None' }, { value: 'fade', label: 'Fade' }, { value: 'slide', label: 'Slide' }, { value: 'flash', label: 'Flash' }]} />
          <Input label="Sound effect" value={scene.sfx || ''} onChange={(e) => patchScene({ sfx: e.target.value })} />
          <p className="small muted">Voice timing and caption text are edited in the Scenes, Voiceover and Captions tabs.</p>
        </Panel>
      </div>
    </div>
  );
}

function LayoutPanel({ project, scene, update }) {
  const [scope, setScope] = useState(scene.layout ? 'scene' : 'all');
  React.useEffect(() => setScope(scene.layout ? 'scene' : 'all'), [scene.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const L = { ...DEFAULT_LAYOUT, ...(project.layout || {}), ...(scope === 'scene' ? scene.layout || {} : {}) };
  const set = (patch) => {
    if (scope === 'all') update((p) => ({ layout: { ...DEFAULT_LAYOUT, ...(p.layout || {}), ...patch } }));
    else update((p) => ({ scenes: p.scenes.map((s) => (s.id === scene.id ? { ...s, layout: { ...L, ...patch } } : s)) }));
  };
  return (
    <Panel title="Content size & position">
      <div className="field"><span className="field-label">Apply to</span>
        <Chips options={[{ value: 'all', label: 'Whole video' }, { value: 'scene', label: 'This scene only' }]} value={scope} onChange={(v) => {
          setScope(v);
          if (v === 'all' && scene.layout) update((p) => ({ scenes: p.scenes.map((s) => (s.id === scene.id ? { ...s, layout: undefined } : s)) }));
        }} />
      </div>
      <Slider label="Chart size" value={L.size} min={40} max={106} step={1} onChange={(v) => set({ size: v })} format={(v) => `${v}%`} />
      <Slider label="Move left / right" value={L.x} min={-30} max={30} step={0.5} onChange={(v) => set({ x: v })} format={(v) => `${v > 0 ? '+' : ''}${v}%`} />
      <Slider label="Move up / down" value={L.y} min={-20} max={30} step={0.5} onChange={(v) => set({ y: v })} format={(v) => `${v > 0 ? '+' : ''}${v}%`} />
      <Button size="sm" variant="ghost" icon="refresh" onClick={() => set({ ...DEFAULT_LAYOUT })}>Reset size & position</Button>
      {scope === 'scene' && <p className="small muted">This scene overrides the whole-video layout. Switch back to “Whole video” to remove the override.</p>}
    </Panel>
  );
}

const LABEL_STYLES = [{ value: 'bar', label: 'Bar' }, { value: 'pill', label: 'Pill' }, { value: 'plain', label: 'Plain text' }];

function LabelsPanel({ project, scene, update }) {
  const labels = project.bottomLabels || [];
  const set = (id, patch) => update((p) => ({ bottomLabels: (p.bottomLabels || []).map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  const add = () => update((p) => ({ bottomLabels: [...(p.bottomLabels || []), { id: `bl_${Date.now().toString(36)}`, text: 'New label', style: 'bar', align: 'left', size: 28, color: '#ffffff', bg: 'rgba(0,0,0,.65)', accent: '#a855f7', scope: 'all', visible: true }] }));
  return (
    <Panel title="Bottom labels" subtitle="Text shown along the bottom of the video" actions={<Button size="sm" icon="plus" onClick={add}>Add label</Button>}>
      {!labels.length && <p className="small muted">No labels yet. Add one for your channel name, the instrument and date, or a risk disclaimer.</p>}
      {labels.map((l) => (
        <div key={l.id} className="label-row">
          <div className="row gap-s">
            <input className="input grow" value={l.text} onChange={(e) => set(l.id, { text: e.target.value })} aria-label="Label text" />
            <IconButton icon={l.visible === false ? 'eye' : 'x'} title={l.visible === false ? 'Show' : 'Hide'} onClick={() => set(l.id, { visible: l.visible === false })} />
            <IconButton icon="trash" title="Delete label" onClick={() => update((p) => ({ bottomLabels: p.bottomLabels.filter((x) => x.id !== l.id) }))} />
          </div>
          <div className="field"><span className="field-label">Style</span><Chips options={LABEL_STYLES} value={l.style || 'bar'} onChange={(v) => set(l.id, { style: v })} /></div>
          <div className="field"><span className="field-label">Position</span><Chips options={['left', 'center', 'right']} value={l.align || 'left'} onChange={(v) => set(l.id, { align: v })} /></div>
          <Slider label="Text size (px at 1080p)" value={l.size || 28} min={16} max={72} step={1} onChange={(v) => set(l.id, { size: v })} format={(v) => `${v}px`} />
          <div className="grid-2">
            <ColorInput label="Text color" value={l.color || '#ffffff'} onChange={(v) => set(l.id, { color: v })} />
            <ColorInput label="Accent" value={l.accent || '#a855f7'} onChange={(v) => set(l.id, { accent: v })} />
          </div>
          <Select label="Background" value={l.bg || 'rgba(0,0,0,.65)'} onChange={(e) => set(l.id, { bg: e.target.value })}
            options={[{ value: 'rgba(0,0,0,.65)', label: 'Dark' }, { value: 'rgba(255,255,255,.9)', label: 'Light' }, { value: 'rgba(168,85,247,.85)', label: 'Purple' }, { value: 'rgba(34,211,238,.85)', label: 'Cyan' }, { value: 'transparent', label: 'None' }]} />
          <Select label="Show" value={l.scope || 'all'} onChange={(e) => set(l.id, { scope: e.target.value, sceneId: e.target.value === 'scene' ? scene.id : l.sceneId, from: l.from ?? scene.start, to: l.to ?? scene.end })}
            options={[{ value: 'all', label: 'Whole video' }, { value: 'scene', label: 'Only in the selected scene' }, { value: 'range', label: 'Between two times' }]} />
          {l.scope === 'scene' && <p className="small muted">Shown in scene {Math.max(1, (project.scenes || []).findIndex((s) => s.id === l.sceneId) + 1)}. <button className="link small" onClick={() => set(l.id, { sceneId: scene.id })}>Move to this scene</button></p>}
          {l.scope === 'range' && <div className="grid-2">
            <Input label="From (seconds)" type="number" step="0.1" value={l.from ?? 0} onChange={(e) => set(l.id, { from: Number(e.target.value) })} />
            <Input label="To (seconds)" type="number" step="0.1" value={l.to ?? 10} onChange={(e) => set(l.id, { to: Number(e.target.value) })} />
          </div>}
        </div>
      ))}
    </Panel>
  );
}

// Shared by the video editor (per video) and Settings (defaults for new videos).
export function VideoStylePanel({ value = {}, onChange, title = 'Video style', defaults = false }) {
  const store = useStore();
  const look = videoStyle({ videoStyle: value }, defaults ? {} : store.settings);
  const vs = look.vs;
  return (
    <Panel title={title} subtitle={defaults ? 'Used by every video unless the video sets its own' : 'This video only'}>
      <div className="field"><span className="field-label">Theme</span>
        <Chips options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} value={vs.theme} onChange={(v) => onChange({ theme: v })} /></div>
      {vs.theme === 'light' && <div className="field"><span className="field-label">Look</span>
        <Chips options={[{ value: 'clean', label: 'Clean' }, { value: 'classic', label: 'Classic' }]} value={vs.look || 'clean'} onChange={(v) => onChange({ look: v })} />
        <span className="field-hint">{(vs.look || 'clean') === 'clean' ? 'White page, dashed grid, soft candles with dark outlines, pale zones with dashed edges, bold headline captions at the top, candles that build in.' : 'Original light look with labelled pills and the caption style from the Captions tab.'}</span></div>}
      {vs.theme === 'light' && (vs.look || 'clean') === 'clean' && <Toggle label="Bold headline captions at the top" hint="Off: use the caption style from the Captions tab" checked={vs.cleanCaptions !== false} onChange={(v) => onChange({ cleanCaptions: v })} />}
      <div className="field"><span className="field-label">Explanation style</span>
        <Chips options={[{ value: 'one', label: 'One idea at a time' }, { value: 'build', label: 'Build up everything' }]} value={vs.focusMode} onChange={(v) => onChange({ focusMode: v })} />
        <span className="field-hint">{vs.focusMode === 'one' ? 'Only the current step’s marks are shown in full; earlier marks fade into the background.' : 'Marks stay fully visible as the explanation builds.'}</span></div>
      <div className="field"><span className="field-label">Candle colors</span>
        <div className="candle-presets">
          {CANDLE_PRESETS.map((p) => (
            <button key={p.id} type="button" className={`candle-preset ${vs.candlePreset === p.id && !vs.bull && !vs.bear && !vs.bullWick && !vs.bearWick && !vs.bullBorder && !vs.bearBorder ? 'on' : ''}`} onClick={() => onChange({ candlePreset: p.id, bull: null, bear: null, bullWick: null, bearWick: null, bullBorder: null, bearBorder: null })}>
              <i style={{ background: p.bull, borderColor: p.outline ? '#111827' : p.bull }} /><i style={{ background: p.bear }} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="candle-colors">
        <span />
        <span className="field-label">Bullish</span>
        <span className="field-label">Bearish</span>
        <span className="field-label">Body</span>
        <CandleColor value={look.palette.bull} onChange={(v) => onChange({ bull: v })} />
        <CandleColor value={look.palette.bear} onChange={(v) => onChange({ bear: v })} />
        <span className="field-label">Wick</span>
        <CandleColor value={look.palette.bullWick} fallback={look.palette.bull} onChange={(v) => onChange({ bullWick: v })} />
        <CandleColor value={look.palette.bearWick} fallback={look.palette.bear} onChange={(v) => onChange({ bearWick: v })} />
        <span className="field-label">Border</span>
        <CandleColor value={look.palette.bullBorder} fallback={look.palette.bull} onChange={(v) => onChange({ bullBorder: v })} />
        <CandleColor value={look.palette.bearBorder} fallback={look.palette.bear} onChange={(v) => onChange({ bearBorder: v })} />
      </div>
      <span className="field-hint">Wick and border follow the body color until you change them. “Same as body” resets one.</span>
    </Panel>
  );
}

function CandleColor({ value, fallback, onChange }) {
  const shown = value || fallback || '#000000';
  const [draft, setDraft] = useState(value || '');
  const [bad, setBad] = useState(false);
  React.useEffect(() => { setDraft(value || ''); setBad(false); }, [value]);
  // Accepts #rgb or #rrggbb, with or without the "#".
  const commit = (raw) => {
    const t = raw.trim().replace(/^#?/, '#').toLowerCase();
    if (raw.trim() === '') { setBad(false); return; }
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(t)) {
      const full = t.length === 4 ? `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}` : t;
      setBad(false);
      onChange(full);
    } else setBad(true);
  };
  return (
    <div className="candle-color">
      <input type="color" value={shown} onChange={(e) => onChange(e.target.value)} aria-label="Pick color" />
      <input className={`input mono hex-input ${bad ? 'bad' : ''}`} value={draft} placeholder={value ? '' : fallback ? 'body' : '#000000'}
        onChange={(e) => { setDraft(e.target.value); const t = e.target.value.trim().replace(/^#?/, '#'); if (/^#([0-9a-f]{6})$/i.test(t)) { setBad(false); onChange(t.toLowerCase()); } }}
        onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(e.currentTarget.value)}
        aria-label="Color code" spellCheck={false} maxLength={7} title="Type a color code like #089981" />
      {value && fallback !== undefined && <button type="button" className="link small" onClick={() => onChange(null)}>Same as body</button>}
      {bad && <span className="small bad-text">Use a code like #089981</span>}
    </div>
  );
}
