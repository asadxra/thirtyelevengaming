import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Panel, Input, TextArea, Select, Badge, IconButton, Confirm, Empty, Menu } from './ui.jsx';
import { Icon } from './Icon.jsx';
import TimelinePlayer from './TimelinePlayer.jsx';
import { buildScenes, retime, blankScene, fmtTime, parseTime, totalDuration, hashText, scriptToText, sectionSuggestions } from '../../shared/scenes.js';
import { SECTIONS, SECTION_LABELS, ANIMATIONS, EXPRESSIONS, defaultVisualProps } from '../../shared/defaults.js';
import { clipState } from '../lib/status.js';

// Rebuild scenes from script while carrying over voice clips whose text is unchanged.
export function rebuildScenesFromScript(project) {
  const fresh = buildScenes(project.script.sections, { speed: project.voice?.settings?.speed || 1 });
  const oldByHash = {};
  for (const s of project.scenes || []) {
    const clip = project.voice?.clips?.[s.id];
    if (clip) oldByHash[hashText(s.voiceover)] = { clip, scene: s };
  }
  const clips = {};
  const scenes = fresh.map((s) => {
    const prev = oldByHash[hashText(s.voiceover)];
    if (prev) {
      clips[s.id] = prev.clip;
      // keep the user's creative direction for unchanged lines
      const { id, start, end, voiceover, caption, ...direction } = prev.scene;
      return { ...s, ...direction };
    }
    return s;
  });
  const visuals = scenes.flatMap((s) => (s.visualTypes || []).map((type, j) => ({ id: `vis_${s.id}_${j}`, sceneId: s.id, type, props: defaultVisualProps(type) })));
  return { scenes, clips, visuals, scenesSourceHash: hashText(scriptToText(project.script.sections)) };
}

