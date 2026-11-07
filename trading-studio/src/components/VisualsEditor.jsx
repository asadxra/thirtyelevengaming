import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Panel, Slider, ColorInput, IconButton, Empty, Modal, Select, Badge } from './ui.jsx';
import Stage from './Stage.jsx';
import VisualElement from './VisualElement.jsx';
import { VISUAL_TYPES, defaultVisualProps, SECTION_LABELS } from '../../shared/defaults.js';
import { fmtTime } from '../../shared/scenes.js';

export function VisualLibraryGrid({ onPick }) {
  return (
    <div className="vlib-grid">
      {VISUAL_TYPES.map((t) => (
        <button key={t.id} className="vlib-card" onClick={() => onPick?.(t.id)} type="button">
          <div className="vlib-preview"><VisualElement type={t.id} props={{ ...defaultVisualProps(t.id), x: 50, y: 50, scale: 1, opacity: 1 }} standalone /></div>
          <b>{t.label}</b>
          <span className="small muted">{t.story}</span>
        </button>
      ))}
    </div>
  );
}

export default function VisualsEditor({ project, update, character }) {
  const store = useStore();
  const scenes = project.scenes || [];
  const [sceneId, setSceneId] = useState(scenes[0]?.id);
  const [selId, setSelId] = useState(null);
  const [libOpen, setLibOpen] = useState(false);
  const scene = scenes.find((s) => s.id === sceneId) || scenes[0];
  const layers = (project.visuals || []).filter((v) => v.sceneId === scene?.id).sort((a, b) => (a.props.layer ?? 0) - (b.props.layer ?? 0));
  const sel = layers.find((l) => l.id === selId);
  const visualPresets = store.presets.filter((p) => p.kind === 'visual');

  const setVisuals = (fn) => update((p) => ({ visuals: fn(p.visuals || []) }));
  const setProps = (id, patch) => setVisuals((vs) => vs.map((v) => (v.id === id ? { ...v, props: { ...v.props, ...patch } } : v)));
  const addLayer = (type) => {
    const v = { id: `vis_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, sceneId: scene.id, type, props: { ...defaultVisualProps(type), layer: layers.length } };
    setVisuals((vs) => [...vs, v]);
    setSelId(v.id);
    setLibOpen(false);
  };
  const reorder = (id, dir) => {
    const ordered = [...layers];
    const i = ordered.findIndex((l) => l.id === id);
    const j = i + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    const layerOf = Object.fromEntries(ordered.map((l, k) => [l.id, k]));
    setVisuals((vs) => vs.map((v) => (v.id in layerOf ? { ...v, props: { ...v.props, layer: layerOf[v.id] } } : v)));
  };
  const applyPreset = (preset, all) => {
    const targets = all ? scenes : [scene];
    setVisuals((vs) => [
      ...vs.filter((v) => !targets.some((t) => t.id === v.sceneId)),
      ...targets.flatMap((t) => preset.data.map((d, k) => ({ id: `vis_${t.id}_${Date.now().toString(36)}_${k}`, sceneId: t.id, type: d.type, props: { ...d.props, layer: k } }))),
    ]);
    store.toast(`Applied “${preset.name}” to ${all ? 'all scenes' : 'this scene'}`, 'ok');
  };
  const copyToAll = () => {
    setVisuals((vs) => [
      ...vs.filter((v) => v.sceneId === scene.id),
      ...scenes.filter((s) => s.id !== scene.id).flatMap((s) => layers.map((l, k) => ({ ...l, id: `vis_${s.id}_${Date.now().toString(36)}_${k}`, sceneId: s.id }))),
    ]);
    store.toast('Copied this scene’s layers to every scene', 'ok');
  };

  if (!scenes.length) return <Panel><Empty icon="layers" title="No scenes yet">Build scenes first; visual layers are assigned per scene so code animations support the story beat.</Empty></Panel>;

  return (
    <div className="visuals-layout">
      <Panel title="Scenes" pad={false} className="vis-scenes">
        {scenes.map((s, i) => (
          <button key={s.id} className={`vis-scene ${s.id === scene.id ? 'on' : ''}`} onClick={() => { setSceneId(s.id); setSelId(null); }}>
            <span className="scene-num">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <Badge tone="accent">{SECTION_LABELS[s.section]}</Badge> <span className="mono small muted">{fmtTime(s.start)}</span>
              <p className="small clamp-2">{s.voiceover}</p>
              <span className="small muted">{(project.visuals || []).filter((v) => v.sceneId === s.id).length} layers</span>
            </div>
          </button>
        ))}
      </Panel>

      <div className="col gap">
        <Panel title={`Scene ${scenes.indexOf(scene) + 1} composition`} subtitle={scene.codeAnimation}>
          <div className="preview-wrap" onClick={() => setSelId(null)}>
            <Stage project={project} scene={scene} character={character} visuals={layers} selectedVisualId={selId} onSelectVisual={setSelId} showCaptions={false} />
          </div>
          <p className="small muted">Click a layer in the preview to select it. Character placement adapts to the {project.format === 'shorts' ? '9:16 Shorts' : '16:9 Landscape'} format.</p>
        </Panel>
      </div>

      <div className="col gap">
        <Panel title="Layers" actions={<Button size="sm" variant="primary" icon="plus" onClick={() => setLibOpen(true)}>Add element</Button>}>
          {layers.length ? (
            <div className="layer-list">
              {[...layers].reverse().map((l) => (
                <div key={l.id} className={`layer-row ${l.id === selId ? 'on' : ''}`} onClick={() => setSelId(l.id)}>
                  <i className="layer-swatch" style={{ background: l.props.color }} />
                  <span className="grow">{VISUAL_TYPES.find((t) => t.id === l.type)?.label}</span>
                  <IconButton icon="up" title="Bring forward" onClick={(e) => { e.stopPropagation(); reorder(l.id, 1); }} />
                  <IconButton icon="down" title="Send backward" onClick={(e) => { e.stopPropagation(); reorder(l.id, -1); }} />
                  <IconButton icon="trash" title="Remove layer" onClick={(e) => { e.stopPropagation(); setVisuals((vs) => vs.filter((v) => v.id !== l.id)); }} />
                </div>
              ))}
            </div>
          ) : <p className="muted small">No visual layers in this scene.</p>}
          <div className="row gap-s wrap">
            <Select value="" onChange={(e) => { const [id, scope] = e.target.value.split('|'); const p = visualPresets.find((x) => x.id === id); if (p) applyPreset(p, scope === 'all'); }}
              options={[{ value: '', label: 'Apply visual preset…' }, ...visualPresets.flatMap((p) => [{ value: `${p.id}|one`, label: `${p.name} → this scene` }, { value: `${p.id}|all`, label: `${p.name} → all scenes` }])]} />
            <Button size="sm" variant="ghost" disabled={!layers.length} onClick={async () => {
              const name = window.prompt('Preset name', 'My scene look');
              if (!name) return;
              try { await store.createDoc('presets', { kind: 'visual', name, data: layers.map((l) => ({ type: l.type, props: l.props })) }); store.toast('Visual preset saved', 'ok'); } catch (e) { store.toast(e.message, 'bad'); }
            }}>Save as preset</Button>
            <Button size="sm" variant="ghost" disabled={!layers.length} onClick={copyToAll}>Copy to all scenes</Button>
          </div>
        </Panel>

        {sel && (
          <Panel title={VISUAL_TYPES.find((t) => t.id === sel.type)?.label} subtitle={VISUAL_TYPES.find((t) => t.id === sel.type)?.story}>
            <ColorInput label="Color" value={sel.props.color} onChange={(v) => setProps(sel.id, { color: v })} />
            <Slider label="Animation speed" value={sel.props.speed} min={0.2} max={3} step={0.05} onChange={(v) => setProps(sel.id, { speed: v })} format={(v) => `${v.toFixed(2)}×`} />
            <Slider label="Opacity" value={sel.props.opacity} onChange={(v) => setProps(sel.id, { opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Blur" value={sel.props.blur} min={0} max={40} step={0.5} onChange={(v) => setProps(sel.id, { blur: v })} format={(v) => `${v}px`} />
            <Slider label="Glow" value={sel.props.glow} min={0} max={2} step={0.05} onChange={(v) => setProps(sel.id, { glow: v })} format={(v) => v.toFixed(2)} />
            <div className="grid-2">
              <Slider label="Position X" value={sel.props.x} min={0} max={100} step={1} onChange={(v) => setProps(sel.id, { x: v })} format={(v) => `${v}%`} />
              <Slider label="Position Y" value={sel.props.y} min={0} max={100} step={1} onChange={(v) => setProps(sel.id, { y: v })} format={(v) => `${v}%`} />
            </div>
            <Slider label="Scale" value={sel.props.scale} min={0.3} max={3} step={0.05} onChange={(v) => setProps(sel.id, { scale: v })} format={(v) => `${v.toFixed(2)}×`} />
            <Slider label="Duration on screen" value={sel.props.duration} min={0.5} max={30} step={0.5} onChange={(v) => setProps(sel.id, { duration: v })} format={(v) => `${v}s`} />
            <Slider label="Layer order" value={sel.props.layer} min={0} max={10} step={1} onChange={(v) => setProps(sel.id, { layer: v })} format={(v) => `#${v}`} />
          </Panel>
        )}
      </div>

      <Modal open={libOpen} title="Code animation & visual library" onClose={() => setLibOpen(false)} width={980}>
        <p className="small muted">Each element is a storytelling device — pick the one that supports this scene’s beat: <em>{scene.codeAnimation}</em></p>
        <VisualLibraryGrid onPick={addLayer} />
      </Modal>
    </div>
  );
}
