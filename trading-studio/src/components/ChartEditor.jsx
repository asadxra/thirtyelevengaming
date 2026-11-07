import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Panel, Select, Slider, Toggle, Chips, Input, ColorInput, Badge, Empty, IconButton } from './ui.jsx';
import { Icon } from './Icon.jsx';
import Stage from './Stage.jsx';
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