export default function SceneBuilder({ project, update, character }) {
  const store = useStore();
  const scenes = project.scenes || [];
  const [open, setOpen] = useState(() => new Set(scenes.slice(0, 1).map((s) => s.id)));
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewAt, setPreviewAt] = useState(0);
  const [drag, setDrag] = useState(null);
  const scriptHash = hashText(scriptToText(project.script.sections));
  const outOfSync = scenes.length > 0 && project.scenesSourceHash && project.scenesSourceHash !== scriptHash;
  const hasScript = SECTIONS.some((s) => (project.script.sections[s] || '').trim());

  const setScenes = (fn) => update((p) => ({ scenes: typeof fn === 'function' ? fn(p.scenes || []) : fn }));
  const patchScene = (id, patch) => setScenes((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const toggle = (id) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const build = () => {
    const out = rebuildScenesFromScript(project);
    const keptVisuals = (project.visuals || []).filter((v) => out.scenes.some((s) => s.id === v.sceneId));
    update({ scenes: out.scenes, voice: { ...project.voice, clips: out.clips }, visuals: keptVisuals.length ? keptVisuals : out.visuals, scenesSourceHash: out.scenesSourceHash });
    setOpen(new Set(out.scenes.slice(0, 1).map((s) => s.id)));
    setConfirm(false);
    const kept = Object.keys(out.clips).length;
    store.toast(`Built ${out.scenes.length} scenes${kept ? ` · kept ${kept} unchanged voice clip(s)` : ''}`, 'ok');
  };

  const move = (from, to) => {
    if (to < 0 || to >= scenes.length || from === to) return;
    setScenes((list) => {
      const next = [...list];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return retime(next);
    });
  };

  const addScene = (afterIdx = scenes.length - 1) => {
    const prev = scenes[afterIdx];
    const section = prev?.section || 'story';
    const s = blankScene(section, { start: prev ? prev.end : 0, end: (prev ? prev.end : 0) + 4 });
    setScenes((list) => { const next = [...list]; next.splice(afterIdx + 1, 0, s); return retime(next); });
    setOpen((o) => new Set(o).add(s.id));
  };

  const duplicateScene = (idx) => {
    const s = { ...scenes[idx], id: blankScene().id };
    setScenes((list) => { const next = [...list]; next.splice(idx + 1, 0, s); return retime(next); });
  };

  const removeScene = (id) => {
    update((p) => {
      const clips = { ...(p.voice?.clips || {}) };
      delete clips[id];
      return { scenes: retime((p.scenes || []).filter((s) => s.id !== id)), visuals: (p.visuals || []).filter((v) => v.sceneId !== id), voice: { ...p.voice, clips } };
    });
  };

  const setTime = (s, key, raw) => {
    const v = parseTime(raw);
    if (!Number.isFinite(v) || v < 0) return store.toast('Use seconds (e.g. 12.5) or mm:ss.s (e.g. 00:12.5)', 'warn');
    const patch = { [key]: +v.toFixed(2) };
    if (key === 'start' && v >= s.end) patch.end = +(v + 1).toFixed(2);
    if (key === 'end' && v <= s.start) return store.toast('End must be after start', 'warn');
    patchScene(s.id, patch);
  };

  const overlaps = scenes.some((s, i) => i > 0 && s.start < scenes[i - 1].end - 0.01);

  if (!scenes.length) {
    return (
      <Panel title="Scene builder">
        <Empty icon="film" title="No scenes yet" action={<div className="row gap-s"><Button variant="primary" icon="sparkles" disabled={!hasScript} onClick={build}>Build scenes from script</Button><Button icon="plus" onClick={() => addScene(-1)}>Add blank scene</Button></div>}>
          {hasScript ? 'Split the script into timed scenes with suggested visuals, camera moves and sound design.' : 'Write or generate a script first, then build scenes from it.'}
        </Empty>
      </Panel>
    );
  }

  return (
    <div className="col gap">
      <Panel pad={false}>
        <div className="scene-toolbar">
          <div className="row gap-s wrap">
            <b>{scenes.length} scenes</b>
            <span className="muted small">Total {fmtTime(totalDuration(scenes))}</span>
            {outOfSync && <Badge tone="warn" dot>Script changed since scenes were built</Badge>}
            {overlaps && <Badge tone="bad" dot>Overlapping timestamps</Badge>}
          </div>
          <div className="row gap-s wrap">
            <Button size="sm" icon="play" onClick={() => { setPreviewAt(0); setPreview((p) => !p); }}>{preview ? 'Hide preview' : 'Preview timeline'}</Button>
            <Button size="sm" icon="clock" onClick={() => setScenes(retime)} title="Make scenes sequential without gaps, keeping each duration">Retime sequentially</Button>
            <Button size="sm" icon="refresh" disabled={!hasScript} onClick={() => setConfirm(true)}>Rebuild from script</Button>
            <Button size="sm" variant="primary" icon="plus" onClick={() => addScene()}>Add scene</Button>
          </div>
        </div>
        <div className="timeline-strip">
          {scenes.map((s, i) => (
            <button key={s.id} className={`strip-seg sec-${s.section}`} style={{ flexGrow: Math.max(0.3, s.end - s.start) }} onClick={() => { setOpen((o) => new Set(o).add(s.id)); document.getElementById(`scene-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
              <span>{i + 1}</span><em>{SECTION_LABELS[s.section]}</em>
            </button>
          ))}
        </div>
      </Panel>

      {preview && (
        <Panel title="Timeline preview" subtitle="Composition, character poses, captions and any generated voice clips">
          <div className="preview-wrap"><TimelinePlayer project={project} character={character} startAt={previewAt} /></div>
        </Panel>
      )}

      {scenes.map((s, idx) => {
        const isOpen = open.has(s.id);
        const cs = clipState(project, s);
        return (
          <article key={s.id} id={`scene-${s.id}`} className={`scene-card panel sec-${s.section} ${drag === idx ? 'dragging' : ''}`}
            draggable onDragStart={(e) => { setDrag(idx); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDrag(null)}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (drag != null) move(drag, idx); setDrag(null); }}>
            <header className="scene-head" onClick={() => toggle(s.id)}>
              <span className="grip" title="Drag to reorder"><Icon name="grip" size={16} /></span>
              <span className="scene-num">{String(idx + 1).padStart(2, '0')}</span>
              <span className="mono small">{fmtTime(s.start)}–{fmtTime(s.end)}</span>
              <Badge tone="accent">{SECTION_LABELS[s.section]}</Badge>
              <span className="scene-vo">{s.voiceover || <em className="muted">No voiceover</em>}</span>
              <Badge tone={{ ready: 'ok', sample: 'muted', stale: 'bad', missing: 'muted' }[cs]}>{{ ready: 'Voice ✓', sample: 'Voice (sample)', stale: 'Voice outdated', missing: 'No voice' }[cs]}</Badge>
              <div className="row gap-xs" onClick={(e) => e.stopPropagation()}>
                <IconButton icon="up" title="Move up" onClick={() => move(idx, idx - 1)} disabled={idx === 0} />
                <IconButton icon="down" title="Move down" onClick={() => move(idx, idx + 1)} disabled={idx === scenes.length - 1} />
                <Menu items={[
                  { label: 'Preview from here', icon: 'play', onClick: () => { setPreviewAt(s.start); setPreview(true); } },
                  { label: 'Add scene after', icon: 'plus', onClick: () => addScene(idx) },
                  { label: 'Duplicate scene', icon: 'copy', onClick: () => duplicateScene(idx) },
                  { label: 'Reset direction to suggestions', icon: 'refresh', onClick: () => { const sug = sectionSuggestions(s.section); patchScene(s.id, { characterAction: sug.action, pose: sug.pose, environment: sug.environment, animation: sug.animation, camera: sug.camera, background: sug.background, codeAnimation: sug.code, sfx: sug.sfx }); } },
                  { label: 'Delete scene', icon: 'trash', danger: true, onClick: () => removeScene(s.id) },
                ]} />
                <IconButton icon={isOpen ? 'up' : 'down'} title={isOpen ? 'Collapse' : 'Expand'} onClick={() => toggle(s.id)} />
              </div>
            </header>
            {isOpen && (
              <div className="scene-body">
                <div className="scene-times">
                  <TimeField label="Start" value={s.start} onCommit={(v) => setTime(s, 'start', v)} />
                  <TimeField label="End" value={s.end} onCommit={(v) => setTime(s, 'end', v)} />
                  <Select label="Section" value={s.section} onChange={(e) => patchScene(s.id, { section: e.target.value })} options={SECTIONS.map((x) => ({ value: x, label: SECTION_LABELS[x] }))} />
                  <Select label="Character pose / animation" value={s.pose} onChange={(e) => patchScene(s.id, { pose: e.target.value })} options={ANIMATIONS.map((a) => ({ value: a.id, label: a.label }))} />
                  <Select label="Expression" value={s.expression} onChange={(e) => patchScene(s.id, { expression: e.target.value })} options={EXPRESSIONS} />
                </div>
                <TextArea label="Voiceover" autoGrow rows={2} value={s.voiceover} onChange={(e) => patchScene(s.id, { voiceover: e.target.value })}
                  hint={cs === 'stale' ? 'Voiceover text changed — regenerate this scene in Voice Studio.' : undefined} />
                <div className="grid-2">
                  <TextArea label="Character action" rows={2} value={s.characterAction} onChange={(e) => patchScene(s.id, { characterAction: e.target.value })} />
                  <TextArea label="Environment" rows={2} value={s.environment} onChange={(e) => patchScene(s.id, { environment: e.target.value })} />
                  <TextArea label="Animation" rows={2} value={s.animation} onChange={(e) => patchScene(s.id, { animation: e.target.value })} />
                  <TextArea label="Camera movement" rows={2} value={s.camera} onChange={(e) => patchScene(s.id, { camera: e.target.value })} />
                  <TextArea label="Background visual" rows={2} value={s.background} onChange={(e) => patchScene(s.id, { background: e.target.value })} />
                  <TextArea label="Code animation instructions" rows={2} value={s.codeAnimation} onChange={(e) => patchScene(s.id, { codeAnimation: e.target.value })} />
                  <TextArea label="Sound effect suggestions" rows={2} value={s.sfx} onChange={(e) => patchScene(s.id, { sfx: e.target.value })} />
                  <TextArea label="Caption text" rows={2} value={s.caption} onChange={(e) => patchScene(s.id, { caption: e.target.value })} hint="Source text for auto-captions. Caption edits in the Captions tab never change the script." />
                </div>
              </div>
            )}
          </article>
        );
      })}

      <Confirm open={confirm} title="Rebuild scenes from script" confirmLabel="Rebuild scenes" onConfirm={build} onClose={() => setConfirm(false)}
        message="Scenes will be re-split from the current script with fresh timestamps. Scenes whose voiceover text is unchanged keep their creative direction and generated voice clip; changed lines get new suggestions." />
    </div>
  );
}

function TimeField({ label, value, onCommit }) {
  const [v, setV] = useState(fmtTime(value));
  React.useEffect(() => setV(fmtTime(value)), [value]);
  return (
    <Input label={label} className="time-field mono" value={v} onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  );
}
